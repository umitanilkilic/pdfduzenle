import { ogSize } from "@/lib/og";
import { homeOgImage } from "@/views/og-images";

export const alt = "PDF Düzenle";
export const size = ogSize;
export const contentType = "image/png";

export default function Image() {
  return homeOgImage("en");
}
