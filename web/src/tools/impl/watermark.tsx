"use client";

import { PageImage } from "@/components/tool/PageImage";
import { PdfPreviewGate } from "@/components/tool/PdfPreviewGate";
import { useRuntime } from "@/components/tool/runtime";
import { Choice, Field, Slider, TextInput } from "@/components/tool/ui";
import { useFileThumbnail } from "@/components/tool/useFileThumbnail";
import { usePageSize } from "@/components/tool/usePageSize";
import type { PdfPreview } from "@/components/tool/usePdfDocument";
import { format } from "@/i18n";
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

function WatermarkPreview({ preview, options: o }: { preview: PdfPreview; options: WatermarkOptions }) {
  const { dict } = useRuntime();
  const size = usePageSize(preview, 0);
  const imageUrl = useFileThumbnail(o.kind === "image" ? o.image : null, 1200);
  // Centred like the engine; CSS rotates clockwise, the PDF counter-clockwise.
  const style = {
    left: "50%",
    top: "50%",
    opacity: o.opacity,
    transform: `translate(-50%, -50%) rotate(${-o.angle}deg)`,
  };

  return (
    <>
      <PageImage thumbs={preview.thumbs} index={0} alt={format(dict.ui.page, { n: 1 })}>
        {size && (
          <div className="[container-type:size] pointer-events-none absolute inset-0 overflow-hidden" aria-hidden>
            {o.kind === "text"
              ? o.text.trim() && (
                  <span
                    data-testid="preview-overlay"
                    className="absolute leading-none whitespace-nowrap"
                    style={{ ...style, color: o.color, fontSize: `${(o.fontSize / size.width) * 100}cqw` }}
                  >
                    {o.text}
                  </span>
                )
              : imageUrl && (
                  // eslint-disable-next-line @next/next/no-img-element -- blob URL rendered in the browser
                  <img
                    src={imageUrl}
                    alt=""
                    data-testid="preview-overlay"
                    className="absolute max-w-none"
                    style={{ ...style, width: `${o.scale * 100}%` }}
                  />
                )}
          </div>
        )}
      </PageImage>
      <p className="text-muted mt-3 text-center text-sm">{dict.toolUi.watermark.preview}</p>
    </>
  );
}

function Main({ files, options }: ToolViewProps<WatermarkOptions>) {
  return (
    <PdfPreviewGate file={files[0]}>
      {(preview) => <WatermarkPreview preview={preview} options={options} />}
    </PdfPreviewGate>
  );
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
  Main,
  Options,
  async run({ files: [file], options }, { engine, loadFont, dict }) {
    const bytes = await engine.addWatermark(await readBytes(file), await toEngineOptions(options), await loadFont());
    return [pdfOutput(file.name, dict.toolUi.watermark.output, bytes)];
  },
};

export default watermark;
