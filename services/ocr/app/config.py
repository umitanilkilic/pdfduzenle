"""Service settings from the environment."""

from __future__ import annotations

import os
from dataclasses import dataclass


@dataclass(frozen=True)
class Settings:
    # Ultra OCR (OpenAI-compatible endpoint). Empty base URL disables Ultra; Tesseract is used instead.
    ultra_base_url: str = ""
    ultra_api_key: str = ""
    ultra_model: str = "Unlimited-OCR"
    ultra_timeout: float = 120.0
    ultra_max_pages: int = 50
    fast_max_pages: int = 300
    # Parallel page workers per OCR job.
    jobs: int = 2

    @property
    def ultra_enabled(self) -> bool:
        return bool(self.ultra_base_url)

    @classmethod
    def from_env(cls, env: dict[str, str] | None = None) -> Settings:
        e = os.environ if env is None else env
        return cls(
            ultra_base_url=e.get("ULTRA_OCR_BASE_URL", "").rstrip("/"),
            ultra_api_key=e.get("ULTRA_OCR_API_KEY", ""),
            ultra_model=e.get("ULTRA_OCR_MODEL", cls.ultra_model),
            ultra_timeout=float(e.get("ULTRA_OCR_TIMEOUT", cls.ultra_timeout)),
            ultra_max_pages=int(e.get("ULTRA_OCR_MAX_PAGES", cls.ultra_max_pages)),
            fast_max_pages=int(e.get("OCR_MAX_PAGES", cls.fast_max_pages)),
            jobs=int(e.get("OCR_JOBS", cls.jobs)),
        )
