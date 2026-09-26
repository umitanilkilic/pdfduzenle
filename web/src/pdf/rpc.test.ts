import { describe, expect, it } from "vitest";
import { transferables } from "./rpc";

describe("transferables", () => {
  it("finds every distinct buffer in nested values", () => {
    const a = new Uint8Array(4);
    const b = new Uint8Array(2);
    const found = transferables({ ok: true, result: [a, { nested: b }, a, "x", 3] });
    expect(found).toEqual([a.buffer, b.buffer]);
  });
});
