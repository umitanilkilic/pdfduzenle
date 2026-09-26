"use client";

import { DndContext, closestCenter, type DragEndEvent } from "@dnd-kit/core";
import { SortableContext, arrayMove, useSortable, verticalListSortingStrategy } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { FileText, GripVertical, ImageIcon, X } from "lucide-react";
import { useMemo } from "react";
import { formatBytes } from "@/lib/files";
import { useSortSensors } from "./sortable";
import { useRuntime } from "./runtime";
import { IconButton } from "./ui";

/** Stable per-file keys so React and dnd-kit can track files across reorders. */
const keys = new WeakMap<File, string>();
let counter = 0;
function fileKey(file: File): string {
  let key = keys.get(file);
  if (!key) keys.set(file, (key = `f${++counter}`));
  return key;
}

export function FileList({
  files,
  onChange,
  sortable,
}: {
  files: File[];
  onChange(files: File[]): void;
  sortable: boolean;
}) {
  const { dict } = useRuntime();
  const ids = useMemo(() => files.map(fileKey), [files]);
  const sensors = useSortSensors(4);

  function onDragEnd({ active, over }: DragEndEvent) {
    if (!over || active.id === over.id) return;
    onChange(arrayMove(files, ids.indexOf(String(active.id)), ids.indexOf(String(over.id))));
  }

  return (
    <div>
      {sortable && files.length > 1 && <p className="text-muted mb-3 text-sm">{dict.ui.dragHint}</p>}
      <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={onDragEnd}>
        <SortableContext items={ids} strategy={verticalListSortingStrategy}>
          <ul className="space-y-2">
            {files.map((file, i) => (
              <Row
                key={ids[i]}
                id={ids[i]}
                file={file}
                sortable={sortable && files.length > 1}
                onRemove={() => onChange(files.filter((_, j) => j !== i))}
              />
            ))}
          </ul>
        </SortableContext>
      </DndContext>
    </div>
  );
}

function Row({ id, file, sortable, onRemove }: { id: string; file: File; sortable: boolean; onRemove(): void }) {
  const { dict, locale } = useRuntime();
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id,
    disabled: !sortable,
  });
  const Icon = file.type.startsWith("image/") ? ImageIcon : FileText;

  return (
    <li
      ref={setNodeRef}
      style={{ transform: CSS.Transform.toString(transform), transition }}
      className={`border-border bg-surface flex items-center gap-3 rounded-2xl border p-3 ${isDragging ? "relative z-10 shadow-xl" : ""}`}
    >
      {sortable && (
        <button
          type="button"
          className="text-muted cursor-grab touch-none active:cursor-grabbing"
          aria-label={dict.ui.dragHint}
          {...attributes}
          {...listeners}
        >
          <GripVertical className="size-5" aria-hidden />
        </button>
      )}
      <span className="bg-brand-soft text-brand grid size-10 shrink-0 place-items-center rounded-xl">
        <Icon className="size-5" aria-hidden />
      </span>
      <span className="min-w-0 flex-1">
        <span className="block truncate text-sm font-medium">{file.name}</span>
        <span className="text-muted text-xs">{formatBytes(file.size, locale)}</span>
      </span>
      <IconButton label={dict.dropzone.remove} onClick={onRemove}>
        <X className="size-4" aria-hidden />
      </IconButton>
    </li>
  );
}
