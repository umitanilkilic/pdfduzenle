import type { ErrorKey } from "@/tools/impl/shared/types";

export type GtagEvent = (command: "event", name: string, params: Record<string, string | number>) => void;

/**
 * Product events. Parameters are tool IDs, error codes and counts only: never file names, contents or
 * anything the visitor typed.
 */
export interface Analytics {
  toolStarted(tool: string, fileCount: number): void;
  toolSucceeded(tool: string, outputCount: number, durationMs: number): void;
  toolFailed(tool: string, code: ErrorKey): void;
  downloaded(tool: string, kind: "file" | "zip"): void;
  nextToolChosen(from: string, to: string): void;
}

/** `gtag` is looked up on every call: it appears only once the analytics script has run (or never). */
export function createAnalytics(gtag: () => GtagEvent | undefined): Analytics {
  const send = (name: string, params: Record<string, string | number>) => gtag()?.("event", name, params);
  return {
    toolStarted: (tool, fileCount) => send("tool_start", { tool_id: tool, file_count: fileCount }),
    toolSucceeded: (tool, outputCount, durationMs) =>
      send("tool_success", { tool_id: tool, output_count: outputCount, duration_ms: Math.round(durationMs) }),
    toolFailed: (tool, code) => send("tool_error", { tool_id: tool, error_code: code }),
    downloaded: (tool, kind) => send("file_download_result", { tool_id: tool, download_kind: kind }),
    nextToolChosen: (from, to) => send("next_tool", { tool_id: from, target_tool: to }),
  };
}
