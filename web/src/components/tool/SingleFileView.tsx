"use client";

import { matchesAccept } from "@/lib/files";
import { FileBar, FileList } from "./FileList";
import { PageGrid } from "./PageGrid";
import { LoadingPages } from "./PdfPreviewGate";
import { usePdfDocument } from "./usePdfDocument";

/**
 * Default view of a tool with one file: its pages when it is a PDF pdf.js can open, otherwise its list row
 * (e.g. an encrypted PDF on the unlock tool must not show an error before the password is entered).
 */
export function SingleFileView({ file, onRemove }: { file: File; onRemove(): void }) {
  const isPdf = matchesAccept(file, "application/pdf,.pdf");
  const state = usePdfDocument(isPdf ? file : undefined);

  if (!isPdf || state.status === "error") {
    return <FileList files={[file]} onChange={(files) => files.length === 0 && onRemove()} sortable={false} />;
  }
  return (
    <>
      <FileBar file={file} onRemove={onRemove} />
      {state.status === "loading" ? <LoadingPages /> : <PageGrid preview={state.preview} />}
    </>
  );
}
