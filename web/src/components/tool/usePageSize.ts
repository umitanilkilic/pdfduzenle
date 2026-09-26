"use client";

import { useEffect, useState } from "react";
import type { PdfPreview } from "./usePdfDocument";

/** Size of page `index` as seen on screen, in PDF points; null until known. */
export function usePageSize(preview: PdfPreview, index: number): { width: number; height: number } | null {
  const [loaded, setLoaded] = useState<{ preview: PdfPreview; index: number; width: number; height: number } | null>(
    null,
  );

  useEffect(() => {
    let cancelled = false;
    preview.doc.pageSize(index).then((size) => !cancelled && setLoaded({ preview, index, ...size }));
    return () => {
      cancelled = true;
    };
  }, [preview, index]);

  return loaded && loaded.preview === preview && loaded.index === index
    ? { width: loaded.width, height: loaded.height }
    : null;
}
