"use client";

import { AlertCircle, Loader2 } from "lucide-react";
import { errorMessage } from "@/tools/browser/errors";
import { useRuntime } from "./runtime";
import { usePdfDocument, type PdfPreview } from "./usePdfDocument";

/** Loads `file` for preview and renders `children` once ready, with loading and error states. */
export function PdfPreviewGate({
  file,
  children,
}: {
  file: File | undefined;
  children: (preview: PdfPreview) => React.ReactNode;
}) {
  const { dict } = useRuntime();
  const state = usePdfDocument(file);

  if (state.status === "loading") {
    return (
      <p className="text-muted flex items-center justify-center gap-2 py-16">
        <Loader2 className="size-5 animate-spin" aria-hidden />
        {dict.ui.loadingPages}
      </p>
    );
  }
  if (state.status === "error") {
    return (
      <p role="alert" className="text-danger flex items-center justify-center gap-2 py-16">
        <AlertCircle className="size-5" aria-hidden />
        {errorMessage(state.error, dict)}
      </p>
    );
  }
  return children(state.preview);
}
