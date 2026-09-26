"use client";

import { createContext, useContext } from "react";
import { createAnalytics, type Analytics, type GtagEvent } from "@/lib/analytics/events";
import "./window";

const browserAnalytics = createAnalytics(() =>
  typeof window === "undefined" ? undefined : (window.gtag as GtagEvent | undefined),
);

/** Tests (or previews) can provide a fake; the default sends to gtag when it exists. */
export const AnalyticsContext = createContext<Analytics>(browserAnalytics);

export function useAnalytics(): Analytics {
  return useContext(AnalyticsContext);
}
