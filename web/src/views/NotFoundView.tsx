import Link from "next/link";
import { localePath, type Locale } from "@/i18n/config";
import { getDictionary } from "@/i18n";

export function NotFoundView({ locale }: { locale: Locale }) {
  const dict = getDictionary(locale);
  return (
    <div className="mx-auto max-w-xl px-4 py-32 text-center">
      <p className="text-brand text-6xl font-extrabold">404</p>
      <h1 className="mt-4 text-2xl font-bold">{dict.notFound.title}</h1>
      <p className="text-muted mt-2">{dict.notFound.text}</p>
      <Link
        href={localePath(locale)}
        className="bg-brand text-brand-fg hover:bg-brand-hover mt-8 inline-flex h-11 items-center rounded-full px-6 font-semibold"
      >
        {dict.notFound.back}
      </Link>
    </div>
  );
}
