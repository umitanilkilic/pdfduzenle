import type { ComponentType } from "react";
import type { Dictionary } from "@/i18n";
import type { Locale } from "@/i18n/config";
import type { PdfEngine } from "@/pdf/engine";

export interface OutputFile {
  name: string;
  bytes: Uint8Array;
  type: string;
}

export interface ToolServices {
  engine: PdfEngine;
  /** TrueType font with Turkish glyphs for text drawn into PDFs. */
  loadFont(): Promise<Uint8Array>;
  dict: Dictionary;
  locale: Locale;
}

export interface ToolViewProps<O> {
  files: File[];
  setFiles(files: File[]): void;
  options: O;
  setOptions(update: Partial<O>): void;
}

/**
 * A tool that runs entirely in the browser. The shell owns file selection, progress and results;
 * a tool only describes its options, optional custom views and how to turn inputs into outputs.
 */
export interface BrowserTool<O> {
  initialOptions(services: ToolServices): O;
  /** Replaces the default file list, e.g. with a page grid. */
  Main?: ComponentType<ToolViewProps<O>>;
  /** Controls shown in the side panel. */
  Options?: ComponentType<ToolViewProps<O>>;
  run(input: { files: File[]; options: O }, services: ToolServices): Promise<OutputFile[]>;
}
