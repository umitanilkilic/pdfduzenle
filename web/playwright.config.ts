import { defineConfig, devices } from "@playwright/test";

const port = Number(process.env.E2E_PORT ?? 3100);

export default defineConfig({
  testDir: "e2e",
  timeout: 60_000,
  fullyParallel: true,
  reporter: process.env.CI ? "github" : "list",
  use: {
    baseURL: `http://localhost:${port}`,
    trace: "retain-on-failure",
    // Lets environments with a preinstalled Chromium skip `playwright install`.
    launchOptions: process.env.PW_CHROMIUM_PATH ? { executablePath: process.env.PW_CHROMIUM_PATH } : {},
  },
  projects: [
    { name: "desktop", use: { ...devices["Desktop Chrome"] } },
    { name: "mobile", use: { ...devices["Pixel 7"] }, grep: /@mobile/ },
  ],
  webServer: [
    { command: `npx next start -p ${port}`, port, reuseExistingServer: true },
    // Server-side tools need the Go gateway (and qpdf, Ghostscript, LibreOffice on the machine).
    {
      command: "go run ./cmd/gateway",
      cwd: "../services/gateway",
      url: "http://localhost:8080/api/health",
      reuseExistingServer: true,
      timeout: 120_000,
      env: {
        GATEWAY_WORK_DIR: "/tmp/pdfduzenle-e2e",
        GATEWAY_RATE_PER_MINUTE: "600",
        GATEWAY_RATE_BURST: "100",
        OCR_SERVICE_URL: "http://localhost:8000",
      },
    },
    // OCR runs Tesseract locally here (no UNLIMITED_OCR_BASE_URL), exercising the fallback path.
    {
      command: "uv run uvicorn app.main:app --port 8000",
      cwd: "../services/ocr",
      url: "http://localhost:8000/internal/health",
      reuseExistingServer: true,
      timeout: 120_000,
    },
  ],
});
