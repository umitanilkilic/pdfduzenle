from app.unlimited.parse import Block, Box, parse_blocks, to_markdown

RAW = (
    "<|ref|>ignored<|/ref|>"
    "<|det|>title [100, 50, 900, 100]<|/det|>Yıllık Rapor\n"
    "<|det|>text [100, 120, 900, 300]<|/det|>Şirketimiz 2026 yılında büyüdü.\nİkinci satır.\n"
    "<|det|>table [100,320,900,500]<|/det|>| Ay | Gelir |\n|---|---|\n| Ocak | 10 |"
)


def test_parses_blocks_with_normalised_boxes():
    blocks = parse_blocks(RAW, width=2000, height=3000)
    assert [b.kind for b in blocks] == ["title", "text", "table"]
    assert blocks[0].text == "Yıllık Rapor"
    assert blocks[0].box == Box(100 / 999, 50 / 999, 900 / 999, 100 / 999)
    assert blocks[1].text == "Şirketimiz 2026 yılında büyüdü.\nİkinci satır."


def test_pixel_coordinates_are_scaled_by_page_size():
    [block] = parse_blocks("<|det|>text [200, 300, 1800, 600]<|/det|>x", width=2000, height=3000)
    assert block.box == Box(0.1, 0.1, 0.9, 0.2)


def test_text_without_markers_is_kept():
    assert parse_blocks("Sadece düz metin", 100, 100) == [Block("text", "Sadece düz metin", None)]


def test_bad_boxes_are_dropped_but_text_kept():
    blocks = parse_blocks("<|det|>text [a, b]<|/det|>x<|det|>text [5,5,5,5]<|/det|>y", 100, 100)
    assert [(b.text, b.box) for b in blocks] == [("x", None), ("y", None)]


def test_empty_blocks_are_skipped():
    assert parse_blocks("<|det|>image [1,1,50,50]<|/det|>   ", 100, 100) == []


def test_markdown_keeps_tables_and_marks_titles():
    md = to_markdown(parse_blocks(RAW, 2000, 3000))
    assert md.startswith("## Yıllık Rapor\n\n")
    assert "| Ocak | 10 |" in md
