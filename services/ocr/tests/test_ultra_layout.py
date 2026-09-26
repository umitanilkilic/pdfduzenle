import pytest
from ocrmypdf.hocrtransform import OcrClass

from app.ultra.layout import page_element
from app.ultra.parse import Block, Box


def words(el):
    return [w for p in el.children for line in p.children for w in line.children]


def test_lines_split_block_height_and_words_follow_reading_order():
    block = Block("text", "Merhaba dünya\nİkinci satır", Box(0.1, 0.2, 0.9, 0.4))
    page = page_element([block], width=1000, height=2000, dpi=300, page_number=0)

    assert page.ocr_class == OcrClass.PAGE
    [paragraph] = page.children
    first, second = paragraph.children
    assert (first.bbox.top, first.bbox.bottom) == pytest.approx((400, 600))
    assert (second.bbox.top, second.bbox.bottom) == pytest.approx((600, 800))

    ws = words(page)
    assert [w.text for w in ws] == ["Merhaba", "dünya", "İkinci", "satır"]
    assert ws[0].bbox.left == pytest.approx(100)
    assert ws[0].bbox.right < ws[1].bbox.left <= 900
    assert ws[1].bbox.right <= 900 + 1e-6


def test_markdown_table_syntax_is_not_searchable_text():
    block = Block("table", "| Ay | Gelir |\n|---|---|\n| Ocak | 10 |", Box(0, 0, 1, 1))
    page = page_element([block], 100, 100, 72, 0)
    assert [w.text for w in words(page)] == ["Ay", "Gelir", "Ocak", "10"]


def test_boxless_block_gets_a_fallback_area():
    page = page_element([Block("text", "x", None)], 100, 100, 72, 0)
    assert words(page)[0].bbox.top == 2
