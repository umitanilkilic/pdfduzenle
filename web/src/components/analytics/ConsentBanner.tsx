"use client";

import Link from "next/link";
import { useEffect, useState, useSyncExternalStore } from "react";
import { Button } from "@/components/tool/ui";
import {
  CONSENT_CHANGE_EVENT,
  CONSENT_OPEN_EVENT,
  consentUpdate,
  readConsent,
  writeConsent,
  type ConsentChoice,
} from "@/lib/analytics/consent";
import { expiredAnalyticsCookies } from "@/lib/analytics/cookies";
import { loadClarity } from "./clarity";
import "./window";

function storage(): Storage | null {
  try {
    return window.localStorage;
  } catch {
    return null;
  }
}

function subscribe(onChange: () => void) {
  window.addEventListener(CONSENT_CHANGE_EVENT, onChange);
  window.addEventListener("storage", onChange);
  return () => {
    window.removeEventListener(CONSENT_CHANGE_EVENT, onChange);
    window.removeEventListener("storage", onChange);
  };
}

interface Labels {
  text: string;
  accept: string;
  reject: string;
  more: string;
  label: string;
}

/**
 * Asks once for analytics consent (Consent Mode v2 for GA; Clarity loads only after "accept").
 * The footer's "Cookie settings" reopens it.
 */
export function ConsentBanner({
  clarityId,
  privacyHref,
  labels,
}: {
  clarityId: string | null;
  privacyHref: string;
  labels: Labels;
}) {
  // "server" until hydrated, so the banner never flashes for visitors who already chose.
  const choice = useSyncExternalStore(
    subscribe,
    () => readConsent(storage()),
    () => "server" as const,
  );
  const [reopened, setReopened] = useState(false);

  useEffect(() => {
    const open = () => setReopened(true);
    window.addEventListener(CONSENT_OPEN_EVENT, open);
    return () => window.removeEventListener(CONSENT_OPEN_EVENT, open);
  }, []);

  useEffect(() => {
    if (choice === "granted" && clarityId) loadClarity(clarityId);
  }, [choice, clarityId]);

  if (choice === "server" || (choice !== null && !reopened)) return null;

  function decide(next: ConsentChoice) {
    const wasGranted = choice === "granted";
    writeConsent(storage(), next);
    window.gtag?.("consent", "update", consentUpdate(next));
    setReopened(false);
    window.dispatchEvent(new Event(CONSENT_CHANGE_EVENT));
    if (next === "denied" && wasGranted) {
      for (const cookie of expiredAnalyticsCookies(document.cookie, location.hostname)) document.cookie = cookie;
      // A loaded Clarity can't be stopped; reloading drops it.
      if (clarityId) location.reload();
    }
  }

  return (
    <div
      role="dialog"
      aria-label={labels.label}
      data-testid="consent-banner"
      className="border-border bg-surface fixed inset-x-3 bottom-3 z-50 rounded-2xl border p-4 shadow-2xl sm:right-auto sm:left-4 sm:max-w-md"
    >
      <p className="text-sm">
        {labels.text}{" "}
        <Link href={privacyHref} className="text-brand font-medium underline-offset-2 hover:underline">
          {labels.more}
        </Link>
      </p>
      <div className="mt-3 grid grid-cols-2 gap-2">
        <Button variant="secondary" className="h-10" onClick={() => decide("denied")}>
          {labels.reject}
        </Button>
        <Button className="h-10" onClick={() => decide("granted")}>
          {labels.accept}
        </Button>
      </div>
    </div>
  );
}
