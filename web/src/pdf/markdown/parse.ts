import { Lexer, type Token, type Tokens } from "marked";
import type { Block, ListItem, Run } from "./model";

type Style = Omit<Run, "text">;

const ENTITIES: Record<string, string> = { amp: "&", lt: "<", gt: ">", quot: '"', apos: "'", nbsp: " " };

/** Decodes the HTML entities Markdown authors use; marked keeps them verbatim. */
export function decodeEntities(text: string): string {
  return text.replace(/&(#x[0-9a-f]+|#\d+|[a-z]+);/gi, (match, name: string) => {
    if (name[0] === "#") {
      const code = name[1] === "x" || name[1] === "X" ? parseInt(name.slice(2), 16) : parseInt(name.slice(1), 10);
      return code > 0 && code <= 0x10ffff ? String.fromCodePoint(code) : match;
    }
    return ENTITIES[name.toLowerCase()] ?? match;
  });
}

/** Only links a reader can safely follow end up clickable in the PDF. */
export function safeLink(href: string): string | undefined {
  try {
    const url = new URL(href);
    return ["http:", "https:", "mailto:"].includes(url.protocol) ? url.href : undefined;
  } catch {
    return undefined;
  }
}

function inline(tokens: Token[] | undefined, style: Style = {}): Run[] {
  const runs: Run[] = [];
  for (const token of tokens ?? []) {
    switch (token.type) {
      case "strong":
        runs.push(...inline(token.tokens, { ...style, bold: true }));
        break;
      case "em":
        runs.push(...inline(token.tokens, { ...style, italic: true }));
        break;
      case "del":
        runs.push(...inline(token.tokens, { ...style, strike: true }));
        break;
      case "codespan":
        runs.push({ ...style, code: true, text: decodeEntities(token.text) });
        break;
      case "link": {
        const link = safeLink(token.href);
        runs.push(...inline(token.tokens, link ? { ...style, link } : style));
        break;
      }
      case "image":
        // Images are never fetched (privacy, and the file may reference anything); keep their alt text.
        if (token.text) runs.push({ ...style, italic: true, text: `[${decodeEntities(token.text)}]` });
        break;
      case "br":
        runs.push({ ...style, text: "\n" });
        break;
      case "html":
        // Raw HTML is not rendered.
        break;
      case "text":
        if ("tokens" in token && token.tokens?.length) runs.push(...inline(token.tokens, style));
        else runs.push({ ...style, text: decodeEntities(token.text) });
        break;
      default:
        if ("text" in token && typeof token.text === "string")
          runs.push({ ...style, text: decodeEntities(token.text) });
    }
  }
  return runs;
}

function listItem(item: Tokens.ListItem): ListItem {
  const checkbox = item.tokens.find((t) => t.type === "checkbox") as Tokens.Checkbox | undefined;
  return {
    checked: item.task ? (checkbox?.checked ?? Boolean(item.checked)) : null,
    blocks: blocks(item.tokens.filter((t) => t.type !== "checkbox")),
  };
}

function blocks(tokens: Token[]): Block[] {
  const out: Block[] = [];
  for (const token of tokens) {
    switch (token.type) {
      case "heading":
        out.push({ type: "heading", level: Math.min(6, Math.max(1, token.depth)) as 1, runs: inline(token.tokens) });
        break;
      case "paragraph":
      case "text":
        out.push({
          type: "paragraph",
          runs: inline(token.tokens ?? [{ type: "text", raw: token.raw, text: token.text }]),
        });
        break;
      case "list":
        out.push({
          type: "list",
          ordered: token.ordered,
          start: typeof token.start === "number" ? token.start : 1,
          items: token.items.map(listItem),
        });
        break;
      case "blockquote":
        out.push({ type: "quote", blocks: blocks(token.tokens ?? []) });
        break;
      case "code":
        out.push({ type: "code", text: token.text.replace(/\t/g, "    ") });
        break;
      case "hr":
        out.push({ type: "rule" });
        break;
      case "table":
        out.push({
          type: "table",
          align: token.align,
          header: token.header.map((cell: Tokens.TableCell) => inline(cell.tokens)),
          rows: token.rows.map((row: Tokens.TableCell[]) => row.map((cell) => inline(cell.tokens))),
        });
        break;
      // space, html blocks, link definitions: nothing to draw.
    }
  }
  return out;
}

/** Parses GitHub-flavoured Markdown into the blocks the layout understands. */
export function parseMarkdown(markdown: string): Block[] {
  const source = markdown.replace(/^﻿/, "").replace(/\r\n?/g, "\n");
  return blocks(Lexer.lex(source, { gfm: true }));
}
