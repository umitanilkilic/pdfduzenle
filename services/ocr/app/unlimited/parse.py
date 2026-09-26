"""Parsing of Unlimited-OCR output.

The model emits blocks introduced by a detection marker, e.g.::

    <|det|>title [70, 45, 930, 90]<|/det|>Yıllık Rapor
    <|det|>text [70, 110, 930, 300]<|/det|>Birinci paragraf…

Coordinates are assumed to be normalised to 0–999 (the convention of comparable document VLMs);
values above 999 are treated as pixels of the rendered page. The upstream README documents only the
marker, so this parser is deliberately tolerant and must be re-checked against real endpoint output.
"""

from __future__ import annotations

import re
from dataclasses import dataclass

_DET = re.compile(r"<\|det\|>\s*(?P<kind>[\w-]*)\s*\[(?P<box>[^\]]*)\]\s*<\|/det\|>")
_REF = re.compile(r"<\|ref\|>.*?<\|/ref\|>", re.DOTALL)  # grounding labels, not page text
_SPECIAL = re.compile(r"<\|[^|>]*\|>")

NORMALISED_MAX = 999.0


@dataclass(frozen=True)
class Box:
    """Fractions (0–1) of the page, top-left origin."""

    left: float
    top: float
    right: float
    bottom: float


@dataclass(frozen=True)
class Block:
    kind: str
    text: str
    box: Box | None


def parse_blocks(raw: str, width: float, height: float) -> list[Block]:
    """Splits model output into blocks; text before the first marker becomes a box-less block."""
    blocks: list[Block] = []
    raw = _REF.sub("", raw)
    matches = list(_DET.finditer(raw))

    leading = _clean(raw[: matches[0].start()] if matches else raw)
    if leading:
        blocks.append(Block(kind="text", text=leading, box=None))

    for i, m in enumerate(matches):
        end = matches[i + 1].start() if i + 1 < len(matches) else len(raw)
        text = _clean(raw[m.end() : end])
        if text:
            blocks.append(
                Block(kind=m.group("kind") or "text", text=text, box=_box(m.group("box"), width, height))
            )
    return blocks


def to_markdown(blocks: list[Block]) -> str:
    """Plain Markdown of the page (the model already writes tables and headings as Markdown)."""
    parts = []
    for b in blocks:
        text = b.text
        if b.kind == "title" and not text.startswith("#"):
            text = f"## {text}"
        parts.append(text)
    return "\n\n".join(parts).strip() + "\n"


def _clean(text: str) -> str:
    return _SPECIAL.sub("", text).strip()


def _box(spec: str, width: float, height: float) -> Box | None:
    try:
        values = [float(v) for v in spec.replace(";", ",").split(",")]
    except ValueError:
        return None
    if len(values) != 4 or width <= 0 or height <= 0:
        return None
    x1, y1, x2, y2 = values
    if max(values) <= NORMALISED_MAX:
        sx, sy = NORMALISED_MAX, NORMALISED_MAX
    else:
        sx, sy = width, height
    left, right = sorted((x1 / sx, x2 / sx))
    top, bottom = sorted((y1 / sy, y2 / sy))
    clamp = lambda v: min(max(v, 0.0), 1.0)
    box = Box(clamp(left), clamp(top), clamp(right), clamp(bottom))
    if box.right - box.left <= 0 or box.bottom - box.top <= 0:
        return None
    return box
