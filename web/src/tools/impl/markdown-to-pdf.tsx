"use client";

import { AlertCircle } from "lucide-react";
import { useEffect, useState } from "react";
import { PageImage } from "@/components/tool/PageImage";
import { PagePager } from "@/components/tool/PagePager";
import { LoadingPages, PdfPreviewGate } from "@/components/tool/PdfPreviewGate";
import { useRuntime } from "@/components/tool/runtime";
import { Choice } from "@/components/tool/ui";
import { format } from "@/i18n";
import { PdfToolError } from "@/pdf/errors";
import type { FontFace } from "@/pdf/fonts";
import type { MarkdownFonts, MarkdownPdfOptions } from "@/pdf/ops/markdown";
import { errorMessage } from "./shared/errors";
import { pdfOutput } from "./shared/output";
import type { ToolImpl, ToolServices, ToolViewProps } from "./shared/types";

export type MarkdownToPdfOptions = MarkdownPdfOptions;

const FACES: FontFace[] = ["regular", "bold", "italic", "boldItalic", "mono"];
/** Larger Markdown files are documentation dumps, not documents; refuse before reading them. */
const MAX_BYTES = 4 * 1024 * 1024;

async function loadFonts(loadFont: ToolServices["loadFont"]): Promise<MarkdownFonts> {
  const files = await Promise.all(FACES.map((face) => loadFont(face)));
  return Object.fromEntries(FACES.map((face, i) => [face, files[i]])) as MarkdownFonts;
}

/** Shared by the live preview and the final run, so both produce the same PDF. */
async function convert(file: File, options: MarkdownToPdfOptions, services: ToolServices): Promise<Uint8Array> {
  if (file.size > MAX_BYTES) throw new PdfToolError("tooManyPages");
  const [text, fonts] = await Promise.all([file.text(), loadFonts(services.loadFont)]);
  return services.engine.markdownToPdf(text, options, fonts);
}

type Preview = { source: File; options: MarkdownToPdfOptions } & ({ pdf: File } | { error: unknown });

function Main({ files: [file], options }: ToolViewProps<MarkdownToPdfOptions>) {
  const services = useRuntime();
  const { dict } = services;
  const [preview, setPreview] = useState<Preview | null>(null);
  const [page, setPage] = useState(0);
  const { pageSize, fontSize, margin } = options;

  useEffect(() => {
    let cancelled = false;
    const current = { pageSize, fontSize, margin };
    // Debounced: option clicks in quick succession render once.
    const timer = setTimeout(() => {
      convert(file, current, services).then(
        (bytes) =>
          !cancelled &&
          setPreview({
            source: file,
            options: current,
            pdf: new File([bytes as BlobPart], "preview.pdf", { type: "application/pdf" }),
          }),
        (error: unknown) => !cancelled && setPreview({ source: file, options: current, error }),
      );
    }, 250);
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [file, pageSize, fontSize, margin, services]);

  if (!preview || preview.source !== file) return <LoadingPages />;
  if ("error" in preview) {
    return (
      <p role="alert" className="text-danger flex items-center justify-center gap-2 py-16">
        <AlertCircle className="size-5" aria-hidden />
        {errorMessage(preview.error, dict)}
      </p>
    );
  }
  return (
    <PdfPreviewGate file={preview.pdf}>
      {({ doc, thumbs }) => {
        const shown = Math.min(page, doc.pageCount - 1);
        return (
          <div data-testid="markdown-preview">
            <p className="text-muted mb-3 text-center text-sm">
              {format(dict.toolUi["markdown-to-pdf"].preview, { n: doc.pageCount })}
            </p>
            <PageImage thumbs={thumbs} index={shown} alt={format(dict.ui.page, { n: shown + 1 })} />
            <PagePager page={shown} pageCount={doc.pageCount} onChange={setPage} />
          </div>
        );
      }}
    </PdfPreviewGate>
  );
}

function Options({ options, setOptions }: ToolViewProps<MarkdownToPdfOptions>) {
  const { dict } = useRuntime();
  const t = dict.toolUi["markdown-to-pdf"];
  return (
    <>
      <Choice
        label={t.pageSize}
        columns={2}
        value={options.pageSize}
        onChange={(pageSize) => setOptions({ pageSize })}
        options={[
          { value: "a4", label: t.a4 },
          { value: "letter", label: t.letter },
        ]}
      />
      <Choice
        label={t.fontSize}
        columns={3}
        value={options.fontSize}
        onChange={(fontSize) => setOptions({ fontSize })}
        options={[
          { value: 10, label: t.small },
          { value: 11, label: t.normal },
          { value: 13, label: t.large },
        ]}
      />
      <Choice
        label={t.margin}
        columns={3}
        value={options.margin}
        onChange={(margin) => setOptions({ margin })}
        options={[
          { value: "narrow", label: t.narrow },
          { value: "normal", label: t.normal },
          { value: "wide", label: t.wide },
        ]}
      />
    </>
  );
}

const markdownToPdf: ToolImpl<MarkdownToPdfOptions> = {
  initialOptions: () => ({ pageSize: "a4", fontSize: 11, margin: "normal" }),
  Main,
  Options,
  async run({ files: [file], options }, services) {
    const bytes = await convert(file, options, services);
    return [pdfOutput(file.name, services.dict.toolUi["markdown-to-pdf"].output, bytes)];
  },
};

export default markdownToPdf;
