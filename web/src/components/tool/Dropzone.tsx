"use client";

import { Upload } from "lucide-react";
import { useRef, useState } from "react";
import { cn } from "@/lib/cn";
import { matchesAccept } from "@/lib/files";
import { useRuntime } from "./runtime";

interface Props {
  accept: string;
  multiple: boolean;
  onFiles(files: File[]): void;
  /** Compact button used to add more files once some are selected. */
  compact?: boolean;
}

export function Dropzone({ accept, multiple, onFiles, compact }: Props) {
  const { dict } = useRuntime();
  const input = useRef<HTMLInputElement>(null);
  const [over, setOver] = useState(false);
  const [rejected, setRejected] = useState(false);

  function take(list: FileList | null) {
    const all = Array.from(list ?? []);
    const ok = all.filter((f) => matchesAccept(f, accept));
    setRejected(ok.length < all.length);
    if (ok.length) onFiles(multiple ? ok : ok.slice(0, 1));
  }

  const picker = (
    <input
      ref={input}
      type="file"
      accept={accept}
      multiple={multiple}
      className="sr-only"
      data-testid="file-input"
      onChange={(e) => {
        take(e.target.files);
        e.target.value = "";
      }}
    />
  );

  if (compact) {
    return (
      <label className="border-border bg-surface hover:bg-surface-2 inline-flex h-10 cursor-pointer items-center gap-2 rounded-full border px-4 text-sm font-semibold transition">
        {picker}
        <Upload className="size-4" aria-hidden />
        {dict.dropzone.addMore}
      </label>
    );
  }

  return (
    <div
      onDragOver={(e) => {
        e.preventDefault();
        setOver(true);
      }}
      onDragLeave={() => setOver(false)}
      onDrop={(e) => {
        e.preventDefault();
        setOver(false);
        take(e.dataTransfer.files);
      }}
      className={cn(
        "grid min-h-72 place-items-center rounded-3xl border-2 border-dashed p-8 text-center transition",
        over ? "border-brand bg-brand-soft" : "border-border bg-surface",
      )}
    >
      <div>
        <label className="bg-brand text-brand-fg shadow-brand/25 hover:bg-brand-hover inline-flex h-14 cursor-pointer items-center gap-2 rounded-full px-8 text-lg font-semibold shadow-lg transition">
          {picker}
          <Upload className="size-5" aria-hidden />
          {multiple ? dict.dropzone.chooseMany : dict.dropzone.choose}
        </label>
        <p className="text-muted mt-4 text-sm">{dict.dropzone.orDrop}</p>
        {rejected && (
          <p role="alert" className="text-danger mt-3 text-sm font-medium">
            {dict.dropzone.wrongType}
          </p>
        )}
      </div>
    </div>
  );
}
