"""OCRmyPDF plugin that runs Ultra OCR as the page OCR engine (`ocr_engine="ultra"`).

OCRmyPDF instantiates engines itself (possibly in worker processes), so the plugin reads its settings
from the environment instead of receiving them from the caller.
"""

from __future__ import annotations

from pathlib import Path

import httpx
from ocrmypdf import hookimpl
from ocrmypdf.hocrtransform import OcrElement
from ocrmypdf.pluginspec import OcrEngine, OrientationConfidence
from PIL import Image

from ..config import Settings
from .client import UltraClient
from .layout import page_element
from .parse import parse_blocks, to_markdown

ENGINE_NAME = "ultra"


class UltraOcrEngine(OcrEngine):
    @staticmethod
    def version() -> str:
        return "unlimited-ocr"

    @staticmethod
    def creator_tag(options) -> str:
        return "Ultra OCR (Unlimited-OCR)"

    def __str__(self) -> str:
        return "Ultra OCR"

    @staticmethod
    def languages(options) -> set[str]:
        # The model is multilingual; accept whatever the caller asks for.
        return set(options.languages or []) | {"tur", "eng"}

    @staticmethod
    def get_orientation(input_file: Path, options) -> OrientationConfidence:
        return OrientationConfidence(angle=0, confidence=0.0)

    @staticmethod
    def supports_generate_ocr() -> bool:
        return True

    @staticmethod
    def generate_ocr(input_file: Path, options, page_number: int = 0) -> tuple[OcrElement, str]:
        settings = Settings.from_env()
        with Image.open(input_file) as img:
            width, height = img.size
            dpi = float((img.info.get("dpi") or (300, 300))[0])
        with httpx.Client(timeout=settings.ultra_timeout) as http:
            client = UltraClient(http, settings.ultra_base_url, settings.ultra_model, settings.ultra_api_key)
            raw = client.recognize(Path(input_file).read_bytes(), _mime(input_file))
        blocks = parse_blocks(raw, width, height)
        return page_element(blocks, width, height, dpi, page_number), to_markdown(blocks)

    @staticmethod
    def generate_hocr(input_file, output_hocr, output_text, options) -> None:
        raise NotImplementedError("Ultra OCR only implements generate_ocr()")

    @staticmethod
    def generate_pdf(input_file, output_pdf, output_text, options) -> None:
        raise NotImplementedError("Ultra OCR only implements generate_ocr()")


def _mime(path: Path) -> str:
    return "image/jpeg" if Path(path).suffix.lower() in {".jpg", ".jpeg"} else "image/png"


@hookimpl
def get_ocr_engine(options):
    if options is not None and getattr(options, "ocr_engine", None) == ENGINE_NAME:
        return UltraOcrEngine()
    return None
