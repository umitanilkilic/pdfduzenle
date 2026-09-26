import type { OperationName, PdfEngine } from "./engine";
import { PdfToolError } from "./errors";
import type { RpcRequest, RpcResponse } from "./rpc";

/**
 * A PdfEngine that runs every operation in a dedicated Web Worker, keeping the page responsive.
 * Input buffers are copied (not transferred) so callers can reuse their files.
 */
export function createWorkerEngine(createWorker: () => Worker | Promise<Worker> = defaultWorker): PdfEngine {
  let worker: Promise<Worker> | null = null;
  let nextId = 1;
  const pending = new Map<number, { resolve: (v: unknown) => void; reject: (e: Error) => void }>();

  function ensureWorker(): Promise<Worker> {
    worker ??= Promise.resolve(createWorker()).then(
      (w) => {
        attach(w);
        return w;
      },
      (err: unknown) => {
        worker = null; // allow a later call to retry
        throw err;
      },
    );
    return worker;
  }

  function attach(w: Worker) {
    w.onmessage = (event: MessageEvent<RpcResponse>) => {
      const res = event.data;
      const call = pending.get(res.id);
      if (!call) return;
      pending.delete(res.id);
      if (res.ok) call.resolve(res.result);
      else call.reject(res.code === "unknown" ? new Error(res.message) : new PdfToolError(res.code, res.message));
    };
    w.onerror = (event) => {
      for (const call of pending.values()) call.reject(new Error(event.message || "Worker failed"));
      pending.clear();
      w.terminate();
      worker = null;
    };
  }

  return new Proxy({} as PdfEngine, {
    get(_, op: string) {
      return (...args: unknown[]) =>
        new Promise((resolve, reject) => {
          const id = nextId++;
          pending.set(id, { resolve, reject });
          const request: RpcRequest = { id, op: op as OperationName, args };
          ensureWorker().then(
            (w) => w.postMessage(request),
            (err: unknown) => {
              pending.delete(id);
              reject(err instanceof Error ? err : new Error(String(err)));
            },
          );
        });
    },
  });
}

async function defaultWorker(): Promise<Worker> {
  return (await import("./worker-factory")).createPdfWorker();
}
