import { loadPdf, savePdf } from "../load";

export interface PdfMetadata {
  title: string;
  author: string;
  subject: string;
  keywords: string;
  creator: string;
}

export async function readMetadata(bytes: Uint8Array): Promise<PdfMetadata & { pageCount: number }> {
  const doc = await loadPdf(bytes);
  return {
    title: doc.getTitle() ?? "",
    author: doc.getAuthor() ?? "",
    subject: doc.getSubject() ?? "",
    keywords: doc.getKeywords() ?? "",
    creator: doc.getCreator() ?? "",
    pageCount: doc.getPageCount(),
  };
}

export async function writeMetadata(bytes: Uint8Array, meta: PdfMetadata): Promise<Uint8Array> {
  const doc = await loadPdf(bytes);
  doc.setTitle(meta.title);
  doc.setAuthor(meta.author);
  doc.setSubject(meta.subject);
  doc.setKeywords(
    meta.keywords
      .split(",")
      .map((k) => k.trim())
      .filter(Boolean),
  );
  doc.setCreator(meta.creator);
  doc.setModificationDate(new Date());
  return savePdf(doc);
}
