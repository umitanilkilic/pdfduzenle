import { describe, expect, it, vi } from "vitest";
import { createAnalytics } from "./events";

describe("createAnalytics", () => {
  it("sends events with IDs and numbers only", () => {
    const gtag = vi.fn();
    const analytics = createAnalytics(() => gtag);
    analytics.toolStarted("merge", 3);
    analytics.toolSucceeded("merge", 1, 1234.6);
    analytics.toolFailed("merge", "invalidPdf");
    analytics.downloaded("merge", "zip");
    analytics.nextToolChosen("merge", "compress");
    expect(gtag.mock.calls).toEqual([
      ["event", "tool_start", { tool_id: "merge", file_count: 3 }],
      ["event", "tool_success", { tool_id: "merge", output_count: 1, duration_ms: 1235 }],
      ["event", "tool_error", { tool_id: "merge", error_code: "invalidPdf" }],
      ["event", "file_download_result", { tool_id: "merge", download_kind: "zip" }],
      ["event", "next_tool", { tool_id: "merge", target_tool: "compress" }],
    ]);
  });

  it("does nothing while gtag is absent (analytics off or not loaded)", () => {
    expect(() => createAnalytics(() => undefined).toolStarted("merge", 1)).not.toThrow();
  });
});
