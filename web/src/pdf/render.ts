import type { PDFDocumentProxy } from "pdfjs-dist";

/** Browser-only rendering with pdf.js (thumbnails, previews, PDF → image). Loaded lazily. */
export interface RenderedDocument {
  pageCount: number;
  /** Size of a page as seen on screen, in PDF points. */
  pageSize(index: number): Promise<{ width: number; height: number }>;
  /** Renders a page so that its longer side is at most `maxSide` px, or at `scale` when given. */
  renderPage(index: number, opts: { maxSide?: number; scale?: number }): Promise<HTMLCanvasElement>;
  destroy(): Promise<void>;
}

// The legacy build ships polyfills; the modern build needs APIs (e.g. Map#getOrInsertComputed)
// that many browsers still lack.
let pdfjsPromise: Promise<typeof import("pdfjs-dist")> | null = null;

function loadPdfjs() {
  pdfjsPromise ??= import("pdfjs-dist/legacy/build/pdf.mjs").then((pdfjs) => {
    pdfjs.GlobalWorkerOptions.workerPort = new Worker(
      new URL("pdfjs-dist/legacy/build/pdf.worker.min.mjs", import.meta.url),
      {
        type: "module",
      },
    );
    return pdfjs;
  });
  return pdfjsPromise;
}

export async function openDocument(bytes: Uint8Array): Promise<RenderedDocument> {
  const pdfjs = await loadPdfjs();
  // pdf.js takes ownership of the buffer it is given, so hand it a copy.
  const task = pdfjs.getDocument({ data: bytes.slice() });
  const doc: PDFDocumentProxy = await task.promise;

  return {
    pageCount: doc.numPages,
    async pageSize(index) {
      const page = await doc.getPage(index + 1);
      const { width, height } = page.getViewport({ scale: 1 });
      return { width, height };
    },
    async renderPage(index, { maxSide, scale }) {
      const page = await doc.getPage(index + 1);
      const base = page.getViewport({ scale: 1 });
      const s = scale ?? (maxSide ? maxSide / Math.max(base.width, base.height) : 1);
      const viewport = page.getViewport({ scale: s });
      const canvas = document.createElement("canvas");
      canvas.width = Math.ceil(viewport.width);
      canvas.height = Math.ceil(viewport.height);
      await page.render({ canvas, viewport }).promise;
      page.cleanup();
      return canvas;
    },
    destroy: () => task.destroy(),
  };
}

function canvasToBlob(canvas: HTMLCanvasElement, type: "image/png" | "image/jpeg", quality: number) {
  return new Promise<Blob>((resolve, reject) => {
    canvas.toBlob((blob) => (blob ? resolve(blob) : reject(new Error("toBlob failed"))), type, quality);
  });
}

export async function canvasToBytes(canvas: HTMLCanvasElement, type: "image/png" | "image/jpeg", quality = 0.92) {
  return new Uint8Array(await (await canvasToBlob(canvas, type, quality)).arrayBuffer());
}

/** JPEG of the first page with its longer side at most `maxSide` px (file list thumbnails). */
export async function renderFirstPage(bytes: Uint8Array, maxSide: number): Promise<Blob> {
  const doc = await openDocument(bytes);
  try {
    const canvas = await doc.renderPage(0, { maxSide });
    return await canvasToBlob(canvas, "image/jpeg", 0.8);
  } finally {
    await doc.destroy();
  }
}
