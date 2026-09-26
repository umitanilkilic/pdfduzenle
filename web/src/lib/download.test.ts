import { unzipSync } from "fflate";
import { describe, expect, it } from "vitest";
import { zipOutputs } from "./download";

describe("zipOutputs", () => {
  it("stores every output and de-duplicates names", () => {
    const zip = zipOutputs([
      { name: "a.pdf", bytes: Uint8Array.of(1), type: "application/pdf" },
      { name: "a.pdf", bytes: Uint8Array.of(2), type: "application/pdf" },
      { name: "b.png", bytes: Uint8Array.of(3), type: "image/png" },
    ]);
    const files = unzipSync(zip);
    expect(Object.keys(files).sort()).toEqual(["a-2.pdf", "a.pdf", "b.png"]);
    expect([...files["a-2.pdf"]]).toEqual([2]);
  });
});
