import type { PdfErrorCode } from "./errors";

export interface RpcRequest {
  id: number;
  op: string;
  args: unknown[];
}

export type RpcResponse =
  | { id: number; ok: true; result: unknown }
  | { id: number; ok: false; code: PdfErrorCode | "unknown"; message: string };

/** Collects the ArrayBuffers inside a value so they can be transferred instead of copied. */
export function transferables(value: unknown, out: Transferable[] = []): Transferable[] {
  if (value instanceof Uint8Array) {
    if (value.buffer instanceof ArrayBuffer && !out.includes(value.buffer)) out.push(value.buffer);
  } else if (Array.isArray(value)) {
    for (const v of value) transferables(v, out);
  } else if (value && typeof value === "object") {
    for (const v of Object.values(value)) transferables(v, out);
  }
  return out;
}
