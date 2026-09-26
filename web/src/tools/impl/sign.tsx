"use client";

import { Caveat } from "next/font/google";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { useCallback, useEffect, useRef } from "react";
import { PageImage } from "@/components/tool/PageImage";
import { PdfPreviewGate } from "@/components/tool/PdfPreviewGate";
import { useRuntime } from "@/components/tool/runtime";
import { SignaturePad, trimmed } from "@/components/tool/SignaturePad";
import type { PdfPreview } from "@/components/tool/usePdfDocument";
import { Checkbox, Choice, Field, IconButton, TextInput } from "@/components/tool/ui";
import { format } from "@/i18n";
import { readBytes } from "@/lib/files";
import { PdfToolError } from "@/pdf/errors";
import { toEmbeddableImage } from "./images";
import { pdfOutput } from "./output";
import { boxHeight, clampBox, placements, type SignatureBox } from "./sign-placement";
import type { ToolImpl, ToolViewProps } from "./types";

const script = Caveat({ subsets: ["latin", "latin-ext"], weight: "600" });
// Only the real face: the generated "Caveat Fallback" face is local() and makes fonts.load() reject.
const SCRIPT_FAMILY = script.style.fontFamily.split(",")[0];

export interface Signature {
  bytes: Uint8Array;
  mime: "image/png" | "image/jpeg";
  /** Object URL for the on-page preview. */
  url: string;
  /** width / height */
  aspect: number;
}

export interface SignOptions {
  source: "draw" | "type" | "upload";
  color: string;
  typed: string;
  signature: Signature | null;
  page: number;
  pageCount: number;
  /** Visual width / height of the page being placed on. */
  pageAspect: number;
  box: SignatureBox;
  allPages: boolean;
}

async function fromCanvas(canvas: HTMLCanvasElement): Promise<Signature> {
  const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, "image/png"));
  if (!blob) throw new Error("toBlob failed");
  return {
    bytes: await readBytes(blob),
    mime: "image/png",
    url: URL.createObjectURL(blob),
    aspect: canvas.width / canvas.height,
  };
}

async function fromText(text: string, color: string): Promise<Signature | null> {
  if (!text.trim()) return null;
  const fontSize = 96;
  const font = `600 ${fontSize}px ${SCRIPT_FAMILY}`;
  await document.fonts.load(font, text);
  const canvas = document.createElement("canvas");
  const ctx = canvas.getContext("2d")!;
  ctx.font = font;
  canvas.width = Math.ceil(ctx.measureText(text).width) + 40;
  canvas.height = fontSize * 1.6;
  ctx.font = font;
  ctx.fillStyle = color;
  ctx.textBaseline = "middle";
  ctx.fillText(text, 20, canvas.height / 2);
  const cropped = trimmed(canvas);
  return cropped ? fromCanvas(cropped) : null;
}

async function fromFile(file: File): Promise<Signature> {
  const image = await toEmbeddableImage(file);
  const bitmap = await createImageBitmap(new Blob([image.bytes as BlobPart], { type: image.mime }));
  const aspect = bitmap.width / bitmap.height;
  bitmap.close();
  return { ...image, url: URL.createObjectURL(new Blob([image.bytes as BlobPart], { type: image.mime })), aspect };
}

function Options({ options, setOptions }: ToolViewProps<SignOptions>) {
  const { dict } = useRuntime();
  const t = dict.toolUi.sign;
  const current = useRef<Signature | null>(options.signature);

  const setSignature = useCallback(
    (signature: Signature | null) => {
      if (current.current && current.current !== signature) URL.revokeObjectURL(current.current.url);
      current.current = signature;
      setOptions({ signature });
    },
    [setOptions],
  );

  // Typed signatures are re-rendered whenever the text or color changes.
  useEffect(() => {
    if (options.source !== "type") return;
    let cancelled = false;
    const timer = setTimeout(() => {
      fromText(options.typed, options.color).then((sig) => {
        if (!cancelled) setSignature(sig);
      });
    }, 250);
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [options.source, options.typed, options.color, setSignature]);

  return (
    <>
      <Choice
        label={t.create}
        columns={3}
        value={options.source}
        onChange={(source) => {
          setSignature(null);
          setOptions({ source });
        }}
        options={[
          { value: "draw", label: t.draw },
          { value: "type", label: t.type },
          { value: "upload", label: t.upload },
        ]}
      />
      {options.source !== "upload" && (
        <Choice
          label={t.color}
          columns={3}
          value={options.color}
          onChange={(color) => setOptions({ color })}
          options={[
            { value: "#111111", label: t.colors.black },
            { value: "#1d3fbb", label: t.colors.blue },
            { value: "#b3261e", label: t.colors.red },
          ]}
        />
      )}
      {options.source === "draw" && (
        <SignaturePad
          color={options.color}
          clearLabel={t.clear}
          onChange={(canvas) => (canvas ? fromCanvas(canvas).then(setSignature) : setSignature(null))}
        />
      )}
      {options.source === "type" && (
        <TextInput
          label={t.type}
          placeholder={t.typePlaceholder}
          value={options.typed}
          onChange={(e) => setOptions({ typed: e.target.value })}
          style={{ fontFamily: script.style.fontFamily, fontSize: 22 }}
        />
      )}
      {options.source === "upload" && (
        <Field label={t.upload} hint={t.uploadHint}>
          <input
            type="file"
            accept="image/png,image/jpeg,image/webp"
            onChange={async (e) => {
              const file = e.target.files?.[0];
              setSignature(file ? await fromFile(file) : null);
            }}
            className="file:bg-brand-soft file:text-brand block w-full text-sm file:mr-3 file:rounded-full file:border-0 file:px-4 file:py-2 file:font-semibold"
          />
        </Field>
      )}
      {options.pageCount > 1 && (
        <Checkbox label={t.allPages} checked={options.allPages} onChange={(allPages) => setOptions({ allPages })} />
      )}
    </>
  );
}

function Placer({
  preview,
  options,
  setOptions,
}: { preview: PdfPreview } & Pick<ToolViewProps<SignOptions>, "options" | "setOptions">) {
  const { dict } = useRuntime();
  const frame = useRef<HTMLDivElement>(null);
  const drag = useRef<{ mode: "move" | "resize"; startX: number; startY: number; box: SignatureBox } | null>(null);
  const { page, pageCount, signature, box, pageAspect } = options;

  useEffect(() => {
    if (pageCount !== preview.doc.pageCount) setOptions({ pageCount: preview.doc.pageCount });
  }, [pageCount, preview, setOptions]);

  useEffect(() => {
    let cancelled = false;
    preview.doc.pageSize(page).then((s) => !cancelled && setOptions({ pageAspect: s.width / s.height }));
    return () => {
      cancelled = true;
    };
  }, [preview, page, setOptions]);

  const height = signature ? boxHeight(box, pageAspect, signature.aspect) : 0;

  function onPointerMove(e: React.PointerEvent) {
    const d = drag.current;
    const rect = frame.current?.getBoundingClientRect();
    if (!d || !rect || !signature) return;
    const dx = (e.clientX - d.startX) / rect.width;
    const dy = (e.clientY - d.startY) / rect.height;
    const next =
      d.mode === "move" ? { ...d.box, x: d.box.x + dx, y: d.box.y + dy } : { ...d.box, width: d.box.width + dx };
    setOptions({ box: clampBox(next, boxHeight(next, pageAspect, signature.aspect)) });
  }

  function begin(e: React.PointerEvent, mode: "move" | "resize") {
    e.stopPropagation();
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
    drag.current = { mode, startX: e.clientX, startY: e.clientY, box };
  }

  return (
    <div>
      <p className="text-muted mb-3 text-center text-sm">{dict.toolUi.sign.place}</p>
      <PageImage thumbs={preview.thumbs} index={page} alt={format(dict.ui.page, { n: page + 1 })}>
        <div
          ref={frame}
          className="absolute inset-0"
          onPointerMove={onPointerMove}
          onPointerUp={() => (drag.current = null)}
        >
          {signature && (
            <div
              className="border-brand bg-brand/5 absolute cursor-move touch-none rounded border-2 border-dashed"
              style={{
                left: `${box.x * 100}%`,
                top: `${box.y * 100}%`,
                width: `${box.width * 100}%`,
                height: `${height * 100}%`,
              }}
              onPointerDown={(e) => begin(e, "move")}
              data-testid="signature-box"
            >
              {/* eslint-disable-next-line @next/next/no-img-element -- blob URL preview */}
              <img src={signature.url} alt="" draggable={false} className="size-full object-contain" />
              <span
                className="bg-brand absolute -right-2 -bottom-2 size-4 cursor-se-resize rounded-full border-2 border-white shadow"
                onPointerDown={(e) => begin(e, "resize")}
              />
            </div>
          )}
        </div>
      </PageImage>
      {preview.doc.pageCount > 1 && (
        <div className="mt-3 flex items-center justify-center gap-3 text-sm">
          <IconButton label={dict.ui.previousPage} disabled={page === 0} onClick={() => setOptions({ page: page - 1 })}>
            <ChevronLeft className="size-5" aria-hidden />
          </IconButton>
          <span className="tabular-nums">
            {page + 1} / {preview.doc.pageCount}
          </span>
          <IconButton
            label={dict.ui.nextPage}
            disabled={page >= preview.doc.pageCount - 1}
            onClick={() => setOptions({ page: page + 1 })}
          >
            <ChevronRight className="size-5" aria-hidden />
          </IconButton>
        </div>
      )}
    </div>
  );
}

function Main({ files, options, setOptions }: ToolViewProps<SignOptions>) {
  return (
    <PdfPreviewGate file={files[0]}>
      {(preview) => <Placer preview={preview} options={options} setOptions={setOptions} />}
    </PdfPreviewGate>
  );
}

const sign: ToolImpl<SignOptions> = {
  initialOptions: () => ({
    source: "draw",
    color: "#111111",
    typed: "",
    signature: null,
    page: 0,
    pageCount: 1,
    pageAspect: 1 / Math.SQRT2,
    box: { x: 0.55, y: 0.78, width: 0.3 },
    allPages: false,
  }),
  Main,
  Options,
  async run({ files: [file], options }, { engine, dict }) {
    const { signature } = options;
    if (!signature) throw new PdfToolError("emptySelection");
    const pages = options.allPages ? Array.from({ length: options.pageCount }, (_, i) => i) : [options.page];
    const bytes = await engine.placeImage(
      await readBytes(file),
      signature.bytes,
      signature.mime,
      placements(options.box, options.pageAspect, signature.aspect, pages),
    );
    return [pdfOutput(file.name, dict.toolUi.sign.output, bytes)];
  },
};

export default sign;
