/** Font faces drawn into PDFs. */
export type FontFace = "regular" | "bold" | "italic" | "boldItalic" | "mono";

/** Files in `public/fonts` (reduced with fonttools, see AGENTS.md); one place for the browser and tests. */
export const FONT_FILES: Record<FontFace, string> = {
  regular: "Inter-400.ttf",
  bold: "Inter-700.ttf",
  italic: "Inter-400-italic.ttf",
  boldItalic: "Inter-700-italic.ttf",
  mono: "JetBrainsMono-400.ttf",
};
