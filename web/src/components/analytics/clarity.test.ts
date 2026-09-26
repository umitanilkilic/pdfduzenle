import { describe, expect, it } from "vitest";
import { loadClarity } from "./clarity";

function fakeDom() {
  const appended: { async: boolean; src: string }[] = [];
  const doc = {
    createElement: () => ({ async: false, src: "" }),
    head: { appendChild: (el: { async: boolean; src: string }) => appended.push(el) },
  } as unknown as Document;
  return { doc, win: {} as Window, appended };
}

describe("loadClarity", () => {
  it("adds the tag script once and queues the consent signal", () => {
    const { doc, win, appended } = fakeDom();
    loadClarity("abc123xyz", doc, win);
    loadClarity("abc123xyz", doc, win);
    expect(appended).toEqual([{ async: true, src: "https://www.clarity.ms/tag/abc123xyz" }]);
    expect((win.clarity as unknown as { q: unknown[][] }).q).toEqual([["consent"]]);
  });
});
