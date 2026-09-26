import { RootLayout, rootMetadata, rootViewport } from "@/views/RootLayout";

export const metadata = rootMetadata("en");
export const viewport = rootViewport;

export default function Layout({ children }: { children: React.ReactNode }) {
  return <RootLayout locale="en">{children}</RootLayout>;
}
