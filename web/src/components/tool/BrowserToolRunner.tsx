"use client";

import { Loader2 } from "lucide-react";
import { useEffect, useState } from "react";
import { browserTools, type AnyBrowserTool } from "@/tools/browser";
import type { ToolId } from "@/tools/registry";
import { ToolShell } from "./ToolShell";
import type { NextTool } from "./types";

interface Props {
  toolId: ToolId;
  accept: string;
  multiple: boolean;
  zipName: string;
  next: NextTool[];
}

export function BrowserToolRunner({ toolId, ...rest }: Props) {
  const [tool, setTool] = useState<AnyBrowserTool | null>(null);

  useEffect(() => {
    let cancelled = false;
    browserTools[toolId]?.().then((mod) => !cancelled && setTool(mod.default));
    return () => {
      cancelled = true;
    };
  }, [toolId]);

  if (!tool) {
    return (
      <div className="border-border bg-surface grid min-h-72 place-items-center rounded-3xl border-2 border-dashed">
        <Loader2 className="text-muted size-8 animate-spin" aria-hidden />
      </div>
    );
  }
  return <ToolShell tool={tool} {...rest} />;
}
