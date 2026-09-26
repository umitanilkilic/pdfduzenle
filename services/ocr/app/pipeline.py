"""OCR pipeline: OCRmyPDF with Unlimited-OCR as the preferred engine and Tesseract as fallback."""

from __future__ import annotations

import logging
from dataclasses import dataclass
from enum import StrEnum
from pathlib import Path
from typing import Protocol

import ocrmypdf
import pikepdf
from ocrmypdf import exceptions as ocr_exc

from .config import Settings
from .docx import markdown_to_docx
from .unlimited import plugin as unlimited_plugin

log = logging.getLogger(__name__)

IMAGE_SUFFIXES = {".jpg", ".jpeg", ".png", ".tif", ".tiff"}
LANGUAGES = {"tur", "eng"}


class EngineChoice(StrEnum):
    AUTO = "auto"  # Unlimited-OCR when configured, Tesseract otherwise or when Unlimited-OCR fails
    FAST = "fast"  # Tesseract only; the file never leaves our servers


class OutputFormat(StrEnum):
    PDF = "pdf"
    TXT = "txt"
    DOCX = "docx"


CONTENT_TYPES = {
    OutputFormat.PDF: "application/pdf",
    OutputFormat.TXT: "text/plain; charset=utf-8",
    OutputFormat.DOCX: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
}


class OcrError(Exception):
    """A failure the user can act on; `code` maps to a translated message."""

    def __init__(self, code: str, detail: str = "") -> None:
        super().__init__(f"{code}: {detail}" if detail else code)
        self.code = code


@dataclass(frozen=True)
class OcrResult:
    data: bytes
    format: OutputFormat
    engine: str

    @property
    def content_type(self) -> str:
        return CONTENT_TYPES[self.format]


class OcrRunner(Protocol):
    """Runs one OCR pass (OCRmyPDF in production, a fake in tests)."""

    def __call__(
        self, source: Path, output: Path, sidecar: Path, *, engine: str, languages: list[str], jobs: int
    ) -> None: ...


def ocrmypdf_runner(
    source: Path, output: Path, sidecar: Path, *, engine: str, languages: list[str], jobs: int
) -> None:
    ocrmypdf.ocr(
        source,
        output,
        language=languages,
        ocr_engine=engine,
        plugins=[unlimited_plugin.__name__] if engine == unlimited_plugin.ENGINE_NAME else [],
        sidecar=sidecar,
        rotate_pages=engine == "tesseract",
        deskew=engine == "tesseract",
        skip_text=True,
        image_dpi=300 if source.suffix.lower() in IMAGE_SUFFIXES else None,
        output_type="pdf",
        jobs=jobs,
        use_threads=True,
        progress_bar=False,
    )


def count_pages(path: Path) -> int:
    if path.suffix.lower() in IMAGE_SUFFIXES:
        return 1
    try:
        with pikepdf.open(path) as pdf:
            return len(pdf.pages)
    except pikepdf.PasswordError as err:
        raise OcrError("encrypted") from err
    except pikepdf.PdfError as err:
        raise OcrError("invalidPdf", str(err)) from err


def parse_languages(value: str) -> list[str]:
    langs = [lang for lang in value.split("+") if lang]
    if not langs or not set(langs) <= LANGUAGES:
        raise OcrError("invalidOption", f"languages {value!r}")
    return langs


def run_ocr(
    source: Path,
    work_dir: Path,
    output_format: OutputFormat,
    languages: list[str],
    choice: EngineChoice,
    settings: Settings,
    runner: OcrRunner = ocrmypdf_runner,
) -> OcrResult:
    pages = count_pages(source)
    engines = ["tesseract"]
    if choice is EngineChoice.AUTO and settings.unlimited_enabled and pages <= settings.unlimited_max_pages:
        engines.insert(0, unlimited_plugin.ENGINE_NAME)
    if pages > settings.fast_max_pages:
        raise OcrError("tooManyPages", f"{pages} pages")

    output, sidecar = work_dir / "ocr.pdf", work_dir / "ocr.txt"
    for engine in engines:
        try:
            runner(source, output, sidecar, engine=engine, languages=languages, jobs=settings.jobs)
            break
        except ocr_exc.EncryptedPdfError as err:
            raise OcrError("encrypted") from err
        except (ocr_exc.InputFileError, ocr_exc.UnsupportedImageFormatError, ocr_exc.DpiError) as err:
            raise OcrError("invalidPdf", str(err)) from err
        except Exception as err:
            if engine == engines[-1]:
                raise OcrError("conversionFailed", str(err)) from err
            log.warning("OCR engine %s failed, falling back: %s", engine, err)

    if output_format is OutputFormat.PDF:
        data = output.read_bytes()
    else:
        text = sidecar.read_text(encoding="utf-8") if sidecar.exists() else ""
        # OCRmyPDF separates pages with form feeds.
        text = text.replace("\f", "\n\n").strip() + "\n"
        data = markdown_to_docx(text) if output_format is OutputFormat.DOCX else text.encode()
    return OcrResult(data=data, format=output_format, engine=engine)
