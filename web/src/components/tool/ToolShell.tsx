"use client";

import { AlertCircle, Loader2 } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { useAnalytics } from "@/components/analytics/context";
import { cn } from "@/lib/cn";
import { errorCode, errorMessage } from "@/tools/impl/shared/errors";
import type { JobStage } from "@/api/gateway";
import { matchesAccept } from "@/lib/files";
import type { ToolImpl, OutputFile } from "@/tools/impl/shared/types";
import { useWorkspace } from "@/workspace/context";
import { toFile, toNewFiles } from "@/workspace/files";
import { readHandoffIds } from "@/workspace/handoff";
import { Dropzone } from "./Dropzone";
import { FileBar, FileList } from "./FileList";
import { SingleFileView } from "./SingleFileView";
import { ResultPanel } from "./ResultPanel";
import { useRuntime } from "./runtime";
import type { NextTool } from "./types";
import { Button } from "./ui";

type Phase =
  | { kind: "edit" }
  | { kind: "working"; stage: JobStage }
  | { kind: "done"; outputs: OutputFile[]; savedIds: string[] }
  | { kind: "error"; message: string };

interface Props<O> {
  toolId: string;
  tool: ToolImpl<O>;
  accept: string;
  multiple: boolean;
  zipName: string;
  next: NextTool[];
}

export function ToolShell<O>({ toolId, tool, accept, multiple, zipName, next }: Props<O>) {
  const services = useRuntime();
  const workspace = useWorkspace();
  const analytics = useAnalytics();
  const { dict } = services;
  const [files, setFilesState] = useState<File[]>([]);
  const [options, setOptionsState] = useState<O>(() => tool.initialOptions(services));
  const [phase, setPhase] = useState<Phase>({ kind: "edit" });

  // Files handed over from another tool (`?files=id1,id2`) are loaded from the device store.
  useEffect(() => {
    const ids = readHandoffIds(window.location.search);
    if (ids.length === 0) return;
    window.history.replaceState(null, "", window.location.pathname);
    workspace
      .get(ids)
      .then((stored) => {
        const usable = stored.map(toFile).filter((f) => matchesAccept(f, accept));
        if (usable.length) setFilesState(multiple ? usable : usable.slice(0, 1));
      })
      .catch((err) => console.warn("Could not load handed-over files", err));
  }, [workspace, accept, multiple]);

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
      analytics.toolFailed(toolId, invalid);
      setPhase({ kind: "error", message: dict.errors[invalid] });
      return;
    }
    setPhase({ kind: "working", stage: "working" });
    analytics.toolStarted(toolId, files.length);
    const startedAt = performance.now();
    try {
      const report = (stage: JobStage) => setPhase({ kind: "working", stage });
      const outputs = await tool.run({ files, options, report }, services);
      // Keeping results is a convenience; a full or blocked storage must not fail the job.
      const saved = await workspace.add(toNewFiles(outputs, toolId)).catch((err) => {
        console.warn("Could not keep results on this device", err);
        return [];
      });
      analytics.toolSucceeded(toolId, outputs.length, performance.now() - startedAt);
      setPhase({ kind: "done", outputs, savedIds: saved.map((f) => f.id) });
    } catch (err) {
      if (process.env.NODE_ENV !== "production") console.error(err);
      analytics.toolFailed(toolId, errorCode(err));
      setPhase({ kind: "error", message: errorMessage(err, dict) });
    }
  }

  function reset() {
    setFilesState([]);
    setOptionsState(tool.initialOptions(services));
    setPhase({ kind: "edit" });
  }

  if (phase.kind === "done") {
    return (
      <ResultPanel
        toolId={toolId}
        outputs={phase.outputs}
        savedIds={phase.savedIds}
        zipName={zipName}
        next={next}
        onReset={reset}
      />
    );
  }

  if (files.length === 0) {
    return <Dropzone accept={accept} multiple={multiple} onFiles={setFiles} />;
  }

  const view = { files, setFiles, options, setOptions };
  const { Main, Options } = tool;
  const working = phase.kind === "working";

  return (
    // Mobile: bottom padding leaves room for the fixed start button.
    <div className="grid gap-6 pb-24 lg:grid-cols-[1fr_20rem] lg:pb-0">
      <div className="border-border bg-surface-2/50 min-w-0 rounded-3xl border p-4 sm:p-6">
        {Main && !multiple && <FileBar file={files[0]} onRemove={() => setFiles([])} />}
        {Main ? (
          <Main {...view} />
        ) : files.length === 1 ? (
          <SingleFileView file={files[0]} onRemove={() => setFiles([])} />
        ) : (
          <FileList files={files} onChange={setFiles} sortable={multiple} />
        )}
        {multiple && (
          <div className="mt-4">
            <Dropzone accept={accept} multiple compact onFiles={(added) => setFiles([...files, ...added])} />
          </div>
        )}
      </div>

      <aside
        className={cn(
          "border-border bg-surface flex flex-col gap-6 rounded-3xl border p-5 lg:sticky lg:top-20 lg:self-start",
          // With a custom main view (page preview) the options come first on phones, e.g. create a signature, then place it.
          Main && Options && "max-lg:order-first",
        )}
      >
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
        <Button
          className="h-13 w-full text-base max-lg:fixed max-lg:inset-x-4 max-lg:bottom-4 max-lg:z-30 max-lg:w-auto max-lg:shadow-xl"
          onClick={start}
          disabled={working}
          data-testid="start"
        >
          {working ? <Loader2 className="size-5 animate-spin" aria-hidden /> : null}
          {phase.kind === "working" ? dict.process[phase.stage] : dict.process.start}
        </Button>
      </aside>
    </div>
  );
}
