"use client";

import { useRuntime } from "@/components/tool/runtime";
import { Checkbox, Choice, NumberInput } from "@/components/tool/ui";
import { readBytes } from "@/lib/files";
import type { HorizontalPosition, VerticalPosition } from "@/pdf/ops/stamp";
import { pdfOutput } from "./output";
import type { BrowserTool, ToolViewProps } from "./types";

export interface PageNumbersOptions {
  vertical: VerticalPosition;
  horizontal: HorizontalPosition;
  template: string;
  start: number;
  skipFirst: boolean;
  fontSize: number;
}

function Options({ options, setOptions }: ToolViewProps<PageNumbersOptions>) {
  const { dict } = useRuntime();
  const t = dict.toolUi["page-numbers"];
  const example = (tpl: string) => tpl.replace("{n}", "1").replace("{total}", "12");
  return (
    <>
      <Choice
        label={t.position}
        columns={2}
        value={options.vertical}
        onChange={(vertical) => setOptions({ vertical })}
        options={[
          { value: "top", label: t.top },
          { value: "bottom", label: t.bottom },
        ]}
      />
      <Choice
        label=""
        columns={3}
        value={options.horizontal}
        onChange={(horizontal) => setOptions({ horizontal })}
        options={[
          { value: "left", label: t.left },
          { value: "center", label: t.center },
          { value: "right", label: t.right },
        ]}
      />
      <Choice
        label={t.format}
        columns={2}
        value={options.template}
        onChange={(template) => setOptions({ template })}
        options={t.templates.map((tpl) => ({ value: tpl, label: example(tpl) }))}
      />
      <div className="grid grid-cols-2 gap-3">
        <NumberInput label={t.start} min={0} value={options.start} onChange={(start) => setOptions({ start })} />
        <NumberInput
          label={t.fontSize}
          min={6}
          max={48}
          value={options.fontSize}
          onChange={(fontSize) => setOptions({ fontSize })}
        />
      </div>
      <Checkbox label={t.skipFirst} checked={options.skipFirst} onChange={(skipFirst) => setOptions({ skipFirst })} />
    </>
  );
}

const pageNumbers: BrowserTool<PageNumbersOptions> = {
  initialOptions: ({ dict }) => ({
    vertical: "bottom",
    horizontal: "center",
    template: dict.toolUi["page-numbers"].templates[0],
    start: 1,
    skipFirst: false,
    fontSize: 11,
  }),
  Options,
  async run({ files: [file], options }, { engine, loadFont, dict }) {
    const bytes = await engine.addPageNumbers(
      await readBytes(file),
      {
        vertical: options.vertical,
        horizontal: options.horizontal,
        template: options.template,
        start: Number.isFinite(options.start) ? options.start : 1,
        firstPage: options.skipFirst ? 1 : 0,
        fontSize: Number.isFinite(options.fontSize) ? options.fontSize : 11,
        margin: 24,
        color: "#222222",
      },
      await loadFont(),
    );
    return [pdfOutput(file.name, dict.toolUi["page-numbers"].output, bytes)];
  },
};

export default pageNumbers;
