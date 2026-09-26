import json

import httpx
import pytest

from app.config import Settings
from app.ultra.client import UltraClient, UltraError


def make_client(handler) -> UltraClient:
    http = httpx.Client(transport=httpx.MockTransport(handler))
    return UltraClient(http, "https://gpu.example", "Unlimited-OCR", api_key="secret")


def test_sends_image_and_returns_content():
    seen = {}

    def handler(request: httpx.Request) -> httpx.Response:
        seen["url"] = str(request.url)
        seen["auth"] = request.headers.get("authorization")
        seen["body"] = json.loads(request.content)
        return httpx.Response(
            200, json={"choices": [{"message": {"content": "<|det|>text [0,0,9,9]<|/det|>x"}}]}
        )

    out = make_client(handler).recognize(b"\x89PNG", "image/png")
    assert out.endswith("x")
    assert seen["url"] == "https://gpu.example/v1/chat/completions"
    assert seen["auth"] == "Bearer secret"
    body = seen["body"]
    assert body["model"] == "Unlimited-OCR"
    assert body["skip_special_tokens"] is False
    image = body["messages"][0]["content"][0]["image_url"]["url"]
    assert image.startswith("data:image/png;base64,")


@pytest.mark.parametrize(
    "response",
    [
        httpx.Response(503, text="overloaded"),
        httpx.Response(200, json={"choices": []}),
        httpx.Response(200, text="not json"),
        httpx.Response(200, json={"choices": [{"message": {"content": None}}]}),
    ],
)
def test_failures_raise_ultra_error(response):
    with pytest.raises(UltraError):
        make_client(lambda _: response).recognize(b"x")


def test_settings_from_env():
    s = Settings.from_env({"ULTRA_OCR_BASE_URL": "https://gpu.example/", "ULTRA_OCR_MAX_PAGES": "5"})
    assert s.ultra_enabled and s.ultra_base_url == "https://gpu.example" and s.ultra_max_pages == 5
    assert not Settings.from_env({}).ultra_enabled
