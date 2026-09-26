import { RootLayout, rootMetadata, rootViewport } from "@/views/RootLayout";

export const metadata = rootMetadata("tr");
export const viewport = rootViewport;

export default function Layout({ children }: { children: React.ReactNode }) {
  return <RootLayout locale="tr">{children}</RootLayout>;
}
