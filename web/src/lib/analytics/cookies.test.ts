import { describe, expect, it } from "vitest";
import { expiredAnalyticsCookies } from "./cookies";

describe("expiredAnalyticsCookies", () => {
  it("expires GA and Clarity cookies on the host and its parent domains", () => {
    const out = expiredAnalyticsCookies("theme=dark; _ga=GA1.1.1; _ga_ABC=GS1; _clck=x", "www.pdfduzenle.tr");
    expect(out).toContain("_ga=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=/");
    expect(out).toContain("_ga_ABC=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=/; domain=.pdfduzenle.tr");
    expect(out).toContain("_clck=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=/; domain=.www.pdfduzenle.tr");
    expect(out.some((c) => c.startsWith("theme="))).toBe(false);
  });

  it("does nothing without analytics cookies", () => {
    expect(expiredAnalyticsCookies("", "localhost")).toEqual([]);
    expect(expiredAnalyticsCookies("_gallery=1; x=2", "pdfduzenle.tr")).toEqual([]);
  });
});
