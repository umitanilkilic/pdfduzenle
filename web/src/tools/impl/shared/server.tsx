import type { ComponentType } from "react";
import { runJob } from "@/api/gateway";
import { outputName } from "@/lib/files";
import type { ToolId } from "../../registry";
import type { ErrorKey, OutputFile, ToolImpl, ToolServices, ToolViewProps } from "./types";

interface ServerToolConfig<O> {
  /** Gateway tool ID (matches the registry ID). */
  id: ToolId;
  initialOptions(services: ToolServices): O;
  Options?: ComponentType<ToolViewProps<O>>;
  validate?(options: O): ErrorKey | null;
  /** Form fields sent to the gateway. */
  fields?(options: O): Record<string, string>;
  /** Output name suffix from `dict.toolUi[id].output`. */
  suffix(services: ToolServices): string;
}

const EXTENSIONS: Record<string, string> = {
  "application/pdf": "pdf",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document": "docx",
  "text/plain": "txt",
};

/** "text/plain; charset=utf-8" → "txt". */
export function extensionFor(contentType: string): string {
  return EXTENSIONS[contentType.split(";")[0].trim().toLowerCase()] ?? "pdf";
}

/** A tool processed by the gateway: upload → wait → download, one output per input file. */
export function createServerTool<O>(config: ServerToolConfig<O>): ToolImpl<O> {
  return {
    initialOptions: config.initialOptions,
    Options: config.Options,
    validate: config.validate,
    async run({ files, options, report }, services) {
      const results = await runJob(services.gateway, config.id, files, config.fields?.(options) ?? {}, {
        onStage: report,
      });
      const suffix = config.suffix(services);
      return results.map(({ output, bytes }, i): OutputFile => {
        const source = files[i] ?? files[0];
        const ext = extensionFor(output.contentType);
        return {
          name: outputName(source.name, suffix, ext, results.length > 1 && files.length === 1 ? i + 1 : undefined),
          bytes,
          type: output.contentType,
          originalSize: source.size,
        };
      });
    },
  };
}
