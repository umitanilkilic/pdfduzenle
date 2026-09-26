import type { ToolCategory, ToolIcon } from "@/tools/registry";

/** A suggested follow-up tool, resolved on the server so client code needs no registry lookups. */
export interface NextTool {
  id: string;
  href: string;
  name: string;
  icon: ToolIcon;
  category: ToolCategory;
  /** The tool's `accept` value, to offer it only for outputs it can open. */
  accept: string;
}
