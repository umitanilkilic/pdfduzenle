import type { ToolId } from "../registry";
import type { ToolImpl } from "./shared/types";

// Each tool has its own options type; the registry of loaders erases it at this boundary only.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type AnyToolImpl = ToolImpl<any>;
type Loader = () => Promise<{ default: AnyToolImpl }>;

/** Code-split loaders: a tool page only downloads its own tool (and pdf-lib) when used. */
export const toolImpls: Partial<Record<ToolId, Loader>> = {
  merge: () => import("./merge"),
  split: () => import("./split"),
  "remove-pages": () => import("./remove-pages"),
  "extract-pages": () => import("./extract-pages"),
  organize: () => import("./organize"),
  rotate: () => import("./rotate"),
  "page-numbers": () => import("./page-numbers"),
  watermark: () => import("./watermark"),
  crop: () => import("./crop"),
  "jpg-to-pdf": () => import("./jpg-to-pdf"),
  "markdown-to-pdf": () => import("./markdown-to-pdf"),
  "pdf-to-jpg": () => import("./pdf-to-jpg"),
  sign: () => import("./sign"),
  metadata: () => import("./metadata"),
  compress: () => import("./compress"),
  repair: () => import("./repair"),
  protect: () => import("./protect"),
  unlock: () => import("./unlock"),
  "pdf-to-pdfa": () => import("./pdf-to-pdfa"),
  "word-to-pdf": () => import("./word-to-pdf"),
  "excel-to-pdf": () => import("./excel-to-pdf"),
  "powerpoint-to-pdf": () => import("./powerpoint-to-pdf"),
  "pdf-to-word": () => import("./pdf-to-word"),
  ocr: () => import("./ocr"),
};

export function hasToolImpl(id: ToolId): boolean {
  return id in toolImpls;
}
