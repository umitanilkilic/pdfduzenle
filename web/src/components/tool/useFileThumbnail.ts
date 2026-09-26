"use client";

import { useEffect, useState } from "react";
import { createFileThumbnailer } from "./thumbnails";

const thumbnail = createFileThumbnailer(async (bytes, maxSide) => {
  const { renderFirstPage } = await import("@/pdf/render");
  return renderFirstPage(bytes, maxSide);
});

/**
 * Object URL of a preview image for `file` (see `createFileThumbnailer`), revoked on change/unmount.
 * `undefined` while loading, `null` when there is no preview (other types, unreadable or encrypted PDFs).
 */
export function useFileThumbnail(file: File | null, maxSide: number): string | null | undefined {
  // Tagged with its file, so a stale result reads as "loading" without resetting state in the effect.
  const [result, setResult] = useState<{ file: File; url: string | null } | null>(null);

  useEffect(() => {
    if (!file) return;
    let cancelled = false;
    let url: string | null = null;
    thumbnail(file, maxSide)
      // A file that can't be previewed still works with the tool; the list shows its icon instead.
      .catch(() => null)
      .then((blob) => {
        if (cancelled) return;
        url = blob ? URL.createObjectURL(blob) : null;
        setResult({ file, url });
      });
    return () => {
      cancelled = true;
      if (url) URL.revokeObjectURL(url);
    };
  }, [file, maxSide]);

  if (!file) return null;
  return result?.file === file ? result.url : undefined;
}
