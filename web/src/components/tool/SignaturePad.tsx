"use client";

import { useEffect, useRef } from "react";
import { opaqueBounds } from "@/lib/trim";

/** Freehand drawing surface (mouse, pen, touch). Reports a trimmed PNG canvas after each stroke. */
export function SignaturePad({
  color,
  onChange,
  clearLabel,
}: {
  color: string;
  onChange(canvas: HTMLCanvasElement | null): void;
  clearLabel: string;
}) {
  const ref = useRef<HTMLCanvasElement>(null);
  const drawing = useRef(false);

  useEffect(() => {
    const canvas = ref.current!;
    const ratio = window.devicePixelRatio || 1;
    canvas.width = canvas.clientWidth * ratio;
    canvas.height = canvas.clientHeight * ratio;
    const ctx = canvas.getContext("2d")!;
    ctx.scale(ratio, ratio);
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    ctx.lineWidth = 2.5;
  }, []);

  useEffect(() => {
    ref.current!.getContext("2d")!.strokeStyle = color;
  }, [color]);

  function point(e: React.PointerEvent<HTMLCanvasElement>) {
    const rect = e.currentTarget.getBoundingClientRect();
    return [e.clientX - rect.left, e.clientY - rect.top] as const;
  }

  function end() {
    if (!drawing.current) return;
    drawing.current = false;
    onChange(trimmed(ref.current!));
  }

  function clear() {
    const canvas = ref.current!;
    canvas.getContext("2d")!.clearRect(0, 0, canvas.width, canvas.height);
    onChange(null);
  }

  return (
    <div>
      <canvas
        ref={ref}
        className="border-border h-40 w-full touch-none rounded-xl border bg-white"
        onPointerDown={(e) => {
          e.currentTarget.setPointerCapture(e.pointerId);
          drawing.current = true;
          const ctx = e.currentTarget.getContext("2d")!;
          ctx.beginPath();
          ctx.moveTo(...point(e));
        }}
        onPointerMove={(e) => {
          if (!drawing.current) return;
          const ctx = e.currentTarget.getContext("2d")!;
          ctx.lineTo(...point(e));
          ctx.stroke();
        }}
        onPointerUp={end}
        onPointerCancel={end}
      />
      <button type="button" onClick={clear} className="text-muted hover:text-fg mt-2 text-sm font-medium">
        {clearLabel}
      </button>
    </div>
  );
}

/** Copy of `source` cropped to its drawn area (with a small padding). */
export function trimmed(source: HTMLCanvasElement): HTMLCanvasElement | null {
  const ctx = source.getContext("2d")!;
  const box = opaqueBounds(ctx.getImageData(0, 0, source.width, source.height).data, source.width, source.height);
  if (!box) return null;
  const pad = 4;
  const out = document.createElement("canvas");
  out.width = box.width + pad * 2;
  out.height = box.height + pad * 2;
  out.getContext("2d")!.drawImage(source, box.x, box.y, box.width, box.height, pad, pad, box.width, box.height);
  return out;
}
