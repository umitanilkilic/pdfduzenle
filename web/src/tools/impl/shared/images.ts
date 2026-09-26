import { jpegOrientation } from "@/lib/exif";
import { readBytes } from "@/lib/files";

/**
 * Prepares a browser image for PDF embedding (PNG or JPEG only).
 * PNGs and upright JPEGs pass through untouched; rotated JPEGs and other formats (WebP…) are redrawn
 * on a canvas, which applies EXIF orientation.
 */
export async function toEmbeddableImage(file: File): Promise<{ bytes: Uint8Array; mime: "image/png" | "image/jpeg" }> {
  const bytes = await readBytes(file);
  if (file.type === "image/png") return { bytes, mime: "image/png" };
  if (file.type === "image/jpeg" && jpegOrientation(bytes) === 1) return { bytes, mime: "image/jpeg" };

  const bitmap = await createImageBitmap(file, { imageOrientation: "from-image" });
  const canvas = document.createElement("canvas");
  canvas.width = bitmap.width;
  canvas.height = bitmap.height;
  canvas.getContext("2d")!.drawImage(bitmap, 0, 0);
  bitmap.close();

  const mime = file.type === "image/jpeg" ? "image/jpeg" : "image/png";
  const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, mime, 0.92));
  if (!blob) throw new Error("Image conversion failed");
  return { bytes: await readBytes(blob), mime };
}
