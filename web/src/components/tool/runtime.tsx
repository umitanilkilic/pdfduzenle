"use client";

import { createContext, useContext, useState } from "react";
import type { Dictionary } from "@/i18n";
import type { Locale } from "@/i18n/config";
import { createWorkerEngine } from "@/pdf/client";
import type { PdfEngine } from "@/pdf/engine";
import type { ToolServices } from "@/tools/browser/types";

const RuntimeContext = createContext<ToolServices | null>(null);

let fontPromise: Promise<Uint8Array> | null = null;

function loadDefaultFont(): Promise<Uint8Array> {
  fontPromise ??= fetch("/fonts/Inter-400.ttf").then(async (res) => {
    if (!res.ok) throw new Error(`Font request failed: ${res.status}`);
    return new Uint8Array(await res.arrayBuffer());
  });
  return fontPromise;
}

/** Provides the services every browser tool needs. Pass `engine`/`loadFont` to swap them (tests, previews). */
export function ToolRuntimeProvider({
  dict,
  locale,
  engine,
  loadFont = loadDefaultFont,
  children,
}: {
  dict: Dictionary;
  locale: Locale;
  engine?: PdfEngine;
  loadFont?: () => Promise<Uint8Array>;
  children: React.ReactNode;
}) {
  const [services] = useState<ToolServices>(() => ({
    engine: engine ?? createWorkerEngine(),
    loadFont,
    dict,
    locale,
  }));
  return <RuntimeContext value={services}>{children}</RuntimeContext>;
}

export function useRuntime(): ToolServices {
  const services = useContext(RuntimeContext);
  if (!services) throw new Error("useRuntime must be used inside ToolRuntimeProvider");
  return services;
}
