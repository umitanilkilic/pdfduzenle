# PDF Düzenle — pdfduzenle.tr

Free online PDF tools, Turkish first and also in English, with no sign-up. Most tools run entirely in
the browser, so the file never leaves the device. Heavy jobs (compression, Office conversions, OCR) run on
our own servers, and their files are deleted when the job is done.

## Tools

**In the browser (nothing is uploaded)**

| Tool | Turkish URL | English URL |
| --- | --- | --- |
| Merge PDF | `/pdf-birlestir` | `/en/merge-pdf` |
| Split PDF | `/pdf-bol` | `/en/split-pdf` |
| Remove pages | `/pdf-sayfa-sil` | `/en/remove-pdf-pages` |
| Extract pages | `/pdf-sayfa-cikar` | `/en/extract-pdf-pages` |
| Organize pages (drag & drop, rotate, delete) | `/pdf-sayfa-duzenle` | `/en/organize-pdf` |
| Rotate PDF | `/pdf-dondur` | `/en/rotate-pdf` |
| JPG/PNG → PDF | `/jpg-pdf-cevir` | `/en/jpg-to-pdf` |
| Markdown → PDF (headings, lists, tables, code, links; live preview) | `/markdown-pdf-cevir` | `/en/markdown-to-pdf` |
| PDF → JPG/PNG | `/pdf-jpg-cevir` | `/en/pdf-to-jpg` |
| Add page numbers | `/pdf-sayfa-numarasi-ekle` | `/en/add-page-numbers` |
| Add watermark (text/image) | `/pdf-filigran-ekle` | `/en/add-watermark` |
| Crop PDF | `/pdf-kirp` | `/en/crop-pdf` |
| Sign PDF (draw/type/upload) | `/pdf-imzala` | `/en/sign-pdf` |
| Edit PDF metadata | `/pdf-bilgilerini-duzenle` | `/en/edit-pdf-metadata` |

**On the server (deleted after the job)**

| Tool | Turkish URL | Powered by |
| --- | --- | --- |
| Compress PDF | `/pdf-sikistir` | Ghostscript |
| Repair PDF | `/pdf-onar` | qpdf |
| Protect / unlock PDF | `/pdf-sifrele`, `/pdf-sifre-kaldir` | qpdf (AES-256) |
| Word / Excel / PowerPoint → PDF | `/word-pdf-cevir`, `/excel-pdf-cevir`, `/powerpoint-pdf-cevir` | LibreOffice |
| PDF → Word | `/pdf-word-cevir` | LibreOffice |
| PDF → PDF/A | `/pdf-pdfa-cevir` | Ghostscript |
| OCR (searchable PDF, Word, TXT) | `/pdf-ocr` | Unlimited-OCR, with Tesseract as fallback |

Every result can be **passed on to another tool** without uploading it again. Results are also kept in
the **Recent files** panel for 24 hours, only on the visitor's device (IndexedDB).

## Architecture

```
browser ──► web (Next.js, :3000) ──/api/*──► gateway (Go, :8080) ──► ocr (Python, :8000, internal only)
              │                                  │                        │
              └─ browser tools:                  ├─ Ghostscript, qpdf,     ├─ OCRmyPDF + Tesseract
                 pdf-lib (Web Worker), pdf.js    │  LibreOffice            └─ Unlimited-OCR (GPU endpoint)
                                                 └─ job queue, rate limit
```

| Folder | Stack | Role |
| --- | --- | --- |
| `web/` | Next.js 16, React 19, Tailwind v4, TypeScript | SEO site (static pages, TR/EN, sitemap, JSON-LD, OG images) and the browser tools |
| `services/gateway/` | Go 1.27 (standard library only) | Public `/api`: uploads, job queue, rate limits, CLI tools |
| `services/ocr/` | Python 3.14, FastAPI, uv | Internal only: OCR (Unlimited-OCR, falling back to Tesseract) |
| `compose.yaml` | Docker Compose | Runs the three services together |

Engineering rules, folder structure and known pitfalls are in [`AGENTS.md`](AGENTS.md). Read it before
contributing.

## Local development

Requirements: Node.js 24, Go 1.27, Python 3.14 and [uv](https://docs.astral.sh/uv/). To try the server
tools locally you also need `qpdf`, `ghostscript`, LibreOffice (`libreoffice-writer-nogui`, `-calc-nogui`,
`-impress-nogui`, `-draw-nogui`) and `tesseract-ocr` (with the `tur` and `eng` language packs).

```bash
# Web (http://localhost:3000). /api requests go to the gateway on localhost:8080.
cd web && npm ci && npm run dev

# Gateway (http://localhost:8080)
cd services/gateway && go run ./cmd/gateway

# OCR service (http://localhost:8000)
cd services/ocr && uv sync && uv run uvicorn app.main:app --port 8000
# point the gateway at it: OCR_SERVICE_URL=http://localhost:8000 go run ./cmd/gateway
```

### Tests and checks

```bash
# web
cd web
npm run lint && npm run typecheck && npm test      # ESLint, TypeScript, Vitest
npm run build:e2e && npm run test:e2e              # Playwright; starts the gateway and OCR service itself

# gateway
cd services/gateway && gofmt -l . && go vet ./... && go test -race ./...

# ocr
cd services/ocr && uv run ruff check . && uv run pytest
```

If Playwright has no browser installed, run `npx playwright install chromium` or point `PW_CHROMIUM_PATH`
at an installed Chromium. CI runs all of the above on every push and pull request.

## Languages

The site is available in **Turkish** (at the root, `/…`) and **English** (under `/en/…`). Every page is
statically generated per language, with its own translated URL, `hreflang` alternates, sitemap entries and
Open Graph image.

### Adding a language

New languages are welcome. The type checker guides you: once the locale is registered, every missing
translation is a compile error. For a German (`de`) translation, for example:

1. **Register the locale** in `web/src/i18n/config.ts`: add `"de"` to `locales`, and fill `htmlLang`
   (`"de-DE"`), `ogLocale` (`"de_DE"`) and `localeNames` (`"Deutsch"`).
2. **Translate the UI strings**: copy `web/src/i18n/dictionaries/en.ts` to `de.ts`, translate it and add it
   to `web/src/i18n/index.ts`.
3. **Translate the tool pages** (titles, descriptions, steps, FAQ): copy `web/src/tools/content/en.ts` to
   `de.ts` and add it to `web/src/tools/content/index.ts`.
4. **Give every tool a German URL**: add a `de` slug to each tool in `web/src/tools/registry.ts`
   (e.g. `slug: { tr: "pdf-birlestir", en: "merge-pdf", de: "pdf-zusammenfuegen" }`). Slugs are lowercase
   ASCII words joined by `-`.
5. **Add the routes**: copy `web/src/app/(en)/` to `web/src/app/(de)/`, rename the inner `en` folder to
   `de`, replace `"en"` with `"de"` in its files, and add a `de` path to each page in `web/src/lib/pages.ts`
   (e.g. `privacy: { …, de: "/datenschutz" }`), renaming the `privacy` folder to match. (Each language has
   its own route group so that every page is static and has the right `<html lang>`.)
6. Run `npm run typecheck`, `npm test` and `npm run build`; the language switcher, sitemap, `hreflang`
   links and menus pick the new language up automatically.

Current limits: right-to-left scripts (Arabic, Hebrew) are not supported yet, and the bundled Inter font
covers Latin, Cyrillic and Greek. Other scripts need an extra font for text drawn into PDFs and OG images.
OCR languages are separate: they depend on the Tesseract language packs installed in the OCR service.

## Deployment

Production runs only images that CI built and signed; the server never builds from source.

```
push to main ──► CI (tests) ──► Release workflow                         ──► server (deploy/server-deploy.sh)
                                 build web, gateway, ocr                       cosign verify-attestation ×2 per image
                                 push to GHCR by digest                        (this repo, release.yml, main, commit)
                                 Trivy: no fixable critical CVEs               git checkout <commit>
                                 sign SLSA provenance + SPDX SBOM (Sigstore)   compose up by digest, read-only
```

- **Provenance and attestations.** Every image digest gets a SLSA build provenance and an SBOM attestation,
  signed with the workflow's OIDC identity (Sigstore) and stored next to the image in GHCR. Anyone can check
  them, e.g. with the GitHub CLI: `gh attestation verify oci://ghcr.io/umitanilkilic/pdfduzenle-web@sha256:… --repo umitanilkilic/pdfduzenle`.
- **Immutable deployment.** The server runs images by digest (`compose.release.yaml`), with read-only root
  filesystems. Before starting anything, `deploy/server-deploy.sh` verifies with cosign that each digest
  was built by `.github/workflows/release.yml` on `main` from exactly the commit being deployed, then checks
  out that commit's compose files. cosign runs from its official image pinned by digest, so the server
  needs nothing but Docker and git (no extra tools, no tokens). A tag can't be re-pointed and a pushed image without attestations is refused.
- **Pinned inputs.** Actions are pinned to commit SHAs and base images to digests (`deploy/check-pins.sh`
  enforces it in CI); lockfiles pin every package. Dependabot updates all of them, waiting 7 days after each
  release.

### Server setup (once)

```bash
git clone https://github.com/umitanilkilic/pdfduzenle /opt/pdfduzenle && cd /opt/pdfduzenle
cp .env.example .env              # runtime settings (Unlimited-OCR endpoint, …)
docker network create webnet      # if the reverse proxy network doesn't exist yet
```

In `/root/.ssh/authorized_keys`, restrict the CI deploy key to the deploy script:

```
command="/opt/pdfduzenle/deploy/server-deploy.sh",restrict ssh-ed25519 AAAA… github-actions-deploy
```

In the GitHub repository:

- Secrets `DEPLOY_HOST`, `DEPLOY_SSH_KEY`, `DEPLOY_KNOWN_HOSTS`; optionally required reviewers on the
  `production` environment.
- Variables (Settings → Variables) for the web image: `NEXT_PUBLIC_GA_ID`, `NEXT_PUBLIC_CLARITY_ID`,
  `GOOGLE_SITE_VERIFICATION`, `BING_SITE_VERIFICATION`, `YANDEX_SITE_VERIFICATION` (and
  `NEXT_PUBLIC_SITE_URL` if not `https://pdfduzenle.tr`). They are public values baked into the pages.
- After the first release, make the three `pdfduzenle-*` packages public (Packages → Package settings) or
  `docker login ghcr.io` on the server with a `read:packages` token.

The server must reach `ghcr.io` (images and their attestations) and `tuf-repo-cdn.sigstore.dev` (Sigstore's
trust root, fetched by cosign).

Rollback to the previous deployment: `/opt/pdfduzenle/deploy/server-deploy.sh rollback`.

For a local or test server without CI, `docker compose up -d --build` still builds everything from source.

The `web` service joins the external `webnet` network where the reverse proxy runs. The gateway lives only
on the internal `backend` network with no internet access; the OCR service is also on the `egress` network
to reach the GPU endpoint.

**Reverse proxy**

Forward all requests to `web:3000`; Next.js passes `/api/*` on to the gateway. The proxy must set
`X-Forwarded-For` (nginx: `proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;`, Traefik and
Caddy do it by default): the rate limit is based on it. Port `3000` is bound to `127.0.0.1` only and can't
be reached directly from outside.

### Environment variables

**web** (read at build time: repository variables for the release workflow, `.env` for a local build)

| Variable | Default | Description |
| --- | --- | --- |
| `NEXT_PUBLIC_SITE_URL` | `https://pdfduzenle.tr` | Base of canonical, hreflang, sitemap and OG URLs |
| `GATEWAY_URL` | `http://localhost:8080` (`http://gateway:8080` in compose) | Where `/api` requests go |
| `NEXT_PUBLIC_GA_ID` | empty (off) | Google Analytics 4 measurement ID (`G-…`) |
| `NEXT_PUBLIC_CLARITY_ID` | empty (off) | Microsoft Clarity project ID |
| `GOOGLE_SITE_VERIFICATION` / `BING_SITE_VERIFICATION` / `YANDEX_SITE_VERIFICATION` | empty | Search Console / Bing Webmaster / Yandex Webmaster verification token (the `content` of their meta tag) |

With docker compose, set these in `.env`; they are baked into the static pages, so changing them needs
`docker compose up -d --build`.

**gateway**

| Variable | Default | Description |
| --- | --- | --- |
| `GATEWAY_ADDR` | `:8080` | Listen address |
| `GATEWAY_WORK_DIR` | `$TMPDIR/pdfduzenle` | Temporary folder for job files |
| `GATEWAY_MAX_UPLOAD_MB` | `100` | Upload limit per request (keep in sync with `proxyClientMaxBodySize` in web) |
| `GATEWAY_JOB_TTL` | `1h` | Jobs and their files are deleted after this at the latest |
| `GATEWAY_MAX_PENDING_JOBS` | `50` | Maximum queued/running jobs |
| `GATEWAY_GS_WORKERS` / `GATEWAY_QPDF_WORKERS` / `GATEWAY_OFFICE_WORKERS` / `GATEWAY_OCR_WORKERS` | `2` / `4` / `2` / `2` | Concurrent jobs per program |
| `GATEWAY_RATE_PER_MINUTE` / `GATEWAY_RATE_BURST` | `20` / `10` | Job submissions per IP |
| `GATEWAY_TRUSTED_PROXY_HOPS` | `1` | Trusted proxies that append to `X-Forwarded-For`; `1` behind one reverse proxy, as Next.js doesn't add itself (`0`: ignore the header) |
| `OCR_SERVICE_URL` | `http://ocr:8000` | Internal OCR service |
| `GATEWAY_PDFA_DEF` / `GATEWAY_ICC_PROFILE` | found in the Ghostscript package | `PDFA_def.ps` and the sRGB ICC profile for PDF/A |

**ocr**

| Variable | Default | Description |
| --- | --- | --- |
| `UNLIMITED_OCR_BASE_URL` | empty | OpenAI-compatible endpoint of Unlimited-OCR (e.g. a GPU server running vLLM/SGLang). Empty means Tesseract only |
| `UNLIMITED_OCR_API_KEY` | empty | Endpoint key (`Authorization: Bearer`) |
| `UNLIMITED_OCR_MODEL` | `Unlimited-OCR` | Model name on the endpoint |
| `UNLIMITED_OCR_TIMEOUT` | `120` | Request timeout per page (seconds) |
| `UNLIMITED_OCR_MAX_PAGES` | `50` | Longer documents go straight to Tesseract |
| `OCR_MAX_PAGES` | `300` | Page limit for OCR |
| `OCR_JOBS` | `2` | Pages processed in parallel per job |

## Privacy and security

- Browser tools never upload the file.
- Server tools receive files over HTTPS, use them only for that job and delete them when it finishes, or
  after `GATEWAY_JOB_TTL` at the latest. File names are never used on disk and passwords never appear in
  process arguments.
- Hostile files: LibreOffice runs with macros disabled and can't fetch links inside documents (SSRF),
  PostScript uploaded as a PDF is rejected, Ghostscript runs with `-dSAFER`, timeouts kill the whole
  process tree, and the gateway container has no internet access.
- In **Unlimited-OCR** mode, page images are sent to the GPU server; **Fast** mode (Tesseract) never lets
  the file leave our servers. The UI and FAQ say so explicitly (KVKK, Turkey's data protection law).
- "Recent files" live only in the visitor's browser and are never sent to a server.
- Analytics (only when the IDs above are set): Google Analytics 4 runs in Consent Mode v2 (cookieless
  until the visitor accepts; ads signals always denied), and Microsoft Clarity loads only after consent,
  with tool areas and the recent-files drawer masked. Custom events (`tool_start`, `tool_success`,
  `tool_error`, `file_download_result`, `next_tool`) carry tool IDs, error codes and counts only, never
  file names or contents. Details for visitors are on `/gizlilik` (`/en/privacy`); review that text with
  your own legal requirements (KVKK/GDPR) in mind.

To report a security issue, please open a private advisory on GitHub (Security → Report a vulnerability)
instead of a public issue.

## License

[GNU AGPL-3.0](LICENSE) or later. You may use, modify and distribute the code; if you offer a modified
version as a service over a network, you must make its source code available to its users under the same
license. The GitHub link in the site footer fulfils this for pdfduzenle.tr.

The "PDF Düzenle" name, the pdfduzenle.tr domain and the logo are not covered by the license; please
publish your own copy under a different name.

Dependencies are permissively licensed (MIT/Apache/BSD/MPL); Ghostscript (AGPL) only runs as a separate
command-line process.
The bundled fonts (Inter, JetBrains Mono) are under the SIL Open Font License; see `web/public/fonts/LICENSE-*.txt`.
