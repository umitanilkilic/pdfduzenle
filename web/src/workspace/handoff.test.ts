import { describe, expect, it } from "vitest";
import { handoffHref, readHandoffIds } from "./handoff";

describe("handoff", () => {
  it("round-trips ids through the URL", () => {
    const href = handoffHref("/pdf-sikistir", ["a1", "b-2"]);
    expect(href).toBe("/pdf-sikistir?files=a1,b-2");
    expect(readHandoffIds(href.slice(href.indexOf("?")))).toEqual(["a1", "b-2"]);
  });

  it("leaves the link alone without ids", () => {
    expect(handoffHref("/en/merge-pdf", [])).toBe("/en/merge-pdf");
  });

  it("ignores malformed ids", () => {
    expect(readHandoffIds("?files=ok,../x,<script>,")).toEqual(["ok"]);
    expect(readHandoffIds("?other=1")).toEqual([]);
  });
});
