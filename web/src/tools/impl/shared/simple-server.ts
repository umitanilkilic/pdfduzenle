import type { ToolId } from "../../registry";
import { createServerTool } from "./server";

type SimpleServerToolId = "repair" | "word-to-pdf" | "excel-to-pdf" | "powerpoint-to-pdf" | "pdf-to-word";

/** Server tools without options. */
export function simpleServerTool(id: SimpleServerToolId & ToolId) {
  return createServerTool<Record<string, never>>({
    id,
    initialOptions: () => ({}),
    suffix: ({ dict }) => dict.toolUi[id].output,
  });
}
