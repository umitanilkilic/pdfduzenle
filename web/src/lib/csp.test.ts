import { describe, expect, it } from "vitest";
import { contentSecurityPolicy } from "./csp";

function directive(csp: string, name: string) {
  return csp.split("; ").find((d) => d.startsWith(`${name} `)) ?? "";
}

describe("contentSecurityPolicy", () => {
  it("allows only our own origin without analytics", () => {
    const csp = contentSecurityPolicy({ ga: null, clarity: null });
    expect(directive(csp, "script-src")).toBe("script-src 'self' 'unsafe-inline'");
    expect(directive(csp, "connect-src")).toBe("connect-src 'self'");
    expect(csp).toContain("frame-ancestors 'none'");
  });

  it("adds the hosts of each configured service only", () => {
    const ga = contentSecurityPolicy({ ga: "G-TEST1234", clarity: null });
    expect(directive(ga, "script-src")).toContain("https://www.googletagmanager.com");
    expect(directive(ga, "connect-src")).toContain("https://*.google-analytics.com");
    expect(ga).not.toContain("clarity");

    const clarity = contentSecurityPolicy({ ga: null, clarity: "abc123xyz" });
    expect(directive(clarity, "script-src")).toContain("https://www.clarity.ms");
    expect(directive(clarity, "connect-src")).toContain("https://c.bing.com");
    expect(clarity).not.toContain("google");
  });
});
