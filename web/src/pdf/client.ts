import type { OperationName, PdfEngine } from "./engine";
import { PdfToolError } from "./errors";
import type { RpcRequest, RpcResponse } from "./rpc";

/**
 * A PdfEngine that runs every operation in a dedicated Web Worker, keeping the page responsive.
 * Input buffers are copied (not transferred) so callers can reuse their files.
 */
export function createWorkerEngine(createWorker: () => Worker = defaultWorker): PdfEngine {
  let worker: Worker | null = null;
  let nextId = 1;
  const pending = new Map<number, { resolve: (v: unknown) => void; reject: (e: Error) => void }>();

  function ensureWorker(): Worker {
    if (worker) return worker;
    worker = createWorker();
    worker.onmessage = (event: MessageEvent<RpcResponse>) => {
      const res = event.data;
      const call = pending.get(res.id);
      if (!call) return;
      pending.delete(res.id);
      if (res.ok) call.resolve(res.result);
      else call.reject(res.code === "unknown" ? new Error(res.message) : new PdfToolError(res.code, res.message));
    };
    worker.onerror = (event) => {
      for (const call of pending.values()) call.reject(new Error(event.message || "Worker failed"));
      pending.clear();
      worker?.terminate();
      worker = null;
    };
    return worker;
  }

  return new Proxy({} as PdfEngine, {
    get(_, op: string) {
      return (...args: unknown[]) =>
        new Promise((resolve, reject) => {
          const id = nextId++;
          pending.set(id, { resolve, reject });
          const request: RpcRequest = { id, op: op as OperationName, args };
          ensureWorker().postMessage(request);
        });
    },
  });
}

function defaultWorker(): Worker {
  return new Worker(new URL("./worker.ts", import.meta.url), { type: "module" });
}
