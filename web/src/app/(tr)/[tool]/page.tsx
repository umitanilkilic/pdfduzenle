import type { Metadata } from "next";
import { toolMetadata, toolStaticParams, ToolView } from "@/views/ToolView";

// Unknown slugs fall through to app/global-not-found.tsx.
export const dynamicParams = false;

export function generateStaticParams() {
  return toolStaticParams("tr");
}

export async function generateMetadata({ params }: PageProps<"/[tool]">): Promise<Metadata> {
  return toolMetadata("tr", (await params).tool);
}

export default async function Page({ params }: PageProps<"/[tool]">) {
  return <ToolView locale="tr" slug={(await params).tool} />;
}
