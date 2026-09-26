import io
from pathlib import Path

import pytest
from docx import Document
from ocrmypdf import exceptions as ocr_exc

from app.config import Settings
from app.pipeline import EngineChoice, OcrError, OutputFormat, parse_languages, run_ocr

UNLIMITED = Settings(unlimited_base_url="https://gpu.example", unlimited_max_pages=2)
NO_UNLIMITED = Settings()


class FakeRunner:
    """Records engines tried; fails for the engines listed in `fail`."""

    def __init__(self, fail: dict[str, Exception] | None = None, text: str = "Merhaba\fDünya") -> None:
        self.fail = fail or {}
        self.text = text
        self.engines: list[str] = []

    def __call__(self, source, output, sidecar, *, engine, languages, jobs):
        self.engines.append(engine)
        if engine in self.fail:
            raise self.fail[engine]
        output.write_bytes(b"%PDF-ocr")
        sidecar.write_text(self.text, encoding="utf-8")


@pytest.fixture
def image(tmp_path: Path) -> Path:
    path = tmp_path / "scan.png"
    path.write_bytes(b"\x89PNG")
    return path


def run(image, tmp_path, runner, settings=UNLIMITED, choice=EngineChoice.AUTO, fmt=OutputFormat.PDF):
    return run_ocr(image, tmp_path, fmt, ["tur"], choice, settings, runner)


def test_auto_prefers_unlimited(image, tmp_path):
    runner = FakeRunner()
    result = run(image, tmp_path, runner)
    assert runner.engines == ["unlimited"]
    assert result.engine == "unlimited" and result.data == b"%PDF-ocr"


def test_falls_back_to_tesseract_when_unlimited_fails(image, tmp_path):
    runner = FakeRunner(fail={"unlimited": RuntimeError("GPU down")})
    result = run(image, tmp_path, runner)
    assert runner.engines == ["unlimited", "tesseract"]
    assert result.engine == "tesseract"


def test_fast_mode_and_missing_endpoint_use_tesseract_only(image, tmp_path):
    for settings, choice in [(UNLIMITED, EngineChoice.FAST), (NO_UNLIMITED, EngineChoice.AUTO)]:
        runner = FakeRunner()
        run(image, tmp_path, runner, settings, choice)
        assert runner.engines == ["tesseract"]


def test_large_documents_skip_unlimited(tmp_path, monkeypatch):
    monkeypatch.setattr("app.pipeline.count_pages", lambda _: 3)
    runner = FakeRunner()
    run(tmp_path / "a.pdf", tmp_path, runner)
    assert runner.engines == ["tesseract"]


def test_page_limit(tmp_path, monkeypatch):
    monkeypatch.setattr("app.pipeline.count_pages", lambda _: 301)
    with pytest.raises(OcrError) as err:
        run(tmp_path / "a.pdf", tmp_path, FakeRunner(), NO_UNLIMITED)
    assert err.value.code == "tooManyPages"


@pytest.mark.parametrize(
    ("exc", "code"),
    [
        (ocr_exc.EncryptedPdfError(), "encrypted"),
        (ocr_exc.InputFileError(), "invalidPdf"),
        (RuntimeError("boom"), "conversionFailed"),
    ],
)
def test_errors_map_to_codes(image, tmp_path, exc, code):
    with pytest.raises(OcrError) as err:
        run(image, tmp_path, FakeRunner(fail={"tesseract": exc}), NO_UNLIMITED)
    assert err.value.code == code


def test_encrypted_input_does_not_fall_back(image, tmp_path):
    runner = FakeRunner(fail={"unlimited": ocr_exc.EncryptedPdfError()})
    with pytest.raises(OcrError):
        run(image, tmp_path, runner)
    assert runner.engines == ["unlimited"]


def test_text_and_docx_outputs(image, tmp_path):
    txt = run(image, tmp_path, FakeRunner(), fmt=OutputFormat.TXT)
    assert txt.data.decode() == "Merhaba\n\nDünya\n"
    assert txt.content_type.startswith("text/plain")
    docx = run(image, tmp_path, FakeRunner(), fmt=OutputFormat.DOCX)
    assert [p.text for p in Document(io.BytesIO(docx.data)).paragraphs] == ["Merhaba", "Dünya"]


def test_parse_languages():
    assert parse_languages("tur+eng") == ["tur", "eng"]
    for bad in ["", "deu", "tur+../../etc"]:
        with pytest.raises(OcrError):
            parse_languages(bad)
