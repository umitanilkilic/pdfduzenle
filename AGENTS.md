# AGENTS.md

Guidance for AI agents working in this repository.

## What this is

pdfduzenle.tr – a Turkish-first (TR + EN) online PDF toolkit, written from scratch and open source under
AGPL-3.0-or-later (`LICENSE`). (It started as a Stirling-PDF fork; none of that code or history remains.)

## Layout

| Path | Stack | Role |
| --- | --- | --- |
| `web/` | Next.js 16 (App Router, Turbopack), React 19, Tailwind v4, TypeScript | SEO site + all browser-side tools |
| `services/gateway/` | Go 1.27, stdlib `net/http` | Public `/api/*`: uploads, jobs, rate limits, CLI tools (Ghostscript, qpdf, LibreOffice) |
| `services/ocr/` | Python 3.14, FastAPI, uv | Internal only: OCRmyPDF/Tesseract, Unlimited-OCR (Unlimited-OCR via vLLM) |
| `compose.yaml` | Docker Compose | web + gateway + ocr; `web` joins the external `webnet` network of the reverse proxy |

Next.js rewrites `/api/*` to the gateway (`GATEWAY_URL`, resolved at build time). The OCR service is never
exposed publicly; only the gateway calls it.

## Engineering rules (mandatory)

These apply to every change in every service. A change is not done until they hold.

- **Tests are part of the change.** Every new feature, bug fix or refactor ships with tests in the same
  commit. Bug fixes start with a failing test that reproduces the bug. Never delete, skip or weaken a test
  to get green.
  - web: Vitest unit tests next to the code (`*.test.ts`); Playwright e2e for tool flows.
  - gateway: table-driven `go test`, `httptest` for handlers.
  - ocr: pytest with FastAPI `TestClient`.
- **SOLID.** One responsibility per module/type; extend through interfaces instead of editing callers
  (e.g. a new OCR engine implements `OcrEngine`, a new PDF tool implements the tool interface); depend on
  abstractions, keep interfaces small and defined by the consumer.
- **Dependency injection.** Dependencies (config, logger, clock, storage, HTTP clients, CLI runners) are
  passed in through constructors or function parameters, never reached through globals or created deep
  inside logic. This keeps code testable with fakes.
  - Go: constructor injection (`New(cfg, log, runner)`), no package-level mutable state.
  - Python: FastAPI `Depends` / constructor arguments; engines receive their clients.
  - web: pure functions for logic; React components receive data through props; side effects (workers,
    IndexedDB, fetch) live behind small modules that can be replaced in tests.
- **DRY, but not prematurely.** A fact lives in one place (the tool registry, dictionaries, shared
  helpers). Extract when the second real duplicate appears; do not build abstractions for hypothetical use.
- **KISS / YAGNI.** The simplest design that meets the current requirement; no speculative options.
- **Clean architecture boundaries.** Transport (HTTP handlers, React components) → application logic →
  infrastructure (CLI tools, storage, external APIs). Logic never imports transport code.
- **Errors** are handled explicitly and returned with context (`fmt.Errorf("...: %w", err)` in Go, typed
  exceptions mapped to HTTP errors in Python, user-facing i18n messages in web). No silent catches.
- **Security by default:** validate every input (size, type, page count), never trust file names, run CLI
  tools with argument arrays (no shell), time-limit external processes, delete temp files.
- **Standard tooling must pass before every commit:** formatters, linters, type checks and tests of the
  services you touched (see Commands).

## Commands

- web: `cd web && npm run dev` · `npm run lint` · `npm run typecheck` · `npm test` · `npm run build` · `npm run format`
- web e2e: `npm run build:e2e && npm run test:e2e` (`build:e2e` bakes in test analytics IDs; starts `next start` on
  port 3100; set `PW_CHROMIUM_PATH` to use a preinstalled Chromium instead of `npx playwright install`)
- gateway: `cd services/gateway && gofmt -l . && go vet ./... && go test ./...`
- ocr: `cd services/ocr && uv run pytest && uv run ruff check .`
- everything: `docker compose up --build`
- CI (`.github/workflows/ci.yml`) runs all of the above plus `govulncheck`, `npm audit`, `pip-audit` and the
  full Playwright suite; Dependabot keeps npm, Go, uv, Docker and Actions dependencies current.

## web/ conventions

- Next.js 16 differs from older versions: read `web/node_modules/next/dist/docs/` before using an API
  (e.g. `middleware` is now `proxy`, request APIs are async).
- **Routing:** Turkish lives at the root and English under `/en` via two route groups with their own root
  layouts: `src/app/(tr)/…` and `src/app/(en)/en/…`. Route files are thin wrappers; the real pages are in
  `src/views/` and take a `locale`. Unknown URLs render `src/app/global-not-found.tsx`.
- **Single source of truth for tools:** `src/tools/registry.ts` (id, localized slugs, category, runtime,
  accepted files, next-step suggestions). Menus, the home grid, sitemap, related tools and chaining are
  derived from it. Tool copy (titles, meta descriptions, steps, FAQ) is in `src/tools/content/{tr,en}.ts`.
- UI strings are in `src/i18n/dictionaries/{tr,en}.ts`; `en` is typed against `tr`, so a missing key is a
  type error. Write Turkish copy first.
- Locales are listed once in `src/i18n/config.ts`; everything per-locale is a `Record<Locale, …>` (build it
  with `perLocale()`), so adding a locale is data + one route group, and the compiler lists what is missing.
  Never branch on `"tr"`/`"en"` in code or tests (use `defaultLocale`, `locales`). Steps: README "Adding a language".
- SEO: every page gets canonical + hreflang (`src/lib/seo.ts`), JSON-LD, and a static Open Graph image
  (`src/lib/og.tsx`). All pages must stay statically generated.
- `/llms.txt` (`src/lib/llms.ts`) is generated from the registry, tool content and `pages.ts`, like the sitemap;
  new tools and pages appear there automatically.
- Theme colors are CSS variables in `src/app/globals.css`; dark mode uses `data-theme="dark"` on `<html>`.
- Browser tools must not upload files. Anything heavy (pdf.js, pdf-lib) is loaded lazily on the tool page.

### Tool implementations (`web/src/pdf`, `web/src/tools/impl`, `web/src/components/tool`)

- `src/pdf/ops/*` – pure pdf-lib operations (`Uint8Array` in → out), unit-tested in Node. Errors are
  `PdfToolError` with a code that maps to `dict.errors.*`. Drawing on rotated pages goes through
  `src/pdf/geometry.ts` (visual → page coordinates).
- `src/pdf/engine.ts` – the `PdfEngine` facade. The browser uses `createWorkerEngine()` (Web Worker RPC,
  `worker.ts`/`client.ts`); tests use `createInlineEngine()`. Inject it via `ToolRuntimeProvider`.
- `src/pdf/render.ts` – pdf.js for previews and PDF → image. Use the **legacy** build: the modern build
  needs very new JS APIs (e.g. `Map#getOrInsertComputed`) and breaks in many browsers.
- A tool is a `ToolImpl<Options>` (`src/tools/impl/shared/types.ts`): `initialOptions`, optional `Main`/`Options`
  views, optional `validate()` and a `run()` that receives its services (engine, gateway, font, dict).
  `ToolShell` owns file selection, progress, errors and results. Without a `Main` view one PDF shows all its
  pages (`SingleFileView`: `FileBar` + read-only `PageGrid`, falling back to the list row when pdf.js can't
  open it, e.g. encrypted); several files use `FileList`, which shows a first-page
  thumbnail per file (`useFileThumbnail`, a few PDFs at a time); single-file tools with a `Main` preview get a
  `FileBar` (name, size, remove) above it. Live previews (crop, page numbers, watermark) draw an overlay on
  `PageImage` in PDF-point percentages (`usePageSize`) and share their option mapping with `run()`. Register tools in `src/tools/impl/index.ts`
  (code-split loaders).
- Server tools use `createServerTool()` (`src/tools/impl/shared/server.tsx`): upload → poll → download → delete via
  the `GatewayClient` (`src/api/gateway.ts`). Gateway error codes map to `dict.errors.*` like `PdfToolError`.
- `next.config.ts` raises `proxyClientMaxBodySize` so uploads through the `/api` rewrite are not cut at 10 MB.
- Text drawn into PDFs uses the embedded fonts in `public/fonts` (Inter regular/bold/italic, JetBrains Mono; OFL,
  licenses next to them) so Turkish characters work. `src/pdf/fonts.ts` maps faces to files; tools get them with
  `loadFont(face)`. Always embed through `embedFont()` (`src/pdf/embed.ts`).
- Markdown → PDF: `src/pdf/markdown/parse.ts` (marked → blocks; raw HTML dropped, images become alt text, only
  http(s)/mailto links) → `layout.ts` (pure page layout into draw ops, measured through a `Metrics` interface) →
  `ops/markdown.ts` (fontkit metrics, embeds only the faces used, link annotations). Style: palette in
  `COLORS`, rounded rects via SVG paths, shapes for bullets (no glyph needed), backgrounds split per page
  (`withBackground`), page numbers and running title on multi-page documents. Main-thread code must not
  import `marked` or `src/pdf/markdown/*` (ESLint).
- `src/tools/impl/` holds one file per tool (named by tool id); helpers shared by several tools live in
  `src/tools/impl/shared/`. Keep that split when adding tools.

### Analytics and consent (`web/src/lib/analytics`, `web/src/components/analytics`)

- Everything is off unless `NEXT_PUBLIC_GA_ID` / `NEXT_PUBLIC_CLARITY_ID` are set at build time (validated in
  `config.ts`, since they end up in inline scripts). The CSP (`src/lib/csp.ts`) adds only the hosts of the
  configured services.
- GA uses Consent Mode v2: `gtagInitScript()` sets the defaults (analytics from the saved choice, ads always
  denied) before gtag.js; `ConsentBanner` updates it. Clarity is loaded only after consent; revoking expires
  the cookies and reloads. The choice is `localStorage["analytics-consent"]`.
- Product events go through `useAnalytics()` (`createAnalytics`, fake it in tests). Only tool IDs, error codes
  and counts: never file names, contents or typed text. Wrap UI that shows file names or document content in
  `data-clarity-mask="true"` (the tool area and history drawer already are).
- Fixed pages (privacy) have per-locale paths in `src/lib/pages.ts`; the sitemap and language switcher use it.
- e2e specs import `test` from `e2e/base.ts`: it stubs the analytics hosts and pre-answers the consent banner.

### Workspace: recent files and tool chaining (`web/src/workspace`)

- Every tool result is kept in IndexedDB on the visitor's device for 24 hours (`store.ts`, never uploaded).
  `WorkspaceProvider` (in the root layout) injects the store; tests use `createMemoryStore()` or
  `fake-indexeddb`.
- "Continue with another tool" and the recent-files drawer link to `/<tool>?files=<id,id>`
  (`handoff.ts`); `ToolShell` loads those files, drops types the tool can't accept and removes the query.

## Checklist and pitfalls (read before finishing any change)

**Before finishing a phase / large change**
- Review the project structure: new files sit in the right layer and folder (e.g. tool helpers in
  `tools/impl/shared`, pure logic in `lib`/`pdf`/`workspace`, no logic in route files), names are
  consistent, no dead code or leftover debug files, `git status` shows nothing unexpected and no new file is
  swallowed by a `.gitignore`.
- Update this file when structure, commands or conventions change.
- Run everything, not only unit tests: `npm run build:e2e` then the full Playwright suite (it starts the gateway
  and OCR service); `go test -race ./...`; `uv run pytest`.
- UI changes: check screenshots on desktop and a 390 px phone, light and dark.
- No hard-coded user-facing strings; Turkish copy first, English typed against it.

**Lessons learned (each caused a real bug here)**
- pdf.js: use the legacy build (`pdfjs-dist/legacy/...`); the modern one crashes on browsers without
  `Map#getOrInsertComputed`.
- pdf.js shares one worker port: opening a document while another is still being destroyed fails ("the worker
  is being destroyed"), which surfaced as random "unexpected error" previews when options changed quickly.
  `render.ts` tracks destroys (`teardown.ts`) and waits for them before opening; always destroy through
  `RenderedDocument.destroy()`.
- Next.js cuts request bodies going through the `/api` rewrite at 10 MB unless `proxyClientMaxBodySize`
  is raised. Keep it in sync with `GATEWAY_MAX_UPLOAD_MB`.
- Locale routing via `proxy`/rewrites broke client prefetches (404s); use route groups instead.
- An element with `backdrop-filter` (the sticky header) becomes the containing block for `position: fixed`
  children: render overlays/drawers with `createPortal(…, document.body)`.
- `next/font` adds a local "… Fallback" face; `document.fonts.load()` rejects on it, so load only the first
  family name.
- Rate limiting: take the client IP as the N-th `X-Forwarded-For` entry from the right
  (`GATEWAY_TRUSTED_PROXY_HOPS`); the left-most entry is client-controlled. Next.js' `/api` rewrite passes
  the header through without adding itself (measured), so the value is 1 behind one reverse proxy. Never
  publish web/gateway ports publicly: a direct client could forge the header.
- Hostile documents (all verified with real tools here): HTML saved as `.doc` made LibreOffice fetch linked
  URLs (SSRF) → every job gets a LibreOffice profile with a dead proxy and macros disabled
  (`tools/office_profile.go`, integration test). PostScript renamed to `.pdf` ran in Ghostscript → uploads
  must start with a PDF header, `%!`/EPS prefixes are rejected. The gateway container has no internet
  route (`backend` network is `internal`). Keep these tests when touching conversions.
- LibreOffice needs the `-nogui` Writer/Calc/Impress/Draw packages, and `soffice` exits 0 even when it fails:
  always check that the output file exists.
- Never put passwords in process arguments (visible in `ps`); use 0600 files in the job directory.
- React 19 lint rules: no synchronous `setState` in effects, no impure calls (`Date.now()`) during render,
  no ref reads during render.
- Playwright: links such as tool names appear in several places (menu, footer, related tools); scope
  locators to a container (`getByTestId("result")`) instead of the whole page.
- Main-thread code must not value-import `pdf-lib` or `src/pdf/ops/*` (ESLint enforces it): the bundler then
  put pdf-lib (~400 KB) into every page's prefetched chunks. Keep the `new Worker(new URL(…))` expression in
  a lazily imported module (`pdf/worker-factory.ts`) for the same reason.
- `next/font` preloads a font on every page that prefetches a route using it; fonts needed only inside a tool
  (e.g. the signature font) use `preload: false`.
- External tools spawn helpers (soffice → oosplash → soffice.bin). The runner kills the whole process group
  on timeout; otherwise orphans keep running and hold the output pipe, so the timeout never returns.
- Jobs count against the queue limit only after their upload finished (`uploading` state), so slow uploads
  can't block the queue.
- The CSP (`next.config.ts`) is production-only and allows inline scripts (static pages can't use nonces);
  `e2e/layout.spec.ts` fails on any CSP violation.
- `@pdf-lib/fontkit`'s font subsetting wrote corrupt glyphs for Inter: page numbers and watermarks were
  blank in every viewer while text extraction still "saw" them. PDFs therefore embed the whole
  `public/fonts/Inter-400.ttf`, which is pre-reduced with fonttools (Latin, Turkish, Greek, Cyrillic,
  punctuation, currency; `pyftsubset <original Inter> --unicodes="U+0020-007E,U+00A0-024F,U+0259,U+02BB-02BC,U+02C6,U+02DA,U+02DC,U+0300-036F,U+0370-03FF,U+0400-04FF,U+1E00-1EFF,U+2000-206F,U+20A0-20CF,U+2100-214F,U+2190-2199,U+2212,U+FB01-FB02" --no-hinting`).
  `drawnGlyphOutlines()` (`src/pdf/testing.ts`) checks that drawn text really has outlines; use it for any new
  text-drawing operation. New faces are reduced the same way.
- pdf-lib writes PDF widths only for glyphs reachable from the font's character map, but encodes text after
  OpenType substitutions (Inter's case/contextual alternates): "(GPU)" rendered as "( GPU)". `embedFont()` and
  the Markdown metrics turn substitutions off (`TEXT_FEATURES`); `src/pdf/embed.test.ts` guards it.
- Unlimited-OCR's output format (`<|det|>` blocks, 0–999 coordinates) is an assumption from the README;
  verify `services/ocr/app/unlimited/parse.py` against the real endpoint before relying on it.

## services/gateway conventions

- Layers: `httpapi` (transport, defines the small `JobManager`/`Limiter` interfaces it needs) → `jobs`
  (queue, per-pool concurrency, TTL cleanup) → `tools` (one `Tool` per operation) → `runner` (process
  execution). `cmd/gateway/main.go` is the only place that wires concrete types together.
- API: `POST /api/tools/{id}` (multipart `files` + option fields) → `202 {id}`; `GET /api/jobs/{id}`;
  `GET /api/jobs/{id}/files/{n}`; `DELETE /api/jobs/{id}`. Errors are `{"error": code}`.
- External programs run through `runner.Runner` with argument arrays and per-tool timeouts; secrets
  (passwords) go through 0600 files in the job directory, never argv. Uploaded file names are never used
  on disk.
- Tool tests: unit tests use a fake runner; `integration_test.go` runs the real qpdf/gs/LibreOffice and
  skips when they are missing. Server tools e2e (`web/e2e/server-tools.spec.ts`) start the gateway too.
- Runtime needs `ghostscript`, `qpdf` and the LibreOffice `-nogui` Writer/Calc/Impress/Draw packages.

## services/ocr conventions

- `POST /internal/ocr` (multipart `file` + `output` pdf|txt|docx, `languages` tur|eng|tur+eng,
  `engine` auto|fast) returns the file with an `X-OCR-Engine` header; errors are `{"error": code}`.
  Only the gateway calls it (`ocr` tool, pool `ocr`).
- Pipeline (`app/pipeline.py`): OCRmyPDF always builds the searchable PDF and sidecar text; DOCX is made
  from that text (`app/docx.py`). `engine=auto` tries Unlimited-OCR first when `UNLIMITED_OCR_BASE_URL` is set and
  falls back to Tesseract on any Unlimited-OCR failure; `fast` never sends pages off our servers (KVKK).
- Unlimited-OCR is an OCRmyPDF engine plugin (`app/unlimited/plugin.py`, `generate_ocr`): `client.py` calls the
  OpenAI-compatible endpoint, `parse.py` reads `<|det|>kind [x1,y1,x2,y2]<|/det|>` blocks (coordinates
  assumed 0–999; **verify against the real endpoint**), `layout.py` spreads block text into lines/words.
  The plugin reads settings from the environment because OCRmyPDF instantiates engines itself.
- Tests: unit tests with a fake runner/transport; `tests/test_integration.py` runs real Tesseract and Unlimited-OCR
  against a local fake OpenAI server (skips without Tesseract).

## Licensing rules

The project is AGPL-3.0-or-later; the footer links the source (`SOURCE_URL` in `web/src/lib/site.ts`), which
the AGPL requires for a network service – keep it. All code here is our own. Dependencies must be permissive (MIT/Apache/BSD/MPL) or run as a separate
unmodified CLI process (Ghostscript is AGPL and is only invoked as a CLI). Do **not** add PyMuPDF or
anything depending on it (e.g. `pdf2docx`) – they are AGPL.

## Versions

Use the latest stable release of every tool and dependency. Current exceptions:
- `typescript` stays on 5.x and `eslint` on 9.x: `eslint-config-next` 16.3 and Next's type checking target
  those majors.

## Style

- Match the surrounding code; keep comments short and only where the "why" is not obvious.
- Commit messages in English, imperative mood.
