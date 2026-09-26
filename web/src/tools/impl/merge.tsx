import { readBytes } from "@/lib/files";
import { pdfOutput } from "./shared/output";
import type { ToolImpl } from "./shared/types";

const merge: ToolImpl<Record<string, never>> = {
  initialOptions: () => ({}),
  async run({ files }, { engine, dict }) {
    const bytes = await engine.mergePdfs(await Promise.all(files.map(readBytes)));
    return [pdfOutput(files[0].name, dict.toolUi.merge.output, bytes)];
  },
};

export default merge;
