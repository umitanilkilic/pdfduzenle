import type { ToolId } from "../registry";

export interface ToolContent {
  /** Short name used in menus and cards. */
  name: string;
  /** One-line description for cards. */
  short: string;
  /** `<title>` without the site suffix. */
  metaTitle: string;
  metaDescription: string;
  h1: string;
  lead: string;
  steps: string[];
  faq: { q: string; a: string }[];
  /** Extra search terms for the tool search box. */
  keywords: string[];
}

export type ToolContentMap = Record<ToolId, ToolContent>;
