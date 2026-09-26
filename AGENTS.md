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

## Commands

- web: `cd web && npm run dev` · `npm run lint` · `npm run typecheck` · `npm run build` · `npm run format`
- gateway: `cd services/gateway && go vet ./... && go test ./...`
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
