"""HTTP client for the Unlimited-OCR model behind an OpenAI-compatible API."""

from __future__ import annotations

import base64

import httpx

PROMPT = "document parsing."


class UnlimitedError(Exception):
    """The Unlimited-OCR endpoint failed or returned something unusable."""


class UnlimitedClient:
    def __init__(self, http: httpx.Client, base_url: str, model: str, api_key: str = "") -> None:
        self._http = http
        self._url = f"{base_url}/v1/chat/completions"
        self._model = model
        self._headers = {"Authorization": f"Bearer {api_key}"} if api_key else {}

    def recognize(self, image: bytes, mime: str = "image/png") -> str:
        """Returns the raw model output for one page image (with detection markers)."""
        data_url = f"data:{mime};base64,{base64.b64encode(image).decode()}"
        payload = {
            "model": self._model,
            "temperature": 0,
            "max_tokens": 8192,
            # Detection markers are special tokens; they carry the block positions.
            "skip_special_tokens": False,
            "messages": [
                {
                    "role": "user",
                    "content": [
                        {"type": "image_url", "image_url": {"url": data_url}},
                        {"type": "text", "text": PROMPT},
                    ],
                }
            ],
        }
        try:
            res = self._http.post(self._url, json=payload, headers=self._headers)
            res.raise_for_status()
            content = res.json()["choices"][0]["message"]["content"]
        except (httpx.HTTPError, KeyError, IndexError, TypeError, ValueError) as err:
            raise UnlimitedError(str(err)) from err
        if not isinstance(content, str):
            raise UnlimitedError("unexpected response content")
        return content
