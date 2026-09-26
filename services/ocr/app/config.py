"""Service settings from the environment."""

from __future__ import annotations

import os
from dataclasses import dataclass


@dataclass(frozen=True)
class Settings:
    # Unlimited-OCR (OpenAI-compatible endpoint). Empty base URL disables Unlimited-OCR; Tesseract is used instead.
    unlimited_base_url: str = ""
    unlimited_api_key: str = ""
    unlimited_model: str = "Unlimited-OCR"
    unlimited_timeout: float = 120.0
    unlimited_max_pages: int = 50
    fast_max_pages: int = 300
    # Parallel page workers per OCR job.
    jobs: int = 2

    @property
    def unlimited_enabled(self) -> bool:
        return bool(self.unlimited_base_url)

    @classmethod
    def from_env(cls, env: dict[str, str] | None = None) -> Settings:
        e = os.environ if env is None else env
        return cls(
            unlimited_base_url=e.get("UNLIMITED_OCR_BASE_URL", "").rstrip("/"),
            unlimited_api_key=e.get("UNLIMITED_OCR_API_KEY", ""),
            unlimited_model=e.get("UNLIMITED_OCR_MODEL", cls.unlimited_model),
            unlimited_timeout=float(e.get("UNLIMITED_OCR_TIMEOUT", cls.unlimited_timeout)),
            unlimited_max_pages=int(e.get("UNLIMITED_OCR_MAX_PAGES", cls.unlimited_max_pages)),
            fast_max_pages=int(e.get("OCR_MAX_PAGES", cls.fast_max_pages)),
            jobs=int(e.get("OCR_JOBS", cls.jobs)),
        )
