import { outputName } from "@/lib/files";
import type { OutputFile } from "./types";

const PDF_MIME = "application/pdf";

export function pdfOutput(original: string, suffix: string, bytes: Uint8Array, index?: number): OutputFile {
  return { name: outputName(original, suffix, "pdf", index), bytes, type: PDF_MIME };
}
