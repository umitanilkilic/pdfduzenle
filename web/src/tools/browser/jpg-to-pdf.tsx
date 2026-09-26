"use client";

import { useRuntime } from "@/components/tool/runtime";
import { Choice } from "@/components/tool/ui";
import type { ImagesToPdfOptions } from "@/pdf/ops/images";
import { toEmbeddableImage } from "./images";
import { pdfOutput } from "./output";
import type { BrowserTool, ToolViewProps } from "./types";

function Options({ options, setOptions }: ToolViewProps<ImagesToPdfOptions>) {
  const { dict } = useRuntime();
  const t = dict.toolUi["jpg-to-pdf"];
  return (
    <>
      <Choice
        label={t.pageSize}
        columns={3}
        value={options.pageSize}
        onChange={(pageSize) => setOptions({ pageSize })}
        options={[
          { value: "a4", label: t.a4 },
          { value: "letter", label: t.letter },
          { value: "fit", label: t.fit },
        ]}
      />
      {options.pageSize !== "fit" && (
        <Choice
          label={t.orientation}
          columns={3}
          value={options.orientation}
          onChange={(orientation) => setOptions({ orientation })}
          options={[
            { value: "auto", label: t.auto },
            { value: "portrait", label: t.portrait },
            { value: "landscape", label: t.landscape },
          ]}
        />
      )}
      <Choice
        label={t.margin}
        columns={3}
        value={options.marginMm}
        onChange={(marginMm) => setOptions({ marginMm })}
        options={[
          { value: 0, label: t.marginNone },
          { value: 10, label: t.marginSmall },
          { value: 25, label: t.marginLarge },
        ]}
      />
    </>
  );
}

const jpgToPdf: BrowserTool<ImagesToPdfOptions> = {
  initialOptions: () => ({ pageSize: "a4", orientation: "auto", marginMm: 10 }),
  Options,
  async run({ files, options }, { engine, dict }) {
    const images = await Promise.all(files.map(toEmbeddableImage));
    return [pdfOutput(files[0].name, dict.toolUi["jpg-to-pdf"].output, await engine.imagesToPdf(images, options))];
  },
};

export default jpgToPdf;
