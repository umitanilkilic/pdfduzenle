import { describe, expect, it } from "vitest";
import { MAX_STORED_BYTES, toFile, toNewFiles } from "./files";

describe("workspace file helpers", () => {
  it("keeps outputs up to the size limit", () => {
    const small = { name: "a.pdf", bytes: new Uint8Array(3), type: "application/pdf" };
    const huge = { name: "b.pdf", bytes: new Uint8Array(MAX_STORED_BYTES + 1), type: "application/pdf" };
    const files = toNewFiles([small, huge], "merge");
    expect(files.map((f) => [f.name, f.toolId, f.blob.size])).toEqual([["a.pdf", "merge", 3]]);
  });

  it("restores a File with name and type", async () => {
    const file = toFile({
      id: "1",
      name: "ş.pdf",
      type: "application/pdf",
      size: 1,
      toolId: "x",
      createdAt: 5,
      blob: new Blob(["x"]),
    });
    expect([file.name, file.type, await file.text()]).toEqual(["ş.pdf", "application/pdf", "x"]);
  });
});
