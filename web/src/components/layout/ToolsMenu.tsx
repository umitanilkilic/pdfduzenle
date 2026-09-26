"use client";

import { ChevronDown } from "lucide-react";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { ToolIcon } from "@/components/ToolIcon";
import type { ToolCategory, ToolIcon as ToolIconName } from "@/tools/registry";

export interface MenuGroup {
  category: ToolCategory;
  name: string;
  items: { href: string; name: string; icon: ToolIconName }[];
}

export function ToolsMenu({ label, groups }: { label: string; groups: MenuGroup[] }) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!open) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    function onClick(e: MouseEvent) {
      if (!ref.current?.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("keydown", onKey);
    document.addEventListener("mousedown", onClick);
    return () => {
      document.removeEventListener("keydown", onKey);
      document.removeEventListener("mousedown", onClick);
    };
  }, [open]);

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        aria-expanded={open}
        onClick={() => setOpen((v) => !v)}
        className="hover:bg-surface-2 flex h-10 items-center gap-1 rounded-full px-3 text-sm font-semibold whitespace-nowrap transition sm:px-4"
      >
        {label}
        <ChevronDown className={`size-4 transition ${open ? "rotate-180" : ""}`} aria-hidden />
      </button>
      {open && (
        <div className="border-border bg-surface fixed inset-x-0 top-16 z-50 max-h-[calc(100dvh-4rem)] overflow-y-auto border-b shadow-xl">
          <div className="mx-auto grid max-w-6xl gap-6 px-4 py-6 sm:grid-cols-2 lg:grid-cols-3">
            {groups.map((group) => (
              <div key={group.category}>
                <p className="text-muted mb-2 text-xs font-semibold tracking-wider uppercase">{group.name}</p>
                <ul className="space-y-0.5">
                  {group.items.map((item) => (
                    <li key={item.href}>
                      <Link
                        href={item.href}
                        onClick={() => setOpen(false)}
                        className="hover:bg-surface-2 flex items-center gap-2.5 rounded-lg px-2 py-1.5 text-sm transition"
                      >
                        <span
                          className="grid size-7 place-items-center rounded-md text-white"
                          style={{ background: `var(--cat-${group.category})` }}
                        >
                          <ToolIcon name={item.icon} className="size-4" />
                        </span>
                        {item.name}
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
