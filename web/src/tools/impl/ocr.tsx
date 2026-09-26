"use client";

import { useRuntime } from "@/components/tool/runtime";
import { Choice } from "@/components/tool/ui";
import { createServerTool } from "./server";
import type { ToolViewProps } from "./types";

export interface OcrOptions {
  output: "pdf" | "docx" | "txt";
  languages: "tur+eng" | "tur" | "eng";
  engine: "auto" | "fast";
}

function Options({ options, setOptions }: ToolViewProps<OcrOptions>) {
  const { dict } = useRuntime();
  const t = dict.toolUi.ocr;
  return (
    <>
      <Choice
        label={t.mode}
        value={options.engine}
        onChange={(engine) => setOptions({ engine })}
        options={[
          { value: "auto", label: t.modeAuto },
          { value: "fast", label: t.modeFast },
        ]}
      />
      {options.engine === "auto" && <p className="text-muted text-xs leading-relaxed">{t.autoNote}</p>}
      <Choice
        label={t.format}
        value={options.output}
        onChange={(output) => setOptions({ output })}
        options={[
          { value: "pdf", label: t.formatPdf },
          { value: "docx", label: t.formatDocx },
          { value: "txt", label: t.formatTxt },
        ]}
      />
      <Choice
        label={t.language}
        value={options.languages}
        onChange={(languages) => setOptions({ languages })}
        options={[
          { value: "tur+eng", label: t.langBoth },
          { value: "tur", label: t.langTr },
          { value: "eng", label: t.langEn },
        ]}
      />
    </>
  );
}

export default createServerTool<OcrOptions>({
  id: "ocr",
  initialOptions: () => ({ output: "pdf", languages: "tur+eng", engine: "auto" }),
  Options,
  fields: (o) => ({ output: o.output, languages: o.languages, engine: o.engine }),
  suffix: ({ dict }) => dict.toolUi.ocr.output,
});
