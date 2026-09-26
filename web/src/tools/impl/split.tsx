"use client";

import { useRuntime } from "@/components/tool/runtime";
import { Choice, NumberInput, TextInput } from "@/components/tool/ui";
import { readBytes } from "@/lib/files";
import { parsePageGroups } from "@/pdf/pageRanges";
import { chunkGroups, everyPageGroups } from "@/pdf/ops/pages";
import { pdfOutput } from "./output";
import type { ToolImpl, ToolViewProps } from "./types";

export interface SplitOptions {
  mode: "ranges" | "every" | "chunk";
  ranges: string;
  chunk: number;
}

function Options({ options, setOptions }: ToolViewProps<SplitOptions>) {
  const { dict } = useRuntime();
  const t = dict.toolUi.split;
  return (
    <>
      <Choice
        label={t.mode}
        value={options.mode}
        onChange={(mode) => setOptions({ mode })}
        options={[
          { value: "ranges", label: t.modeRanges },
          { value: "every", label: t.modeEvery },
          { value: "chunk", label: t.modeChunk },
        ]}
      />
      {options.mode === "ranges" && (
        <TextInput
          label={dict.ui.pagesInput}
          placeholder={dict.ui.pagesPlaceholder}
          hint={t.rangesHelp}
          value={options.ranges}
          onChange={(e) => setOptions({ ranges: e.target.value })}
        />
      )}
      {options.mode === "chunk" && (
        <NumberInput label={t.chunkSize} min={1} value={options.chunk} onChange={(chunk) => setOptions({ chunk })} />
      )}
    </>
  );
}

const split: ToolImpl<SplitOptions> = {
  initialOptions: () => ({ mode: "ranges", ranges: "", chunk: 1 }),
  Options,
  async run({ files: [file], options }, { engine, dict }) {
    const bytes = await readBytes(file);
    const count = await engine.pageCount(bytes);
    const groups =
      options.mode === "every"
        ? everyPageGroups(count)
        : options.mode === "chunk"
          ? chunkGroups(count, options.chunk)
          : parsePageGroups(options.ranges, count);
    const parts = await engine.splitPdf(bytes, groups);
    return parts.map((part, i) => pdfOutput(file.name, dict.toolUi.split.output, part, i + 1));
  },
};

export default split;
