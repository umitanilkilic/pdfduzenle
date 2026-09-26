import { describe, expect, it } from "vitest";
import { analyticsEnabled, parseAnalyticsIds, siteVerification } from "./config";

describe("parseAnalyticsIds", () => {
  it("accepts well-formed IDs", () => {
    expect(parseAnalyticsIds({ ga: " G-ABC123DEF4 ", clarity: "abc123xyz" })).toEqual({
      ga: "G-ABC123DEF4",
      clarity: "abc123xyz",
    });
  });

  it("turns off missing or malformed IDs, which would otherwise land in inline scripts", () => {
    expect(parseAnalyticsIds({})).toEqual({ ga: null, clarity: null });
    expect(parseAnalyticsIds({ ga: 'G-1");alert(1)//', clarity: "x</script>" })).toEqual({ ga: null, clarity: null });
    expect(parseAnalyticsIds({ ga: "UA-12345-1" }).ga).toBeNull();
  });

  it("reports whether any service is on", () => {
    expect(analyticsEnabled({ ga: null, clarity: null })).toBe(false);
    expect(analyticsEnabled({ ga: null, clarity: "abc123xyz" })).toBe(true);
  });
});

describe("siteVerification", () => {
  it("maps tokens to Next metadata keys", () => {
    expect(siteVerification({ google: "google-token-123", bing: "BING1234TOKEN", yandex: "yandex12345" })).toEqual({
      google: "google-token-123",
      yandex: "yandex12345",
      other: { "msvalidate.01": "BING1234TOKEN" },
    });
  });

  it("is undefined without tokens and ignores unsafe ones", () => {
    expect(siteVerification({})).toBeUndefined();
    expect(siteVerification({ google: '"><script>' })).toBeUndefined();
  });
});
