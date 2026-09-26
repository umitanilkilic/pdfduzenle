"use client";

import { CheckCircle2, Download, FileDown, RotateCcw } from "lucide-react";
import Link from "next/link";
import { ToolIcon } from "@/components/ToolIcon";
import { downloadBytes, zipOutputs } from "@/lib/download";
import { formatBytes } from "@/lib/files";
import type { OutputFile } from "@/tools/browser/types";
import type { NextTool } from "./types";
import { useRuntime } from "./runtime";
import { Button } from "./ui";

export function ResultPanel({
  outputs,
  zipName,
  next,
  onReset,
}: {
  outputs: OutputFile[];
  zipName: string;
  next: NextTool[];
  onReset(): void;
}) {
  const { dict, locale } = useRuntime();
  const single = outputs.length === 1;

  return (
    <div className="border-border bg-surface rounded-3xl border p-6 sm:p-10">
      <div className="text-center">
        <CheckCircle2 className="text-ok mx-auto size-12" aria-hidden />
        <h2 className="mt-3 text-2xl font-bold">{dict.process.done}</h2>
        <div className="mt-6 flex flex-wrap justify-center gap-3">
          {single ? (
            <Button
              className="h-14 px-8 text-base"
              onClick={() => downloadBytes(outputs[0].bytes, outputs[0].name, outputs[0].type)}
            >
              <Download className="size-5" aria-hidden />
              {dict.process.download}
            </Button>
          ) : (
            <Button
              className="h-14 px-8 text-base"
              onClick={() => downloadBytes(zipOutputs(outputs), zipName, "application/zip")}
            >
              <Download className="size-5" aria-hidden />
              {dict.process.downloadAll}
            </Button>
          )}
          <Button variant="secondary" className="h-14 px-6" onClick={onReset}>
            <RotateCcw className="size-4" aria-hidden />
            {dict.process.startOver}
          </Button>
        </div>
      </div>

      {!single && (
        <ul className="divide-border border-border mx-auto mt-8 max-w-xl divide-y rounded-2xl border">
          {outputs.map((out, i) => (
            <li key={i} className="flex items-center gap-3 px-4 py-2.5">
              <FileDown className="text-muted size-4 shrink-0" aria-hidden />
              <span className="min-w-0 flex-1 truncate text-sm">{out.name}</span>
              <span className="text-muted text-xs">{formatBytes(out.bytes.byteLength, locale)}</span>
              <Button variant="ghost" className="h-8 px-3" onClick={() => downloadBytes(out.bytes, out.name, out.type)}>
                {dict.process.download}
              </Button>
            </li>
          ))}
        </ul>
      )}

      {next.length > 0 && (
        <div className="border-border mt-10 border-t pt-6">
          <p className="text-muted mb-3 text-center text-sm font-semibold">{dict.process.continueWith}</p>
          <ul className="flex flex-wrap justify-center gap-2">
            {next.map((tool) => (
              <li key={tool.href}>
                <Link
                  href={tool.href}
                  className="border-border hover:bg-surface-2 inline-flex items-center gap-2 rounded-full border px-4 py-2 text-sm font-medium transition"
                >
                  <ToolIcon name={tool.icon} className="size-4" style={{ color: `var(--cat-${tool.category})` }} />
                  {tool.name}
                </Link>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
