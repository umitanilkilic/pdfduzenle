"use client";

import { useEffect, useState } from "react";
import { PageImage } from "@/components/tool/PageImage";
import { PdfPreviewGate } from "@/components/tool/PdfPreviewGate";
import { useRuntime } from "@/components/tool/runtime";
import type { PdfPreview } from "@/components/tool/usePdfDocument";
import { NumberInput } from "@/components/tool/ui";
import { format } from "@/i18n";
import { readBytes } from "@/lib/files";
import { MM_TO_PT, type Margins } from "@/pdf/geometry";
import { pdfOutput } from "./shared/output";
import type { ToolImpl, ToolViewProps } from "./shared/types";

export type CropOptions = Margins;

const SIDES = ["top", "right", "bottom", "left"] as const;

/** Clamps each margin to a finite, non-negative number. */
export function sanitizeMargins(m: Margins): Margins {
  const clean = (v: number) => (Number.isFinite(v) && v > 0 ? v : 0);
  return { top: clean(m.top), right: clean(m.right), bottom: clean(m.bottom), left: clean(m.left) };
}

function CropOverlay({ preview, margins }: { preview: PdfPreview; margins: Margins }) {
  const { dict } = useRuntime();
  const [sizeMm, setSizeMm] = useState<{ width: number; height: number } | null>(null);

  useEffect(() => {
    let cancelled = false;
    preview.doc
      .pageSize(0)
      .then((s) => !cancelled && setSizeMm({ width: s.width / MM_TO_PT, height: s.height / MM_TO_PT }));
    return () => {
      cancelled = true;
    };
  }, [preview]);

  const m = sanitizeMargins(margins);
  const pct = (v: number, total: number) => `${Math.min(100, (v / total) * 100)}%`;
  const shade = "absolute bg-danger/35";

  return (
    <>
      <PageImage thumbs={preview.thumbs} index={0} alt={format(dict.ui.page, { n: 1 })}>
        {sizeMm && (
          <div className="pointer-events-none absolute inset-0" aria-hidden>
            <div className={`${shade} inset-x-0 top-0`} style={{ height: pct(m.top, sizeMm.height) }} />
            <div className={`${shade} inset-x-0 bottom-0`} style={{ height: pct(m.bottom, sizeMm.height) }} />
            <div className={`${shade} inset-y-0 left-0`} style={{ width: pct(m.left, sizeMm.width) }} />
            <div className={`${shade} inset-y-0 right-0`} style={{ width: pct(m.right, sizeMm.width) }} />
          </div>
        )}
      </PageImage>
      <p className="text-muted mt-3 text-center text-sm">{dict.toolUi.crop.preview}</p>
    </>
  );
}

function Main({ files, options }: ToolViewProps<CropOptions>) {
  return (
    <PdfPreviewGate file={files[0]}>{(preview) => <CropOverlay preview={preview} margins={options} />}</PdfPreviewGate>
  );
}

function Options({ options, setOptions }: ToolViewProps<CropOptions>) {
  const { dict } = useRuntime();
  const t = dict.toolUi.crop;
  return (
    <div className="space-y-3">
      <p className="text-sm font-semibold">{t.margins}</p>
      <div className="grid grid-cols-2 gap-3">
        {SIDES.map((side) => (
          <NumberInput
            key={side}
            label={t[side]}
            min={0}
            step={1}
            value={options[side]}
            onChange={(v) => setOptions({ [side]: v })}
          />
        ))}
      </div>
    </div>
  );
}

const crop: ToolImpl<CropOptions> = {
  initialOptions: () => ({ top: 10, right: 10, bottom: 10, left: 10 }),
  Main,
  Options,
  async run({ files: [file], options }, { engine, dict }) {
    const bytes = await engine.cropPdf(await readBytes(file), sanitizeMargins(options));
    return [pdfOutput(file.name, dict.toolUi.crop.output, bytes)];
  },
};

export default crop;
