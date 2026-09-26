"use client";

import { PageSelectGrid } from "@/components/tool/PageSelectGrid";
import { PdfPreviewGate } from "@/components/tool/PdfPreviewGate";
import { useRuntime } from "@/components/tool/runtime";
import { Button, TextInput } from "@/components/tool/ui";
import { readBytes } from "@/lib/files";
import { formatPageSelection, parsePageSelection } from "@/pdf/pageRanges";
import { pdfOutput } from "./output";
import type { BrowserTool, ToolViewProps } from "./types";

export interface PageSelectionOptions {
  /** Selection as typed/clicked, e.g. "1-3, 5". The text is the single source of truth. */
  selection: string;
}

/** Parses leniently for live previews: an unfinished or invalid entry selects nothing. */
function safeParse(selection: string, pageCount: number): number[] {
  try {
    return parsePageSelection(selection, pageCount);
  } catch {
    return [];
  }
}

/** Remove and extract share the same UI; only the meaning of the selection differs. */
export function createPageSelectionTool(mode: "remove" | "extract"): BrowserTool<PageSelectionOptions> {
  const toolId = mode === "remove" ? "remove-pages" : "extract-pages";

  function Main({ files, options, setOptions }: ToolViewProps<PageSelectionOptions>) {
    return (
      <PdfPreviewGate file={files[0]}>
        {(preview) => {
          const selected = new Set(safeParse(options.selection, preview.doc.pageCount));
          return (
            <PageSelectGrid
              preview={preview}
              selected={selected}
              mark={mode === "remove" ? "remove" : "keep"}
              onToggle={(i) => {
                if (selected.has(i)) selected.delete(i);
                else selected.add(i);
                setOptions({ selection: formatPageSelection([...selected]) });
              }}
            />
          );
        }}
      </PdfPreviewGate>
    );
  }

  function Options({ options, setOptions }: ToolViewProps<PageSelectionOptions>) {
    const { dict } = useRuntime();
    return (
      <>
        <p className="text-muted text-sm">{dict.toolUi[toolId].hint}</p>
        <TextInput
          label={dict.ui.pagesInput}
          placeholder={dict.ui.pagesPlaceholder}
          hint={dict.ui.orClickPages}
          value={options.selection}
          onChange={(e) => setOptions({ selection: e.target.value })}
        />
        {options.selection && (
          <Button variant="ghost" className="h-8 px-3" onClick={() => setOptions({ selection: "" })}>
            {dict.ui.clearSelection}
          </Button>
        )}
      </>
    );
  }

  return {
    initialOptions: () => ({ selection: "" }),
    Main,
    Options,
    async run({ files: [file], options }, { engine, dict }) {
      const bytes = await readBytes(file);
      const indices = parsePageSelection(options.selection, await engine.pageCount(bytes));
      const out =
        mode === "remove" ? await engine.removePages(bytes, indices) : await engine.extractPages(bytes, indices);
      return [pdfOutput(file.name, dict.toolUi[toolId].output, out)];
    },
  };
}
