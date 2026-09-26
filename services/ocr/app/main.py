"""Internal service: only reachable from the gateway on the private Docker network."""

from __future__ import annotations

import shutil
import tempfile
from functools import lru_cache
from pathlib import Path
from typing import Annotated

from fastapi import Depends, FastAPI, File, Form, UploadFile
from fastapi.responses import JSONResponse, Response

from .config import Settings
from .pipeline import (
    IMAGE_SUFFIXES,
    EngineChoice,
    OcrError,
    OcrRunner,
    OutputFormat,
    ocrmypdf_runner,
    parse_languages,
    run_ocr,
)

app = FastAPI(title="pdfduzenle-ocr", docs_url=None, redoc_url=None)

ACCEPTED_SUFFIXES = IMAGE_SUFFIXES | {".pdf"}


@lru_cache
def get_settings() -> Settings:
    return Settings.from_env()


def get_runner() -> OcrRunner:
    return ocrmypdf_runner


@app.exception_handler(OcrError)
def ocr_error(_, err: OcrError) -> JSONResponse:
    status = 500 if err.code == "conversionFailed" else 400
    return JSONResponse({"error": err.code}, status_code=status)


@app.get("/internal/health")
def health(settings: Annotated[Settings, Depends(get_settings)]) -> dict[str, object]:
    return {"status": "ok", "unlimited": settings.unlimited_enabled}


@app.post("/internal/ocr")
def ocr(
    file: Annotated[UploadFile, File()],
    settings: Annotated[Settings, Depends(get_settings)],
    runner: Annotated[OcrRunner, Depends(get_runner)],
    output: Annotated[str, Form()] = "pdf",
    languages: Annotated[str, Form()] = "tur+eng",
    engine: Annotated[str, Form()] = "auto",
) -> Response:
    try:
        output_format, choice = OutputFormat(output), EngineChoice(engine)
    except ValueError as err:
        raise OcrError("invalidOption", str(err)) from err
    langs = parse_languages(languages)
    suffix = Path(file.filename or "").suffix.lower()
    if suffix not in ACCEPTED_SUFFIXES:
        raise OcrError("unsupportedType", suffix)

    with tempfile.TemporaryDirectory(prefix="ocr-") as tmp:
        work = Path(tmp)
        source = work / f"input{suffix}"  # never the client's file name
        with source.open("wb") as out:
            shutil.copyfileobj(file.file, out)
        result = run_ocr(source, work, output_format, langs, choice, settings, runner)

    return Response(result.data, media_type=result.content_type, headers={"X-OCR-Engine": result.engine})
