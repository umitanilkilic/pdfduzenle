import type { Metadata } from "next";
import { toolMetadata, toolStaticParams, ToolView } from "@/views/ToolView";

// Unknown slugs fall through to app/global-not-found.tsx.
export const dynamicParams = false;

export function generateStaticParams() {
  return toolStaticParams("en");
}

export async function generateMetadata({ params }: PageProps<"/en/[tool]">): Promise<Metadata> {
  return toolMetadata("en", (await params).tool);
}

export default async function Page({ params }: PageProps<"/en/[tool]">) {
  return <ToolView locale="en" slug={(await params).tool} />;
}
