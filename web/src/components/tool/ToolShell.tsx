"use client";

import { AlertCircle, Loader2 } from "lucide-react";
import { useCallback, useState } from "react";
import { errorMessage } from "@/tools/impl/errors";
import type { JobStage } from "@/api/gateway";
import type { ToolImpl, OutputFile } from "@/tools/impl/types";
import { Dropzone } from "./Dropzone";
import { FileList } from "./FileList";
import { ResultPanel } from "./ResultPanel";
import { useRuntime } from "./runtime";
import type { NextTool } from "./types";
import { Button } from "./ui";

type Phase =
  | { kind: "edit" }
  | { kind: "working"; stage: JobStage }
  | { kind: "done"; outputs: OutputFile[] }
  | { kind: "error"; message: string };

interface Props<O> {
  tool: ToolImpl<O>;
  accept: string;
  multiple: boolean;
  zipName: string;
  next: NextTool[];
}

export function ToolShell<O>({ tool, accept, multiple, zipName, next }: Props<O>) {
  const services = useRuntime();
  const { dict } = services;
  const [files, setFilesState] = useState<File[]>([]);
  const [options, setOptionsState] = useState<O>(() => tool.initialOptions(services));
  const [phase, setPhase] = useState<Phase>({ kind: "edit" });

  function setFiles(next: File[]) {
    // Single-file tools keep per-document options (page selections), so start fresh for a new document.
    if (!multiple) setOptionsState(tool.initialOptions(services));
    setFilesState(next);
    setPhase({ kind: "edit" });
  }

  // Stable so tool views can use it in effect dependencies.
  const setOptions = useCallback((update: Partial<O>) => {
    setOptionsState((prev) => ({ ...prev, ...update }));
    setPhase((prev) => (prev.kind === "error" ? { kind: "edit" } : prev));
  }, []);

  async function start() {
    const invalid = tool.validate?.(options);
    if (invalid) {
      setPhase({ kind: "error", message: dict.errors[invalid] });
      return;
    }
    setPhase({ kind: "working", stage: "working" });
    try {
      const report = (stage: JobStage) => setPhase({ kind: "working", stage });
      const outputs = await tool.run({ files, options, report }, services);
      setPhase({ kind: "done", outputs });
    } catch (err) {
      if (process.env.NODE_ENV !== "production") console.error(err);
      setPhase({ kind: "error", message: errorMessage(err, dict) });
    }
  }

  function reset() {
    setFilesState([]);
    setOptionsState(tool.initialOptions(services));
    setPhase({ kind: "edit" });
  }

  if (phase.kind === "done") {
    return <ResultPanel outputs={phase.outputs} zipName={zipName} next={next} onReset={reset} />;
  }

  if (files.length === 0) {
    return <Dropzone accept={accept} multiple={multiple} onFiles={setFiles} />;
  }

  const view = { files, setFiles, options, setOptions };
  const { Main, Options } = tool;
  const working = phase.kind === "working";

  return (
    <div className="grid gap-6 lg:grid-cols-[1fr_20rem]">
      <div className="border-border bg-surface-2/50 min-w-0 rounded-3xl border p-4 sm:p-6">
        {Main ? <Main {...view} /> : <FileList files={files} onChange={setFiles} sortable={multiple} />}
        {multiple && (
          <div className="mt-4">
            <Dropzone accept={accept} multiple compact onFiles={(added) => setFiles([...files, ...added])} />
          </div>
        )}
      </div>

      <aside className="border-border bg-surface flex flex-col gap-6 rounded-3xl border p-5 lg:sticky lg:top-20 lg:self-start">
        {Options && (
          <div className="space-y-5">
            <h2 className="text-lg font-bold">{dict.ui.options}</h2>
            <Options {...view} />
          </div>
        )}
        {phase.kind === "error" && (
          <p role="alert" className="bg-danger/10 text-danger flex gap-2 rounded-xl p-3 text-sm">
            <AlertCircle className="mt-0.5 size-4 shrink-0" aria-hidden />
            {phase.message}
          </p>
        )}
        <Button className="h-13 w-full text-base" onClick={start} disabled={working} data-testid="start">
          {working ? <Loader2 className="size-5 animate-spin" aria-hidden /> : null}
          {phase.kind === "working" ? dict.process[phase.stage] : dict.process.start}
        </Button>
      </aside>
    </div>
  );
}
