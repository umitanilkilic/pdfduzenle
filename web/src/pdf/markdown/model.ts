/** A piece of inline text with one style. */
export interface Run {
  text: string;
  bold?: boolean;
  italic?: boolean;
  code?: boolean;
  strike?: boolean;
  /** http(s) or mailto target; anything else is dropped. */
  link?: string;
}

export type Align = "left" | "center" | "right" | null;

export interface ListItem {
  /** null for a plain item, true/false for a task list checkbox. */
  checked: boolean | null;
  blocks: Block[];
}

export type Block =
  | { type: "heading"; level: 1 | 2 | 3 | 4 | 5 | 6; runs: Run[] }
  | { type: "paragraph"; runs: Run[] }
  | { type: "list"; ordered: boolean; start: number; items: ListItem[] }
  | { type: "quote"; blocks: Block[] }
  | { type: "code"; text: string }
  | { type: "rule" }
  | { type: "table"; align: Align[]; header: Run[][]; rows: Run[][][] };
