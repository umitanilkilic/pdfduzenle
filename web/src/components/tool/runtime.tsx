"use client";

import { createContext, useContext, useState } from "react";
import { createGatewayClient, type GatewayClient } from "@/api/gateway";
import type { Dictionary } from "@/i18n";
import type { Locale } from "@/i18n/config";
import { createWorkerEngine } from "@/pdf/client";
import type { PdfEngine } from "@/pdf/engine";
import { FONT_FILES, type FontFace } from "@/pdf/fonts";
import type { ToolServices } from "@/tools/impl/shared/types";

const RuntimeContext = createContext<ToolServices | null>(null);

const fontPromises = new Map<FontFace, Promise<Uint8Array>>();

function loadDefaultFont(face: FontFace = "regular"): Promise<Uint8Array> {
  let promise = fontPromises.get(face);
  if (!promise) {
    promise = fetch(`/fonts/${FONT_FILES[face]}`).then(async (res) => {
      if (!res.ok) throw new Error(`Font request failed: ${res.status}`);
      return new Uint8Array(await res.arrayBuffer());
    });
    // A failed download can be retried on the next run.
    promise.catch(() => fontPromises.delete(face));
    fontPromises.set(face, promise);
  }
  return promise;
}

/** Provides the services every tool needs. Pass `engine`/`gateway`/`loadFont` to swap them (tests, previews). */
export function ToolRuntimeProvider({
  dict,
  locale,
  engine,
  gateway,
  loadFont = loadDefaultFont,
  children,
}: {
  dict: Dictionary;
  locale: Locale;
  engine?: PdfEngine;
  gateway?: GatewayClient;
  loadFont?: (face?: FontFace) => Promise<Uint8Array>;
  children: React.ReactNode;
}) {
  const [services] = useState<ToolServices>(() => ({
    engine: engine ?? createWorkerEngine(),
    gateway: gateway ?? createGatewayClient(),
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
