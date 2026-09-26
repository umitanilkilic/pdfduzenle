"use client";

import { useRuntime } from "@/components/tool/runtime";
import { Choice } from "@/components/tool/ui";
import { createServerTool } from "./shared/server";
import type { ToolViewProps } from "./shared/types";

export interface PdfaOptions {
  version: "1" | "2" | "3";
}

function Options({ options, setOptions }: ToolViewProps<PdfaOptions>) {
  const { dict } = useRuntime();
  const t = dict.toolUi["pdf-to-pdfa"];
  return (
    <Choice
      label={t.version}
      value={options.version}
      onChange={(version) => setOptions({ version })}
      options={[
        { value: "2", label: t.v2 },
        { value: "1", label: t.v1 },
        { value: "3", label: t.v3 },
      ]}
    />
  );
}

export default createServerTool<PdfaOptions>({
  id: "pdf-to-pdfa",
  initialOptions: () => ({ version: "2" }),
  Options,
  fields: (o) => ({ version: o.version }),
  suffix: ({ dict }) => dict.toolUi["pdf-to-pdfa"].output,
});
