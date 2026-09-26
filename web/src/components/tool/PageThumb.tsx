"use client";

import { useEffect, useRef, useState } from "react";
import type { Thumbnails } from "./usePdfDocument";

/** Lazily rendered page thumbnail; `rotate` adds a visual rotation in degrees. */
export function PageThumb({
  thumbs,
  index,
  rotate = 0,
  alt,
}: {
  thumbs: Thumbnails;
  index: number;
  rotate?: number;
  alt: string;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const [url, setUrl] = useState<string>("");

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    let cancelled = false;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (!entry.isIntersecting) return;
        observer.disconnect();
        thumbs.get(index).then((u) => !cancelled && setUrl(u));
      },
      { rootMargin: "200px" },
    );
    observer.observe(el);
    return () => {
      cancelled = true;
      observer.disconnect();
    };
  }, [thumbs, index]);

  return (
    <div ref={ref} className="bg-surface-2 grid aspect-square place-items-center overflow-hidden rounded-lg">
      {url ? (
        // eslint-disable-next-line @next/next/no-img-element -- blob URL rendered in the browser
        <img
          src={url}
          alt={alt}
          draggable={false}
          className="max-h-full max-w-full shadow-sm transition-transform"
          style={{ transform: `rotate(${rotate}deg)` }}
        />
      ) : (
        <div className="bg-border size-1/2 animate-pulse rounded" />
      )}
    </div>
  );
}
