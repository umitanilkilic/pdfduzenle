"""Runs the real OCRmyPDF + Tesseract, and Unlimited-OCR against a local fake endpoint."""

import json
import shutil
import threading
from http.server import BaseHTTPRequestHandler, HTTPServer
from pathlib import Path

import pypdfium2
import pytest
from PIL import Image, ImageDraw, ImageFont

from app.config import Settings
from app.pipeline import EngineChoice, OutputFormat, run_ocr

FONT = Path("/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf")
TEXT = ["Türkçe OCR denemesi", "Şirket ağacı ığdır çiçek"]

pytestmark = pytest.mark.skipif(
    shutil.which("tesseract") is None or not FONT.exists(), reason="tesseract or test font missing"
)


@pytest.fixture
def scan(tmp_path: Path) -> Path:
    img = Image.new("RGB", (2480, 700), "white")
    draw = ImageDraw.Draw(img)
    font = ImageFont.truetype(str(FONT), 110)
    for i, line in enumerate(TEXT):
        draw.text((150, 120 + i * 250), line, fill="black", font=font)
    path = tmp_path / "scan.png"
    img.save(path, dpi=(300, 300))
    return path


def pdf_text(data: bytes) -> str:
    pdf = pypdfium2.PdfDocument(data)
    return "".join(page.get_textpage().get_text_range() for page in pdf)


def test_tesseract_reads_turkish(scan, tmp_path):
    result = run_ocr(scan, tmp_path, OutputFormat.PDF, ["tur"], EngineChoice.FAST, Settings())
    text = pdf_text(result.data)
    assert result.engine == "tesseract"
    for word in ["Türkçe", "Şirket", "ağacı", "çiçek"]:
        assert word in text


class FakeUnlimited(BaseHTTPRequestHandler):
    reply = "<|det|>title [60, 150, 900, 330]<|/det|>Türkçe OCR denemesi\n<|det|>text [60, 480, 900, 660]<|/det|>Şirket ağacı ığdır çiçek"
    calls = 0

    def do_POST(self):
        body = json.loads(self.rfile.read(int(self.headers["Content-Length"])))
        assert body["messages"][0]["content"][0]["image_url"]["url"].startswith("data:image/")
        type(self).calls += 1
        payload = json.dumps({"choices": [{"message": {"content": self.reply}}]}).encode()
        self.send_response(200)
        self.send_header("Content-Type", "application/json")
        self.send_header("Content-Length", str(len(payload)))
        self.end_headers()
        self.wfile.write(payload)

    def log_message(self, *args):
        pass


@pytest.fixture
def unlimited_url(monkeypatch):
    server = HTTPServer(("127.0.0.1", 0), FakeUnlimited)
    threading.Thread(target=server.serve_forever, daemon=True).start()
    url = f"http://127.0.0.1:{server.server_port}"
    # The OCRmyPDF plugin reads its settings from the environment.
    monkeypatch.setenv("UNLIMITED_OCR_BASE_URL", url)
    FakeUnlimited.calls = 0
    yield url
    server.shutdown()


def test_unlimited_builds_searchable_pdf_and_docx(scan, tmp_path, unlimited_url):
    settings = Settings(unlimited_base_url=unlimited_url)
    pdf = run_ocr(scan, tmp_path, OutputFormat.PDF, ["tur"], EngineChoice.AUTO, settings)
    assert pdf.engine == "unlimited" and FakeUnlimited.calls == 1
    assert "Şirket ağacı ığdır çiçek" in pdf_text(pdf.data)

    txt = run_ocr(scan, tmp_path, OutputFormat.TXT, ["tur"], EngineChoice.AUTO, settings)
    assert txt.data.decode().startswith("## Türkçe OCR denemesi")


def test_unreachable_unlimited_falls_back_to_tesseract(scan, tmp_path, monkeypatch):
    monkeypatch.setenv("UNLIMITED_OCR_BASE_URL", "http://127.0.0.1:9")
    monkeypatch.setenv("UNLIMITED_OCR_TIMEOUT", "2")
    settings = Settings(unlimited_base_url="http://127.0.0.1:9")
    result = run_ocr(scan, tmp_path, OutputFormat.TXT, ["tur"], EngineChoice.AUTO, settings)
    assert result.engine == "tesseract"
    assert "Şirket" in result.data.decode()
