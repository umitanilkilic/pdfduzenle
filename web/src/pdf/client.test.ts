import { describe, expect, it } from "vitest";
import { createWorkerEngine } from "./client";
import { operations } from "./engine";
import { PdfToolError } from "./errors";
import type { RpcRequest, RpcResponse } from "./rpc";
import { makePdf } from "./testing";

/** Fake Worker that answers requests with the real operations on the same thread. */
class FakeWorker {
  onmessage: ((e: MessageEvent<RpcResponse>) => void) | null = null;
  onerror: ((e: ErrorEvent) => void) | null = null;
  terminated = false;

  async postMessage({ id, op, args }: RpcRequest) {
    let res: RpcResponse;
    try {
      const fn = operations[op as keyof typeof operations] as (...a: unknown[]) => Promise<unknown>;
      res = { id, ok: true, result: await fn(...args) };
    } catch (err) {
      res =
        err instanceof PdfToolError
          ? { id, ok: false, code: err.code, message: err.message }
          : { id, ok: false, code: "unknown", message: String(err) };
    }
    this.onmessage?.({ data: res } as MessageEvent<RpcResponse>);
  }

  terminate() {
    this.terminated = true;
  }
}

describe("createWorkerEngine", () => {
  it("proxies calls to the worker and resolves results", async () => {
    let created = 0;
    const engine = createWorkerEngine(() => {
      created++;
      return new FakeWorker() as unknown as Worker;
    });
    expect(await engine.pageCount(await makePdf(3))).toBe(3);
    expect(await engine.pageCount(await makePdf(1))).toBe(1);
    expect(created).toBe(1);
  });

  it("rebuilds typed errors from the worker", async () => {
    const engine = createWorkerEngine(() => new FakeWorker() as unknown as Worker);
    await expect(engine.mergePdfs([])).rejects.toMatchObject({ code: "noFiles" });
    await expect(engine.mergePdfs([])).rejects.toBeInstanceOf(PdfToolError);
  });

  it("does not create a worker until the first call", () => {
    let created = 0;
    createWorkerEngine(() => {
      created++;
      return new FakeWorker() as unknown as Worker;
    });
    expect(created).toBe(0);
  });
});
