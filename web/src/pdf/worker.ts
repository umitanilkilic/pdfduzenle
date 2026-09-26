/// <reference lib="webworker" />
import { operations, type OperationName } from "./engine";
import { PdfToolError } from "./errors";
import { transferables, type RpcRequest, type RpcResponse } from "./rpc";

declare const self: DedicatedWorkerGlobalScope;

self.onmessage = async (event: MessageEvent<RpcRequest>) => {
  const { id, op, args } = event.data;
  let response: RpcResponse;
  try {
    const fn = operations[op as OperationName] as (...a: unknown[]) => Promise<unknown>;
    if (!fn) throw new Error(`Unknown operation: ${op}`);
    response = { id, ok: true, result: await fn(...args) };
  } catch (err) {
    response = {
      id,
      ok: false,
      code: err instanceof PdfToolError ? err.code : "unknown",
      message: err instanceof Error ? err.message : String(err),
    };
  }
  self.postMessage(response, transferables(response));
};
