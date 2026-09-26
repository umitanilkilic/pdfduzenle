import { ogSize } from "@/lib/og";
import { toolOgImage, homeOgImage } from "@/views/og-images";
import { toolStaticParams } from "@/views/ToolView";

export const alt = "PDF Düzenle";
export const size = ogSize;
export const contentType = "image/png";

export function generateStaticParams() {
  return toolStaticParams("en");
}

export default async function Image({ params }: { params: Promise<{ tool: string }> }) {
  const { tool } = await params;
  return tool ? toolOgImage("en", tool) : homeOgImage("en");
}
