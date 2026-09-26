"use client";

import { useEffect, useState } from "react";
import type { Thumbnails } from "./usePdfDocument";

/** A large page render (for placing signatures, crop previews). */
export function PageImage({
  thumbs,
  index,
  size = 900,
  alt,
  children,
}: {
  thumbs: Thumbnails;
  index: number;
  size?: number;
  alt: string;
  /** Overlays positioned relative to the page image. */
  children?: React.ReactNode;
}) {
  const [loaded, setLoaded] = useState<{ index: number; url: string } | null>(null);

  useEffect(() => {
    let cancelled = false;
    thumbs.get(index, size).then((url) => !cancelled && setLoaded({ index, url }));
    return () => {
      cancelled = true;
    };
  }, [thumbs, index, size]);

  const url = loaded?.index === index ? loaded.url : "";
  return (
    <div className="relative mx-auto w-fit max-w-full select-none">
      {url ? (
        // eslint-disable-next-line @next/next/no-img-element -- blob URL rendered in the browser
        <img src={url} alt={alt} draggable={false} className="block max-h-[70vh] max-w-full shadow-md" />
      ) : (
        <div className="bg-border aspect-[1/1.414] w-72 animate-pulse rounded" />
      )}
      {url && children}
    </div>
  );
}
