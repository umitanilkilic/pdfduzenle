# AGENTS.md

Guidance for AI agents working in this repository.

## What this is

pdfduzenle.tr – a Turkish-first (TR + EN) online PDF toolkit. It is being rewritten from scratch; the
old Stirling-PDF fork (`app/`, `frontend/`, `docker/`, Gradle files) stays in the repo only until the new
stack is live and will then be deleted. **Do not add features to the Stirling code.** Its previous agent
guide is kept at `docs/STIRLING_AGENTS.md` for reference.

## Layout

| Path | Stack | Role |
| --- | --- | --- |
| `web/` | Next.js 16 (App Router, Turbopack), React 19, Tailwind v4, TypeScript | SEO site + all browser-side tools |
| `services/gateway/` | Go 1.27, stdlib `net/http` | Public `/api/*`: uploads, jobs, rate limits, CLI tools (Ghostscript, qpdf, LibreOffice) |
| `services/ocr/` | Python 3.14, FastAPI, uv | Internal only: OCRmyPDF/Tesseract, Ultra OCR (Unlimited-OCR via vLLM) |
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
- web e2e: `npm run build && npm run test:e2e` (starts `next start` on port 3100; set `PW_CHROMIUM_PATH` to use a
  preinstalled Chromium instead of `npx playwright install`)
- gateway: `cd services/gateway && gofmt -l . && go vet ./... && go test ./...`
- ocr: `cd services/ocr && uv run pytest && uv run ruff check .`
- everything: `docker compose up --build`

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
- SEO: every page gets canonical + hreflang (`src/lib/seo.ts`), JSON-LD, and a static Open Graph image
  (`src/lib/og.tsx`). All pages must stay statically generated.
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
- A tool is a `ToolImpl<Options>` (`src/tools/impl/types.ts`): `initialOptions`, optional `Main`/`Options`
  views, optional `validate()` and a `run()` that receives its services (engine, gateway, font, dict).
  `ToolShell` owns file selection, progress, errors and results. Register tools in `src/tools/impl/index.ts`
  (code-split loaders).
- Server tools use `createServerTool()` (`src/tools/impl/server.tsx`): upload → poll → download → delete via
  the `GatewayClient` (`src/api/gateway.ts`). Gateway error codes map to `dict.errors.*` like `PdfToolError`.
- `next.config.ts` raises `proxyClientMaxBodySize` so uploads through the `/api` rewrite are not cut at 10 MB.
- Text drawn into PDFs uses the embedded Inter font (`public/fonts`) so Turkish characters work.

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

## Licensing rules

All code here is our own. Dependencies must be permissive (MIT/Apache/BSD/MPL) or run as a separate
unmodified CLI process (Ghostscript is AGPL and is only invoked as a CLI). Do **not** add PyMuPDF or
anything depending on it (e.g. `pdf2docx`) – they are AGPL.

## Versions

Use the latest stable release of every tool and dependency. Current exceptions:
- `typescript` stays on 5.x and `eslint` on 9.x: `eslint-config-next` 16.3 and Next's type checking target
  those majors.

## Style

- Match the surrounding code; keep comments short and only where the "why" is not obvious.
- Commit messages in English, imperative mood.
