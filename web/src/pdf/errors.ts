/** Error codes map 1:1 to `dict.errors.*` so the UI can show a translated message. */
export type PdfErrorCode =
  | "invalidPdf"
  | "encrypted"
  | "invalidRange"
  | "pageOutOfRange"
  | "emptySelection"
  | "allPagesRemoved"
  | "unsupportedImage"
  | "noFiles"
  | "cropTooLarge";

export class PdfToolError extends Error {
  constructor(
    readonly code: PdfErrorCode,
    message?: string,
  ) {
    super(message ?? code);
    this.name = "PdfToolError";
  }
}
