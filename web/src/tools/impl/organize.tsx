"use client";

import {
  DndContext,
  KeyboardSensor,
  PointerSensor,
  closestCenter,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  arrayMove,
  rectSortingStrategy,
  sortableKeyboardCoordinates,
  useSortable,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { RotateCcw, RotateCw, Trash2, Undo2 } from "lucide-react";
import { useEffect } from "react";
import { PageThumb } from "@/components/tool/PageThumb";
import { PdfPreviewGate } from "@/components/tool/PdfPreviewGate";
import { useRuntime } from "@/components/tool/runtime";
import type { PdfPreview } from "@/components/tool/usePdfDocument";
import { IconButton } from "@/components/tool/ui";
import { format } from "@/i18n";
import { cn } from "@/lib/cn";
import { readBytes } from "@/lib/files";
import { normalizeRotation } from "@/pdf/geometry";
import type { PagePlan } from "@/pdf/ops/pages";
import { pdfOutput } from "./output";
import type { ToolImpl, ToolViewProps } from "./types";

export interface OrganizeItem extends PagePlan {
  removed: boolean;
}

export interface OrganizeOptions {
  /** Null until the document's page count is known. */
  pages: OrganizeItem[] | null;
}

export function initialPlan(pageCount: number): OrganizeItem[] {
  return Array.from({ length: pageCount }, (_, index) => ({ index, rotate: 0, removed: false }));
}

function Grid({
  preview,
  pages,
  onChange,
}: {
  preview: PdfPreview;
  pages: OrganizeItem[];
  onChange(pages: OrganizeItem[]): void;
}) {
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );
  const ids = pages.map((p) => `p${p.index}`);

  function onDragEnd({ active, over }: DragEndEvent) {
    if (!over || active.id === over.id) return;
    onChange(arrayMove(pages, ids.indexOf(String(active.id)), ids.indexOf(String(over.id))));
  }

  function update(i: number, patch: Partial<OrganizeItem>) {
    onChange(pages.map((p, j) => (j === i ? { ...p, ...patch } : p)));
  }

  return (
    <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={onDragEnd}>
      <SortableContext items={ids} strategy={rectSortingStrategy}>
        <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4">
          {pages.map((page, i) => (
            <Tile
              key={ids[i]}
              id={ids[i]}
              preview={preview}
              page={page}
              onRotate={(delta) => update(i, { rotate: normalizeRotation(page.rotate + delta) })}
              onToggleRemove={() => update(i, { removed: !page.removed })}
            />
          ))}
        </ul>
      </SortableContext>
    </DndContext>
  );
}

function Tile({
  id,
  preview,
  page,
  onRotate,
  onToggleRemove,
}: {
  id: string;
  preview: PdfPreview;
  page: OrganizeItem;
  onRotate(delta: number): void;
  onToggleRemove(): void;
}) {
  const { dict } = useRuntime();
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id });
  const label = format(dict.ui.page, { n: page.index + 1 });

  return (
    <li
      ref={setNodeRef}
      style={{ transform: CSS.Transform.toString(transform), transition }}
      className={cn("border-border bg-surface rounded-xl border p-2", isDragging && "relative z-10 shadow-xl")}
    >
      <div
        className={cn("cursor-grab touch-none active:cursor-grabbing", page.removed && "opacity-30")}
        aria-label={`${label}. ${dict.ui.dragHint}`}
        {...attributes}
        {...listeners}
      >
        <PageThumb thumbs={preview.thumbs} index={page.index} rotate={page.rotate} alt={label} />
      </div>
      <div className="mt-1 flex items-center justify-between">
        <IconButton label={dict.ui.rotateLeft} onClick={() => onRotate(-90)} disabled={page.removed}>
          <RotateCcw className="size-4" aria-hidden />
        </IconButton>
        <span className="text-muted text-xs">{page.index + 1}</span>
        <IconButton label={dict.ui.rotateRight} onClick={() => onRotate(90)} disabled={page.removed}>
          <RotateCw className="size-4" aria-hidden />
        </IconButton>
        <IconButton label={page.removed ? dict.ui.restore : dict.ui.remove} onClick={onToggleRemove}>
          {page.removed ? <Undo2 className="size-4" aria-hidden /> : <Trash2 className="size-4" aria-hidden />}
        </IconButton>
      </div>
    </li>
  );
}

function PlanInitializer({
  pageCount,
  pages,
  onInit,
}: {
  pageCount: number;
  pages: OrganizeItem[] | null;
  onInit(p: OrganizeItem[]): void;
}) {
  useEffect(() => {
    if (!pages) onInit(initialPlan(pageCount));
  }, [pageCount, pages, onInit]);
  return null;
}

function Main({ files, options, setOptions }: ToolViewProps<OrganizeOptions>) {
  const { dict } = useRuntime();
  return (
    <PdfPreviewGate file={files[0]}>
      {(preview) => (
        <>
          <PlanInitializer
            pageCount={preview.doc.pageCount}
            pages={options.pages}
            onInit={(pages) => setOptions({ pages })}
          />
          <p className="text-muted mb-3 text-sm">{dict.ui.dragHint}</p>
          {options.pages && (
            <Grid preview={preview} pages={options.pages} onChange={(pages) => setOptions({ pages })} />
          )}
        </>
      )}
    </PdfPreviewGate>
  );
}

/** Pages that survive, in their new order, as an operation plan. */
export function toPlan(pages: OrganizeItem[]): PagePlan[] {
  return pages.filter((p) => !p.removed).map(({ index, rotate }) => ({ index, rotate }));
}

const organize: ToolImpl<OrganizeOptions> = {
  initialOptions: () => ({ pages: null }),
  Main,
  async run({ files: [file], options }, { engine, dict }) {
    const bytes = await readBytes(file);
    const pages = options.pages ?? initialPlan(await engine.pageCount(bytes));
    return [pdfOutput(file.name, dict.toolUi.organize.output, await engine.organizePages(bytes, toPlan(pages)))];
  },
};

export default organize;
