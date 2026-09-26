import type { ToolCategory, ToolIcon } from "@/tools/registry";

/** A suggested follow-up tool, resolved on the server so client code needs no registry lookups. */
export interface NextTool {
  href: string;
  name: string;
  icon: ToolIcon;
  category: ToolCategory;
}
