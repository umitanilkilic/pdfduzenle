import { describe, expect, it } from "vitest";
import { compatibleTools, timeAgo, toolsAcceptingAny } from "./compatible";

const tools = [
  { id: "merge", name: "Merge", href: "/merge", accept: "application/pdf,.pdf" },
  { id: "compress", name: "Compress", href: "/compress", accept: "application/pdf,.pdf" },
  { id: "jpg-to-pdf", name: "JPG", href: "/jpg", accept: "image/jpeg,.jpg" },
];

describe("compatibleTools", () => {
  it("matches by type and skips the producing tool", () => {
    const pdf = { name: "a.pdf", type: "application/pdf", toolId: "merge" };
    expect(compatibleTools(pdf, tools).map((t) => t.id)).toEqual(["compress"]);
    expect(compatibleTools({ name: "p.jpg", type: "image/jpeg" }, tools).map((t) => t.id)).toEqual(["jpg-to-pdf"]);
  });
});

describe("toolsAcceptingAny", () => {
  it("keeps tools that accept at least one output", () => {
    const txt = { name: "a.txt", type: "text/plain; charset=utf-8" };
    const jpg = { name: "a.jpg", type: "image/jpeg" };
    expect(toolsAcceptingAny([txt], tools)).toEqual([]);
    expect(toolsAcceptingAny([txt, jpg], tools).map((t) => t.id)).toEqual(["jpg-to-pdf"]);
  });
});

describe("timeAgo", () => {
  it("formats minutes and hours in the given language", () => {
    const now = 10 * 3_600_000;
    expect(timeAgo(now - 5 * 60_000, now, "en")).toBe("5 minutes ago");
    expect(timeAgo(now - 3 * 3_600_000, now, "tr")).toBe("3 saat önce");
    expect(timeAgo(now, now, "en")).toBe("now");
  });
});
