"""Turns Ultra OCR blocks into an OCRmyPDF element tree for the invisible text layer.

The model gives one box per block, not per word, so lines are spread evenly over the block height and
words over the line width in proportion to their length. Selection and search then land on the right
area of the page even without exact word positions.
"""

from __future__ import annotations

from ocrmypdf.hocrtransform import BoundingBox, OcrClass, OcrElement

from .parse import Block, Box

# Blocks without a box (text before the first marker) are placed in a full-width band at the top.
_FALLBACK_BOX = Box(0.05, 0.02, 0.95, 0.12)


def page_element(blocks: list[Block], width: int, height: int, dpi: float, page_number: int) -> OcrElement:
    page = OcrElement(
        ocr_class=OcrClass.PAGE,
        bbox=BoundingBox(left=0, top=0, right=width, bottom=height),
        dpi=dpi,
        page_number=page_number,
    )
    for block in blocks:
        box = block.box or _FALLBACK_BOX
        paragraph = OcrElement(ocr_class=OcrClass.PARAGRAPH, bbox=_px(box, width, height))
        lines = [line for line in (_plain(l) for l in block.text.splitlines()) if line]
        if not lines:
            continue
        line_height = (box.bottom - box.top) / len(lines)
        for i, line in enumerate(lines):
            line_box = Box(box.left, box.top + i * line_height, box.right, box.top + (i + 1) * line_height)
            paragraph.children.append(_line(line, line_box, width, height))
        page.children.append(paragraph)
    return page


def _line(text: str, box: Box, width: int, height: int) -> OcrElement:
    line = OcrElement(ocr_class=OcrClass.LINE, bbox=_px(box, width, height))
    words = text.split()
    total = sum(len(w) for w in words) + max(len(words) - 1, 0)
    span = box.right - box.left
    x = box.left
    for word in words:
        w = span * len(word) / total
        line.children.append(
            OcrElement(
                ocr_class=OcrClass.WORD,
                text=word,
                bbox=_px(Box(x, box.top, x + w, box.bottom), width, height),
            )
        )
        x += w + span / total  # one character of spacing
    return line


def _plain(line: str) -> str:
    """Strips Markdown syntax that should not become searchable text (table pipes, heading marks)."""
    stripped = line.strip()
    if set(stripped) <= set("|-: "):
        return ""  # table separator row
    return stripped.lstrip("#").replace("|", " ").replace("**", "").strip()


def _px(box: Box, width: int, height: int) -> BoundingBox:
    return BoundingBox(
        left=box.left * width, top=box.top * height, right=box.right * width, bottom=box.bottom * height
    )
