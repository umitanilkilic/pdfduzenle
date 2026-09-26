"use client";

import { Download, FileText, History, Trash2, X } from "lucide-react";
import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import type { Dictionary } from "@/i18n";
import type { Locale } from "@/i18n/config";
import { downloadBlob } from "@/lib/download";
import { formatBytes } from "@/lib/files";
import { compatibleTools, timeAgo, type ToolLink } from "@/workspace/compatible";
import { useWorkspace } from "@/workspace/context";
import { handoffHref } from "@/workspace/handoff";
import type { StoredFile } from "@/workspace/store";

interface Props {
  locale: Locale;
  labels: Dictionary["history"] & { close: string; open: string };
  tools: ToolLink[];
}

export function HistoryButton({ locale, labels, tools }: Props) {
  const store = useWorkspace();
  const [open, setOpen] = useState(false);
  const trigger = useRef<HTMLButtonElement>(null);
  const closeButton = useRef<HTMLButtonElement>(null);
  const [files, setFiles] = useState<StoredFile[]>([]);
  const [now, setNow] = useState(0);

  const refresh = useCallback(() => {
    store
      .list()
      .then((list) => {
        setFiles(list);
        setNow(Date.now());
      })
      .catch((err) => console.warn("Could not read recent files", err));
  }, [store]);

  useEffect(() => {
    refresh();
    return store.subscribe(refresh);
  }, [store, refresh]);

  useEffect(() => {
    if (!open) return;
    // Move focus into the dialog and give it back to the button when it closes.
    closeButton.current?.focus();
    const button = trigger.current;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("keydown", onKey);
      button?.focus();
    };
  }, [open]);

  return (
    <>
      <button
        ref={trigger}
        type="button"
        onClick={() => {
          refresh();
          setOpen(true);
        }}
        aria-label={labels.open}
        title={labels.open}
        className="text-muted hover:bg-surface-2 hover:text-fg relative grid size-10 place-items-center rounded-full transition"
      >
        <History className="size-5" aria-hidden />
        {files.length > 0 && (
          <span className="bg-brand text-brand-fg absolute top-1 right-1 grid min-w-4 place-items-center rounded-full px-1 text-[10px] font-bold">
            {files.length}
          </span>
        )}
      </button>

      {/* Portal: the header's backdrop-filter would otherwise confine this fixed panel to the header. */}
      {open &&
        createPortal(
          <div
            className="fixed inset-0 z-50"
            role="dialog"
            aria-modal="true"
            aria-label={labels.title}
            data-clarity-mask="true"
          >
            <div className="absolute inset-0 bg-black/30" onClick={() => setOpen(false)} />
            <aside className="bg-surface absolute inset-y-0 right-0 flex w-full max-w-md flex-col shadow-2xl">
              <header className="border-border flex items-center justify-between border-b px-5 py-4">
                <h2 className="text-lg font-bold">{labels.title}</h2>
                <button
                  type="button"
                  onClick={() => setOpen(false)}
                  aria-label={labels.close}
                  className="hover:bg-surface-2 grid size-9 place-items-center rounded-full"
                >
                  <X className="size-5" aria-hidden />
                </button>
              </header>
              <p className="border-border text-muted border-b px-5 py-2 text-xs">{labels.note}</p>

              <ul className="divide-border flex-1 divide-y overflow-y-auto">
                {files.length === 0 && <li className="text-muted p-8 text-center text-sm">{labels.empty}</li>}
                {files.map((file) => (
                  <HistoryItem
                    key={file.id}
                    file={file}
                    locale={locale}
                    labels={labels}
                    tools={compatibleTools(file, tools)}
                    now={now}
                    onRemove={() => store.remove(file.id)}
                    onNavigate={() => setOpen(false)}
                  />
                ))}
              </ul>

              {files.length > 0 && (
                <footer className="border-border border-t p-4">
                  <button
                    type="button"
                    onClick={() => store.clear()}
                    className="text-danger text-sm font-medium hover:underline"
                  >
                    {labels.clear}
                  </button>
                </footer>
              )}
            </aside>
          </div>,
          document.body,
        )}
    </>
  );
}

function HistoryItem({
  file,
  locale,
  labels,
  tools,
  now,
  onRemove,
  onNavigate,
}: {
  file: StoredFile;
  now: number;
  locale: Locale;
  labels: Props["labels"];
  tools: ToolLink[];
  onRemove(): void;
  onNavigate(): void;
}) {
  const [showTools, setShowTools] = useState(false);

  return (
    <li className="px-5 py-3">
      <div className="flex items-center gap-3">
        <FileText className="text-brand size-5 shrink-0" aria-hidden />
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-medium">{file.name}</p>
          <p className="text-muted text-xs">
            {formatBytes(file.size, locale)} · {timeAgo(file.createdAt, now, locale)}
          </p>
        </div>
        <button
          type="button"
          onClick={() => downloadBlob(file.blob, file.name)}
          aria-label={labels.download}
          title={labels.download}
          className="text-muted hover:bg-surface-2 hover:text-fg grid size-8 place-items-center rounded-full"
        >
          <Download className="size-4" aria-hidden />
        </button>
        <button
          type="button"
          onClick={onRemove}
          aria-label={labels.remove}
          title={labels.remove}
          className="text-muted hover:bg-surface-2 hover:text-danger grid size-8 place-items-center rounded-full"
        >
          <Trash2 className="size-4" aria-hidden />
        </button>
      </div>
      {tools.length > 0 && (
        <div className="mt-2 pl-8">
          <button
            type="button"
            onClick={() => setShowTools((v) => !v)}
            aria-expanded={showTools}
            className="text-brand text-xs font-semibold hover:underline"
          >
            {labels.useIn}
          </button>
          {showTools && (
            <ul className="mt-2 flex flex-wrap gap-1.5">
              {tools.map((tool) => (
                <li key={tool.id}>
                  <Link
                    href={handoffHref(tool.href, [file.id])}
                    onClick={onNavigate}
                    className="border-border hover:bg-surface-2 inline-block rounded-full border px-2.5 py-1 text-xs"
                  >
                    {tool.name}
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </li>
  );
}
