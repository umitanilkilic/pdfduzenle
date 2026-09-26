"use client";

import { PageImage } from "@/components/tool/PageImage";
import { PdfPreviewGate } from "@/components/tool/PdfPreviewGate";
import { useRuntime } from "@/components/tool/runtime";
import { Checkbox, Choice, NumberInput } from "@/components/tool/ui";
import { usePageSize } from "@/components/tool/usePageSize";
import type { PdfPreview } from "@/components/tool/usePdfDocument";
import { format } from "@/i18n";
import { readBytes } from "@/lib/files";
import type { HorizontalPosition, PageNumberOptions, VerticalPosition } from "@/pdf/ops/stamp";
import { pageLabel } from "@/pdf/pageLabels";
import { pdfOutput } from "./shared/output";
import type { ToolImpl, ToolViewProps } from "./shared/types";

export interface PageNumbersOptions {
  vertical: VerticalPosition;
  horizontal: HorizontalPosition;
  template: string;
  start: number;
  skipFirst: boolean;
  fontSize: number;
}

/** What the engine draws; the live preview mirrors it. */
export function toEngineOptions(o: PageNumbersOptions): PageNumberOptions {
  return {
    vertical: o.vertical,
    horizontal: o.horizontal,
    template: o.template,
    start: Number.isFinite(o.start) ? o.start : 1,
    firstPage: o.skipFirst ? 1 : 0,
    fontSize: Number.isFinite(o.fontSize) && o.fontSize > 0 ? o.fontSize : 11,
    margin: 24,
    color: "#222222",
  };
}

function NumbersPreview({ preview, options }: { preview: PdfPreview; options: PageNumbersOptions }) {
  const { dict } = useRuntime();
  const o = toEngineOptions(options);
  const { pageCount } = preview.doc;
  const index = Math.min(o.firstPage, pageCount - 1);
  const size = usePageSize(preview, index);
  const label = pageLabel(index, pageCount, o);
  const pct = (v: number, total: number) => `${(v / total) * 100}%`;

  return (
    <>
      <PageImage thumbs={preview.thumbs} index={index} alt={format(dict.ui.page, { n: index + 1 })}>
        {size && label !== null && (
          <div className="[container-type:size] pointer-events-none absolute inset-0 overflow-hidden" aria-hidden>
            <span
              data-testid="preview-overlay"
              className="absolute leading-none whitespace-nowrap"
              style={{
                color: o.color,
                fontSize: `${(o.fontSize / size.width) * 100}cqw`,
                [o.vertical]: pct(o.margin, size.height),
                ...(o.horizontal === "center"
                  ? { left: "50%", transform: "translateX(-50%)" }
                  : { [o.horizontal]: pct(o.margin, size.width) }),
              }}
            >
              {label}
            </span>
          </div>
        )}
      </PageImage>
      <p className="text-muted mt-3 text-center text-sm">
        {format(dict.toolUi["page-numbers"].preview, { n: index + 1 })}
      </p>
    </>
  );
}

function Main({ files, options }: ToolViewProps<PageNumbersOptions>) {
  return (
    <PdfPreviewGate file={files[0]}>
      {(preview) => <NumbersPreview preview={preview} options={options} />}
    </PdfPreviewGate>
  );
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

const pageNumbers: ToolImpl<PageNumbersOptions> = {
  initialOptions: ({ dict }) => ({
    vertical: "bottom",
    horizontal: "center",
    template: dict.toolUi["page-numbers"].templates[0],
    start: 1,
    skipFirst: false,
    fontSize: 11,
  }),
  Main,
  Options,
  async run({ files: [file], options }, { engine, loadFont, dict }) {
    const bytes = await engine.addPageNumbers(await readBytes(file), toEngineOptions(options), await loadFont());
    return [pdfOutput(file.name, dict.toolUi["page-numbers"].output, bytes)];
  },
};

export default pageNumbers;
