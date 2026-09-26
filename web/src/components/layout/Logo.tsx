export function LogoMark({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 32 32" className={className} aria-hidden>
      <rect width="32" height="32" rx="8" fill="var(--brand)" />
      <path d="M10 7h8.5L23 11.5V24a1 1 0 0 1-1 1H10a1 1 0 0 1-1-1V8a1 1 0 0 1 1-1Z" fill="#fff" />
      <path d="M18.5 7v4.5H23" fill="none" stroke="var(--brand)" strokeWidth="1.4" strokeLinejoin="round" />
      <path d="m12.5 20.5 5.2-5.2 1.8 1.8-5.2 5.2H12.5v-1.8Z" fill="var(--brand)" />
    </svg>
  );
}

export function Logo() {
  return (
    <span className="flex items-center gap-2 text-lg font-bold tracking-tight">
      <LogoMark className="size-8" />
      <span>
        PDF<span className="text-brand">Düzenle</span>
      </span>
    </span>
  );
}
