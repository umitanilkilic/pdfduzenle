import { readBytes } from "@/lib/files";
import { pdfOutput } from "./output";
import type { BrowserTool } from "./types";

const merge: BrowserTool<Record<string, never>> = {
  initialOptions: () => ({}),
  async run({ files }, { engine, dict }) {
    const bytes = await engine.mergePdfs(await Promise.all(files.map(readBytes)));
    return [pdfOutput(files[0].name, dict.toolUi.merge.output, bytes)];
  },
};

export default merge;
