"use client";

import { useRuntime } from "@/components/tool/runtime";
import { Choice } from "@/components/tool/ui";
import { createServerTool } from "./shared/server";
import type { ToolViewProps } from "./shared/types";

export interface CompressOptions {
  level: "recommended" | "strong" | "low";
}

function Options({ options, setOptions }: ToolViewProps<CompressOptions>) {
  const { dict } = useRuntime();
  const t = dict.toolUi.compress;
  return (
    <Choice
      label={t.level}
      value={options.level}
      onChange={(level) => setOptions({ level })}
      options={[
        { value: "recommended", label: t.recommended },
        { value: "strong", label: t.strong },
        { value: "low", label: t.low },
      ]}
    />
  );
}

export default createServerTool<CompressOptions>({
  id: "compress",
  initialOptions: () => ({ level: "recommended" }),
  Options,
  fields: (o) => ({ level: o.level }),
  suffix: ({ dict }) => dict.toolUi.compress.output,
});
