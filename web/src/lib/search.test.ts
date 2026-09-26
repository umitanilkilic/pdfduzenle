import { describe, expect, it } from "vitest";
import { normalizeSearch } from "./search";

describe("normalizeSearch", () => {
  it("matches Turkish words typed without diacritics", () => {
    expect(normalizeSearch("Sıkıştır")).toBe(normalizeSearch("sikistir"));
    expect(normalizeSearch("ŞİFRE")).toBe("sifre");
    expect(normalizeSearch("Görsel Üç Ğ")).toBe("gorsel uc g");
  });
});
