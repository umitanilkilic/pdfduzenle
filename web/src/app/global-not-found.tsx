import type { Metadata } from "next";
import { getDictionary } from "@/i18n";
import { NotFoundView } from "@/views/NotFoundView";
import { RootLayout } from "@/views/RootLayout";

export const metadata: Metadata = { title: getDictionary("tr").notFound.title, robots: { index: false } };

export default function GlobalNotFound() {
  return (
    <RootLayout locale="tr">
      <NotFoundView locale="tr" />
    </RootLayout>
  );
}
