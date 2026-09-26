import { zipSync } from "fflate";
import type { OutputFile } from "@/tools/impl/types";

export function downloadBytes(bytes: Uint8Array, name: string, type: string) {
  const url = URL.createObjectURL(new Blob([bytes as BlobPart], { type }));
  const a = document.createElement("a");
  a.href = url;
  a.download = name;
  document.body.appendChild(a);
  a.click();
  a.remove();
  // Give the browser time to start the download before releasing the blob.
  setTimeout(() => URL.revokeObjectURL(url), 60_000);
}

/** Zips outputs, making duplicate names unique. Stored (level 0) because PDFs and images are already compressed. */
export function zipOutputs(outputs: OutputFile[]): Uint8Array {
  const entries: Record<string, Uint8Array> = {};
  for (const out of outputs) {
    let name = out.name;
    for (let i = 2; name in entries; i++) name = out.name.replace(/(\.[^.]+)?$/, `-${i}$1`);
    entries[name] = out.bytes;
  }
  return zipSync(entries, { level: 0 });
}
