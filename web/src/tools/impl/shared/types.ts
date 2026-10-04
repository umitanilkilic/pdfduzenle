import type { ComponentType } from "react";
import type { GatewayClient, JobStage } from "@/api/gateway";
import type { Dictionary } from "@/i18n";
import type { Locale } from "@/i18n/config";
import type { PdfEngine } from "@/pdf/engine";
import type { FontFace } from "@/pdf/fonts";

export interface OutputFile {
  name: string;
  bytes: Uint8Array;
  type: string;
  /** Size of the input this output came from, to show savings (compression). */
  originalSize?: number;
}

export type ErrorKey = keyof Dictionary["errors"];

export interface ToolServices {
  engine: PdfEngine;
  gateway: GatewayClient;
  /** TrueType font with Turkish glyphs for text drawn into PDFs (Inter regular by default). */
  loadFont(face?: FontFace): Promise<Uint8Array>;
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
export interface ToolImpl<O> {
  initialOptions(services: ToolServices): O;
  /** Replaces the default file list, e.g. with a page grid. */
  Main?: ComponentType<ToolViewProps<O>>;
  /** Controls shown in the side panel. */
  Options?: ComponentType<ToolViewProps<O>>;
  /** Returns an error to show instead of running, e.g. when two passwords differ. */
  validate?(options: O): ErrorKey | null;
  run(
    input: { files: File[]; options: O; report(stage: JobStage): void },
    services: ToolServices,
  ): Promise<OutputFile[]>;
}
