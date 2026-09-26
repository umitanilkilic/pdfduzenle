import pytest
from fastapi.testclient import TestClient

from app.config import Settings
from app.main import app, get_runner, get_settings


def fake_runner(source, output, sidecar, *, engine, languages, jobs):
    output.write_bytes(b"%PDF-ocr")
    sidecar.write_text("metin", encoding="utf-8")


@pytest.fixture
def client():
    app.dependency_overrides[get_runner] = lambda: fake_runner
    app.dependency_overrides[get_settings] = lambda: Settings()
    yield TestClient(app)
    app.dependency_overrides.clear()


def post(client, name="tarama.png", **fields):
    return client.post("/internal/ocr", files={"file": (name, b"\x89PNG", "image/png")}, data=fields)


def test_health(client):
    assert client.get("/internal/health").json() == {"status": "ok", "unlimited": False}


def test_returns_file_and_engine(client):
    res = post(client, output="txt")
    assert res.status_code == 200
    assert res.text == "metin\n"
    assert res.headers["x-ocr-engine"] == "tesseract"


@pytest.mark.parametrize(
    ("fields", "name", "code"),
    [
        ({"output": "html"}, "a.png", "invalidOption"),
        ({"engine": "gpu"}, "a.png", "invalidOption"),
        ({"languages": "deu"}, "a.png", "invalidOption"),
        ({}, "a.exe", "unsupportedType"),
    ],
)
def test_rejects_bad_input(client, fields, name, code):
    res = post(client, name=name, **fields)
    assert res.status_code == 400
    assert res.json() == {"error": code}
