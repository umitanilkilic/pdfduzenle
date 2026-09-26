import type { ToolId } from "../registry";
import type { BrowserTool } from "./types";

// Each tool has its own options type; the registry of loaders erases it at this boundary only.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type AnyBrowserTool = BrowserTool<any>;
type Loader = () => Promise<{ default: AnyBrowserTool }>;

/** Code-split loaders: a tool page only downloads its own tool (and pdf-lib) when used. */
export const browserTools: Partial<Record<ToolId, Loader>> = {
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
  "pdf-to-jpg": () => import("./pdf-to-jpg"),
  sign: () => import("./sign"),
  metadata: () => import("./metadata"),
};

export function hasBrowserTool(id: ToolId): boolean {
  return id in browserTools;
}
