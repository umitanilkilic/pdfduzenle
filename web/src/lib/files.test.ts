import { describe, expect, it } from "vitest";
import { baseName, formatBytes, matchesAccept, outputName, savedPercent } from "./files";

describe("outputName", () => {
  it("adds a suffix and keeps Turkish characters", () => {
    expect(outputName("Yıllık Rapor.pdf", "birlestirilmis", "pdf")).toBe("Yıllık Rapor-birlestirilmis.pdf");
  });

  it("numbers multiple outputs", () => {
    expect(outputName("a.pdf", "bolum", "pdf", 2)).toBe("a-bolum-2.pdf");
  });

  it("strips characters that are unsafe in file names", () => {
    expect(outputName('x/y:z*"?.pdf', "s", "pdf")).toBe("xyz-s.pdf");
    expect(outputName("***.pdf", "s", "pdf")).toBe("belge-s.pdf");
  });
});

describe("baseName", () => {
  it.each([
    ["a.pdf", "a"],
    ["a.b.pdf", "a.b"],
    [".hidden", ".hidden"],
    ["noext", "noext"],
  ])("%s → %s", (input, expected) => expect(baseName(input)).toBe(expected));
});

describe("formatBytes", () => {
  it("uses locale separators", () => {
    expect(formatBytes(1536, "tr")).toBe("1,5 KB");
    expect(formatBytes(1536, "en")).toBe("1.5 KB");
    expect(formatBytes(500, "en")).toBe("500 B");
    expect(formatBytes(250 * 1024 * 1024, "en")).toBe("250 MB");
  });
});

describe("matchesAccept", () => {
  const pdf = "application/pdf,.pdf";
  it("matches by MIME type or extension", () => {
    expect(matchesAccept({ name: "a.PDF", type: "" }, pdf)).toBe(true);
    expect(matchesAccept({ name: "a", type: "application/pdf" }, pdf)).toBe(true);
    expect(matchesAccept({ name: "a.png", type: "image/png" }, pdf)).toBe(false);
    expect(matchesAccept({ name: "a.heic", type: "image/heic" }, "image/*")).toBe(true);
  });
});

describe("savedPercent", () => {
  it("reports the reduction", () => {
    expect(savedPercent(1000, 250)).toBe(75);
    expect(savedPercent(1000, 1000)).toBeNull();
    expect(savedPercent(1000, 1200)).toBeNull();
    expect(savedPercent(0, 0)).toBeNull();
  });
});
