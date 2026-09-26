"use client";

import { useEffect, useState } from "react";
import { readBytes } from "@/lib/files";
import type { RenderedDocument } from "@/pdf/render";
import { PdfToolError } from "@/pdf/errors";

export interface Thumbnails {
  /** Object URL of a page image whose longer side is `size` px; rendered once and reused. */
  get(index: number, size?: number): Promise<string>;
}

export interface PdfPreview {
  doc: RenderedDocument;
  thumbs: Thumbnails;
}

type State = { status: "loading" } | { status: "ready"; preview: PdfPreview } | { status: "error"; error: unknown };
type Loaded = { file: File } & (Extract<State, { status: "ready" }> | Extract<State, { status: "error" }>);

const THUMB_SIZE = 320;

function createThumbnails(doc: RenderedDocument): Thumbnails & { dispose(): void } {
  const cache = new Map<string, Promise<string>>();
  return {
    get(index, size = THUMB_SIZE) {
      const key = `${index}@${size}`;
      let url = cache.get(key);
      if (!url) {
        url = doc
          .renderPage(index, { maxSide: size })
          .then((canvas) => new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, "image/jpeg", 0.8)))
          .then((blob) => (blob ? URL.createObjectURL(blob) : ""));
        cache.set(key, url);
      }
      return url;
    },
    dispose() {
      for (const url of cache.values()) url.then((u) => u && URL.revokeObjectURL(u));
      cache.clear();
    },
  };
}

/** Opens a PDF with pdf.js for previews; releases the document and thumbnails on change/unmount. */
export function usePdfDocument(file: File | undefined): State {
  // Results are tagged with their file, so a stale result reads as "loading" without resetting state.
  const [loaded, setLoaded] = useState<Loaded | null>(null);

  useEffect(() => {
    if (!file) return;
    let cancelled = false;
    let cleanup: (() => void) | undefined;

    (async () => {
      try {
        const { openDocument } = await import("@/pdf/render");
        const doc = await openDocument(await readBytes(file));
        const thumbs = createThumbnails(doc);
        cleanup = () => {
          thumbs.dispose();
          void doc.destroy();
        };
        if (cancelled) cleanup();
        else setLoaded({ file, status: "ready", preview: { doc, thumbs } });
      } catch (err) {
        const passwordError = err instanceof Error && err.name === "PasswordException";
        if (!cancelled)
          setLoaded({ file, status: "error", error: passwordError ? new PdfToolError("encrypted") : err });
      }
    })();

    return () => {
      cancelled = true;
      cleanup?.();
    };
  }, [file]);

  return loaded && loaded.file === file ? loaded : { status: "loading" };
}
