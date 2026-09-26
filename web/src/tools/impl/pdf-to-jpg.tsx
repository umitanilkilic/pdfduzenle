"use client";

import { useRuntime } from "@/components/tool/runtime";
import { Choice } from "@/components/tool/ui";
import { outputName, readBytes } from "@/lib/files";
import type { ToolImpl, OutputFile, ToolViewProps } from "./shared/types";

export interface PdfToImageOptions {
  format: "image/jpeg" | "image/png";
  dpi: 72 | 150 | 300;
}

function Options({ options, setOptions }: ToolViewProps<PdfToImageOptions>) {
  const { dict } = useRuntime();
  const t = dict.toolUi["pdf-to-jpg"];
  return (
    <>
      <Choice
        label={t.format}
        columns={2}
        value={options.format}
        onChange={(format) => setOptions({ format })}
        options={[
          { value: "image/jpeg", label: "JPG" },
          { value: "image/png", label: "PNG" },
        ]}
      />
      <Choice
        label={t.quality}
        value={options.dpi}
        onChange={(dpi) => setOptions({ dpi })}
        options={[
          { value: 72, label: t.qualityLow },
          { value: 150, label: t.qualityMedium },
          { value: 300, label: t.qualityHigh },
        ]}
      />
    </>
  );
}

const pdfToJpg: ToolImpl<PdfToImageOptions> = {
  initialOptions: () => ({ format: "image/jpeg", dpi: 150 }),
  Options,
  // Rendering needs a canvas, so this tool uses pdf.js on the page instead of the PDF engine worker.
  async run({ files: [file], options }, { dict }) {
    const { openDocument, canvasToBytes } = await import("@/pdf/render");
    const doc = await openDocument(await readBytes(file));
    const ext = options.format === "image/png" ? "png" : "jpg";
    const outputs: OutputFile[] = [];
    try {
      for (let i = 0; i < doc.pageCount; i++) {
        const canvas = await doc.renderPage(i, { scale: options.dpi / 72 });
        const bytes = await canvasToBytes(canvas, options.format);
        canvas.width = canvas.height = 0; // free the bitmap memory right away
        outputs.push({
          name: outputName(file.name, dict.toolUi["pdf-to-jpg"].output, ext, i + 1),
          bytes,
          type: options.format,
        });
      }
    } finally {
      await doc.destroy();
    }
    return outputs;
  },
};

export default pdfToJpg;
