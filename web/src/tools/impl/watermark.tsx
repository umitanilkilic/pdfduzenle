"use client";

import { useRuntime } from "@/components/tool/runtime";
import { Choice, Field, Slider, TextInput } from "@/components/tool/ui";
import { readBytes } from "@/lib/files";
import { PdfToolError } from "@/pdf/errors";
import type { WatermarkOptions as EngineOptions } from "@/pdf/ops/stamp";
import { toEmbeddableImage } from "./shared/images";
import { pdfOutput } from "./shared/output";
import type { ToolImpl, ToolViewProps } from "./shared/types";

export interface WatermarkOptions {
  kind: "text" | "image";
  text: string;
  fontSize: number;
  color: string;
  opacity: number;
  angle: number;
  image: File | null;
  scale: number;
}

function Options({ options, setOptions }: ToolViewProps<WatermarkOptions>) {
  const { dict } = useRuntime();
  const t = dict.toolUi.watermark;
  const percent = (v: number) => `${Math.round(v * 100)}%`;
  return (
    <>
      <Choice
        label={t.kind}
        columns={2}
        value={options.kind}
        onChange={(kind) => setOptions({ kind })}
        options={[
          { value: "text", label: t.kindText },
          { value: "image", label: t.kindImage },
        ]}
      />
      {options.kind === "text" ? (
        <>
          <TextInput label={t.text} value={options.text} onChange={(e) => setOptions({ text: e.target.value })} />
          <Slider
            label={t.fontSize}
            min={12}
            max={120}
            value={options.fontSize}
            onChange={(fontSize) => setOptions({ fontSize })}
          />
          <Field label={t.color}>
            <input
              type="color"
              aria-label={t.color}
              value={options.color}
              onChange={(e) => setOptions({ color: e.target.value })}
              className="border-border bg-surface h-10 w-16 cursor-pointer rounded-lg border"
            />
          </Field>
        </>
      ) : (
        <>
          <Field label={t.image}>
            <input
              type="file"
              accept="image/png,image/jpeg,image/webp"
              onChange={(e) => setOptions({ image: e.target.files?.[0] ?? null })}
              className="file:bg-brand-soft file:text-brand block w-full text-sm file:mr-3 file:rounded-full file:border-0 file:px-4 file:py-2 file:font-semibold"
            />
          </Field>
          <Slider
            label={t.scale}
            min={0.1}
            max={1}
            step={0.05}
            value={options.scale}
            format={percent}
            onChange={(scale) => setOptions({ scale })}
          />
        </>
      )}
      <Slider
        label={t.opacity}
        min={0.05}
        max={1}
        step={0.05}
        value={options.opacity}
        format={percent}
        onChange={(opacity) => setOptions({ opacity })}
      />
      <Slider
        label={t.angle}
        min={-90}
        max={90}
        step={5}
        value={options.angle}
        format={(v) => `${v}°`}
        onChange={(angle) => setOptions({ angle })}
      />
    </>
  );
}

async function toEngineOptions(o: WatermarkOptions): Promise<EngineOptions> {
  const base = { opacity: o.opacity, angle: o.angle };
  if (o.kind === "text") return { ...base, kind: "text", text: o.text, fontSize: o.fontSize, color: o.color };
  if (!o.image) throw new PdfToolError("noFiles");
  const image = await toEmbeddableImage(o.image);
  return { ...base, kind: "image", image: image.bytes, mime: image.mime, scale: o.scale };
}

const watermark: ToolImpl<WatermarkOptions> = {
  initialOptions: ({ dict }) => ({
    kind: "text",
    text: dict.toolUi.watermark.defaultText,
    fontSize: 60,
    color: "#e0402f",
    opacity: 0.3,
    angle: 45,
    image: null,
    scale: 0.5,
  }),
  Options,
  async run({ files: [file], options }, { engine, loadFont, dict }) {
    const bytes = await engine.addWatermark(await readBytes(file), await toEngineOptions(options), await loadFont());
    return [pdfOutput(file.name, dict.toolUi.watermark.output, bytes)];
  },
};

export default watermark;
