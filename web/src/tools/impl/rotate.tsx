"use client";

import { useRuntime } from "@/components/tool/runtime";
import { Choice } from "@/components/tool/ui";
import { readBytes } from "@/lib/files";
import type { Rotation } from "@/pdf/geometry";
import { pdfOutput } from "./output";
import type { ToolImpl, ToolViewProps } from "./types";

export interface RotateOptions {
  angle: Rotation;
}

function Options({ options, setOptions }: ToolViewProps<RotateOptions>) {
  const { dict } = useRuntime();
  const t = dict.toolUi.rotate;
  return (
    <Choice
      label={t.angle}
      value={options.angle}
      onChange={(angle) => setOptions({ angle })}
      options={[
        { value: 90, label: t.right },
        { value: 270, label: t.left },
        { value: 180, label: t.half },
      ]}
    />
  );
}

const rotate: ToolImpl<RotateOptions> = {
  initialOptions: () => ({ angle: 90 }),
  Options,
  async run({ files, options }, { engine, dict }) {
    const outputs = [];
    for (const file of files) {
      const bytes = await engine.rotatePages(await readBytes(file), options.angle);
      outputs.push(pdfOutput(file.name, dict.toolUi.rotate.output, bytes));
    }
    return outputs;
  },
};

export default rotate;
