"use client";

import { Search } from "lucide-react";
import Link from "next/link";
import { useMemo, useState } from "react";
import { ToolIcon } from "@/components/ToolIcon";
import { normalizeSearch } from "@/lib/search";
import type { ToolCategory, ToolIcon as ToolIconName } from "@/tools/registry";

export interface GridItem {
  id: string;
  href: string;
  name: string;
  short: string;
  icon: ToolIconName;
  category: ToolCategory;
  keywords: string[];
}

interface Props {
  items: GridItem[];
  categories: { id: ToolCategory; name: string }[];
  allLabel: string;
  placeholder: string;
  emptyLabel: string;
}

export function ToolGrid({ items, categories, allLabel, placeholder, emptyLabel }: Props) {
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState<ToolCategory | null>(null);

  const index = useMemo(
    () => items.map((item) => ({ item, text: normalizeSearch([item.name, item.short, ...item.keywords].join(" ")) })),
    [items],
  );

  const q = normalizeSearch(query.trim());
  const visible = index
    .filter(
      ({ item, text }) =>
        (!category || item.category === category) && (!q || q.split(/\s+/).every((w) => text.includes(w))),
    )
    .map(({ item }) => item);

  return (
    <div>
      <div className="relative mx-auto max-w-xl">
        <Search
          className="text-muted pointer-events-none absolute top-1/2 left-4 size-5 -translate-y-1/2"
          aria-hidden
        />
        <input
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder={placeholder}
          aria-label={placeholder}
          className="border-border bg-surface focus:border-brand focus:ring-brand/15 h-13 w-full rounded-full border pr-4 pl-12 text-base shadow-sm transition outline-none focus:ring-4"
        />
      </div>

      <div className="mt-6 flex flex-wrap justify-center gap-2" role="group">
        <Chip active={category === null} onClick={() => setCategory(null)}>
          {allLabel}
        </Chip>
        {categories.map((c) => (
          <Chip key={c.id} active={category === c.id} onClick={() => setCategory(c.id)}>
            {c.name}
          </Chip>
        ))}
      </div>

      <ul className="mt-8 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {visible.map((item) => (
          <li key={item.id}>
            <Link
              href={item.href}
              className="group border-border bg-surface flex h-full flex-col gap-3 rounded-2xl border p-5 transition hover:-translate-y-0.5 hover:border-transparent hover:shadow-lg hover:shadow-black/5"
            >
              <span
                className="grid size-11 place-items-center rounded-xl text-white"
                style={{ background: `var(--cat-${item.category})` }}
              >
                <ToolIcon name={item.icon} className="size-5.5" />
              </span>
              <span className="group-hover:text-brand font-semibold">{item.name}</span>
              <span className="text-muted text-sm leading-relaxed">{item.short}</span>
            </Link>
          </li>
        ))}
      </ul>
      {visible.length === 0 && <p className="text-muted mt-10 text-center">{emptyLabel}</p>}
    </div>
  );
}

function Chip({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      type="button"
      aria-pressed={active}
      onClick={onClick}
      className={`h-9 rounded-full border px-4 text-sm font-medium transition ${
        active ? "border-fg bg-fg text-bg" : "border-border bg-surface text-muted hover:text-fg"
      }`}
    >
      {children}
    </button>
  );
}
