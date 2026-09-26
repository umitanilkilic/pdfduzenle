# PDF Düzenle — pdfduzenle.tr

Türkçe öncelikli (TR + EN), ücretsiz ve üyeliksiz online PDF araçları. Araçların çoğu dosyayı hiçbir
sunucuya yüklemeden doğrudan tarayıcıda çalışır. Sıkıştırma, Office dönüşümleri ve OCR gibi ağır işler
kendi sunucumuzda yapılır ve dosyalar iş bitince silinir.

## Araçlar

**Tarayıcıda çalışanlar (dosya yüklenmez)**

| Araç | TR adresi | EN adresi |
| --- | --- | --- |
| PDF birleştir | `/pdf-birlestir` | `/en/merge-pdf` |
| PDF böl | `/pdf-bol` | `/en/split-pdf` |
| Sayfa sil | `/pdf-sayfa-sil` | `/en/remove-pdf-pages` |
| Sayfa çıkar | `/pdf-sayfa-cikar` | `/en/extract-pdf-pages` |
| Sayfaları düzenle (sürükle-bırak, döndür, sil) | `/pdf-sayfa-duzenle` | `/en/organize-pdf` |
| PDF döndür | `/pdf-dondur` | `/en/rotate-pdf` |
| JPG/PNG → PDF | `/jpg-pdf-cevir` | `/en/jpg-to-pdf` |
| PDF → JPG/PNG | `/pdf-jpg-cevir` | `/en/pdf-to-jpg` |
| Sayfa numarası ekle | `/pdf-sayfa-numarasi-ekle` | `/en/add-page-numbers` |
| Filigran ekle (metin/görsel) | `/pdf-filigran-ekle` | `/en/add-watermark` |
| PDF kırp | `/pdf-kirp` | `/en/crop-pdf` |
| PDF imzala (çiz/yaz/yükle) | `/pdf-imzala` | `/en/sign-pdf` |
| PDF bilgilerini düzenle | `/pdf-bilgilerini-duzenle` | `/en/edit-pdf-metadata` |

**Sunucuda çalışanlar (iş bitince silinir)**

| Araç | TR adresi | Kullanılan araç |
| --- | --- | --- |
| PDF sıkıştır | `/pdf-sikistir` | Ghostscript |
| PDF onar | `/pdf-onar` | qpdf |
| PDF şifrele / şifre kaldır | `/pdf-sifrele`, `/pdf-sifre-kaldir` | qpdf (AES-256) |
| Word / Excel / PowerPoint → PDF | `/word-pdf-cevir`, `/excel-pdf-cevir`, `/powerpoint-pdf-cevir` | LibreOffice |
| PDF → Word | `/pdf-word-cevir` | LibreOffice |
| PDF → PDF/A | `/pdf-pdfa-cevir` | Ghostscript |
| OCR (aranabilir PDF, Word, TXT) | `/pdf-ocr` | Unlimited-OCR, yedek olarak Tesseract |

Her sonucun ardından **başka bir araçla devam edilebilir** (dosya yeniden yüklenmez). Sonuçlar ayrıca
**Son işlemler** panelinde yalnızca kullanıcının cihazında (IndexedDB) 24 saat tutulur.

## Mimari

```
tarayıcı ──► web (Next.js, :3000) ──/api/*──► gateway (Go, :8080) ──► ocr (Python, :8000, yalnızca iç ağ)
               │                                  │                        │
               └─ tarayıcı araçları:              ├─ Ghostscript, qpdf,     ├─ OCRmyPDF + Tesseract
                  pdf-lib (Web Worker), pdf.js    │  LibreOffice            └─ Unlimited-OCR (GPU endpoint)
                                                  └─ iş kuyruğu, rate limit
```

| Klasör | Teknoloji | Görev |
| --- | --- | --- |
| `web/` | Next.js 16, React 19, Tailwind v4, TypeScript | SEO uyumlu site (statik sayfalar, TR/EN, sitemap, JSON-LD, OG görselleri) ve tarayıcı araçları |
| `services/gateway/` | Go 1.27 (yalnızca standart kütüphane) | Dışa açık `/api`: yükleme, iş kuyruğu, rate limit, CLI araçları |
| `services/ocr/` | Python 3.14, FastAPI, uv | Yalnızca iç ağda: OCR (Unlimited-OCR, Tesseract'a otomatik geçiş) |
| `compose.yaml` | Docker Compose | Üç servisin birlikte çalıştırılması |

Geliştirme kuralları, klasör yapısı ve bilinen tuzaklar [`AGENTS.md`](AGENTS.md) dosyasındadır.

## Yerel geliştirme

Gereksinimler: Node.js 24, Go 1.27, Python 3.14 ve [uv](https://docs.astral.sh/uv/). Sunucu araçlarını
yerelde denemek için `qpdf`, `ghostscript`, LibreOffice (`libreoffice-writer-nogui`, `-calc-nogui`,
`-impress-nogui`, `-draw-nogui`) ve `tesseract-ocr` (`tur`, `eng` dil paketleriyle) gerekir.

```bash
# Web (http://localhost:3000). /api istekleri localhost:8080'deki gateway'e gider.
cd web && npm ci && npm run dev

# Gateway (http://localhost:8080)
cd services/gateway && go run ./cmd/gateway

# OCR servisi (http://localhost:8000)
cd services/ocr && uv sync && uv run uvicorn app.main:app --port 8000
# gateway'e bildirmek için: OCR_SERVICE_URL=http://localhost:8000 go run ./cmd/gateway
```

### Testler ve kontroller

```bash
# web
cd web
npm run lint && npm run typecheck && npm test      # ESLint, TypeScript, Vitest
npm run build && npm run test:e2e                  # Playwright; gateway ve OCR servisini kendisi başlatır

# gateway
cd services/gateway && gofmt -l . && go vet ./... && go test -race ./...

# ocr
cd services/ocr && uv run ruff check . && uv run pytest
```

Playwright için tarayıcı kurulu değilse `npx playwright install chromium` çalıştırın ya da kurulu bir
Chromium'u `PW_CHROMIUM_PATH` ile gösterin.

## Sunucuya kurulum (Docker Compose)

```bash
cp .env.example .env        # Unlimited-OCR endpoint bilgilerini doldurun (boş bırakılırsa Tesseract kullanılır)
docker compose up -d --build
```

`web` servisi, reverse proxy'nin bulunduğu harici `webnet` ağına bağlanır. Ağ yoksa önce oluşturun:
`docker network create webnet`. Gateway yalnızca internete çıkışı olmayan iç `backend` ağındadır; OCR
servisi GPU endpoint'ine ulaşmak için ayrıca `egress` ağına bağlıdır.

**Reverse proxy yönlendirmesi**

Tüm istekleri `web:3000`'e yönlendirin; Next.js `/api/*` isteklerini gateway'e aktarır. Proxy
`X-Forwarded-For` başlığını mutlaka eklemelidir (nginx: `proxy_set_header X-Forwarded-For
$proxy_add_x_forwarded_for;`, Traefik ve Caddy varsayılan olarak ekler); rate limit bu başlığa göre
çalışır. `3000` portu yalnızca `127.0.0.1`'e açıktır, dışarıdan doğrudan erişilemez.

### Ortam değişkenleri

**web** (build sırasında okunur)

| Değişken | Varsayılan | Açıklama |
| --- | --- | --- |
| `NEXT_PUBLIC_SITE_URL` | `https://pdfduzenle.tr` | Canonical, hreflang, sitemap ve OG adreslerinin kökü |
| `GATEWAY_URL` | `http://localhost:8080` (compose'da `http://gateway:8080`) | `/api` isteklerinin gideceği gateway |

**gateway**

| Değişken | Varsayılan | Açıklama |
| --- | --- | --- |
| `GATEWAY_ADDR` | `:8080` | Dinlenen adres |
| `GATEWAY_WORK_DIR` | `$TMPDIR/pdfduzenle` | İş dosyalarının geçici klasörü |
| `GATEWAY_MAX_UPLOAD_MB` | `100` | İstek başına yükleme sınırı (web'deki `proxyClientMaxBodySize` ile uyumlu tutun) |
| `GATEWAY_JOB_TTL` | `1h` | İşler ve dosyaları en geç bu süre sonra silinir |
| `GATEWAY_MAX_PENDING_JOBS` | `50` | Sırada/çalışan en fazla iş |
| `GATEWAY_GS_WORKERS` / `GATEWAY_QPDF_WORKERS` / `GATEWAY_OFFICE_WORKERS` / `GATEWAY_OCR_WORKERS` | `2` / `4` / `2` / `2` | Program başına eşzamanlı iş sayısı |
| `GATEWAY_RATE_PER_MINUTE` / `GATEWAY_RATE_BURST` | `20` / `10` | IP başına iş gönderme sınırı |
| `GATEWAY_TRUSTED_PROXY_HOPS` | `1` | `X-Forwarded-For` ekleyen güvenilir proxy sayısı; Next.js eklemediği için reverse proxy ile `1` (`0`: başlığı yok say) |
| `OCR_SERVICE_URL` | `http://ocr:8000` | İç OCR servisi |
| `GATEWAY_PDFA_DEF` / `GATEWAY_ICC_PROFILE` | Ghostscript paketinden bulunur | PDF/A dönüşümü için `PDFA_def.ps` ve sRGB ICC profili |

**ocr**

| Değişken | Varsayılan | Açıklama |
| --- | --- | --- |
| `UNLIMITED_OCR_BASE_URL` | boş | Unlimited-OCR'ın OpenAI uyumlu endpoint'i (ör. vLLM/SGLang çalışan GPU sunucusu). Boşsa yalnızca Tesseract kullanılır |
| `UNLIMITED_OCR_API_KEY` | boş | Endpoint anahtarı (`Authorization: Bearer`) |
| `UNLIMITED_OCR_MODEL` | `Unlimited-OCR` | Endpoint'teki model adı |
| `UNLIMITED_OCR_TIMEOUT` | `120` | Sayfa başına istek zaman aşımı (sn) |
| `UNLIMITED_OCR_MAX_PAGES` | `50` | Bu sayfa sayısının üstündeki belgeler doğrudan Tesseract ile işlenir |
| `OCR_MAX_PAGES` | `300` | OCR için en fazla sayfa |
| `OCR_JOBS` | `2` | İş başına paralel sayfa sayısı |

## Gizlilik (KVKK)

- Tarayıcı araçlarında dosya cihazdan çıkmaz.
- Sunucu araçlarında dosyalar HTTPS ile gelir, yalnızca o iş için kullanılır, iş sonunda ya da en geç
  `GATEWAY_JOB_TTL` sonra silinir. Dosya adları diskte kullanılmaz, şifreler süreç argümanlarına yazılmaz.
- Kötü niyetli dosyalara karşı: LibreOffice makroları kapalıdır ve belgelerdeki bağlantıları
  indiremez (SSRF), PDF diye yüklenen PostScript reddedilir, Ghostscript `-dSAFER` ile çalışır,
  zaman aşımında tüm alt süreçler öldürülür, gateway konteynerinin internete çıkışı yoktur.
- OCR'ın **Unlimited-OCR** modunda sayfa görüntüleri GPU sunucusuna gönderilir; **Hızlı** mod
  (Tesseract) dosyayı kendi sunucumuzdan çıkarmaz. Arayüz ve SSS bunu kullanıcıya açıkça söyler.
- "Son işlemler" yalnızca kullanıcının tarayıcısında tutulur, hiçbir sunucuya gönderilmez.

## Lisans

[GNU AGPL-3.0](LICENSE) (veya sonraki sürümleri). Kodu kullanabilir, değiştirebilir ve dağıtabilirsiniz;
değiştirilmiş bir sürümü internet üzerinden hizmet olarak sunarsanız kaynak kodunu da kullanıcılarınıza
aynı lisansla açmanız gerekir. Sitenin alt kısmındaki GitHub bağlantısı bu yükümlülüğü karşılar.

"PDF Düzenle" adı, pdfduzenle.tr alan adı ve logo lisansa dahil değildir; kendi kopyanızı farklı bir adla
yayınlayın.

Bağımlılıklar izinli lisanslıdır (MIT/Apache/BSD/MPL); Ghostscript (AGPL) yalnızca ayrı bir komut satırı
süreci olarak çalıştırılır.
