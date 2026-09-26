"use client";

import { useEffect } from "react";
import { useRuntime } from "@/components/tool/runtime";
import { TextInput } from "@/components/tool/ui";
import { readBytes } from "@/lib/files";
import type { PdfMetadata } from "@/pdf/ops/metadata";
import { pdfOutput } from "./output";
import type { BrowserTool, ToolViewProps } from "./types";

export type MetadataOptions = PdfMetadata & { loaded: boolean };

const FIELDS = ["title", "author", "subject", "keywords", "creator"] as const;

function pickMetadata(source: PdfMetadata): PdfMetadata {
  return Object.fromEntries(FIELDS.map((f) => [f, source[f]])) as unknown as PdfMetadata;
}

function Options({ files, options, setOptions }: ToolViewProps<MetadataOptions>) {
  const { dict, engine } = useRuntime();
  const t = dict.toolUi.metadata;
  const file = files[0];
  const { loaded } = options;

  // Prefill the form with the document's current properties.
  useEffect(() => {
    if (!file || loaded) return;
    let cancelled = false;
    readBytes(file)
      .then((bytes) => engine.readMetadata(bytes))
      .then((meta) => !cancelled && setOptions({ ...pickMetadata(meta), loaded: true }))
      // Unreadable files still get an empty form; the real error is shown when the tool runs.
      .catch(() => !cancelled && setOptions({ loaded: true }));
    return () => {
      cancelled = true;
    };
  }, [file, loaded, engine, setOptions]);

  return (
    <>
      {FIELDS.map((field) => (
        <TextInput
          key={field}
          label={t[field]}
          value={options[field]}
          onChange={(e) => setOptions({ [field]: e.target.value })}
        />
      ))}
    </>
  );
}

const metadata: BrowserTool<MetadataOptions> = {
  initialOptions: () => ({ title: "", author: "", subject: "", keywords: "", creator: "", loaded: false }),
  Options,
  async run({ files: [file], options }, { engine, dict }) {
    const bytes = await engine.writeMetadata(await readBytes(file), pickMetadata(options));
    return [pdfOutput(file.name, dict.toolUi.metadata.output, bytes)];
  },
};

export default metadata;
