import type { OutputFile } from "@/tools/impl/shared/types";
import type { NewFile, StoredFile } from "./store";

/** Outputs larger than this are not kept on the device (IndexedDB quota). */
export const MAX_STORED_BYTES = 150 * 1024 * 1024;

export function toNewFiles(outputs: OutputFile[], toolId: string): NewFile[] {
  return outputs
    .filter((o) => o.bytes.byteLength <= MAX_STORED_BYTES)
    .map((o) => ({ name: o.name, type: o.type, toolId, blob: new Blob([o.bytes as BlobPart], { type: o.type }) }));
}

export function toFile(stored: StoredFile): File {
  return new File([stored.blob], stored.name, { type: stored.type, lastModified: stored.createdAt });
}
