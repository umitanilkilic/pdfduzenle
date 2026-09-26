"""Internal service: only reachable from the gateway on the private Docker network."""

from fastapi import FastAPI

app = FastAPI(title="pdfduzenle-ocr", docs_url=None, redoc_url=None)


@app.get("/internal/health")
def health() -> dict[str, str]:
    return {"status": "ok"}
