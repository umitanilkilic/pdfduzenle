"use client";

import { CONSENT_OPEN_EVENT } from "@/lib/analytics/consent";

export function ConsentSettingsButton({ label }: { label: string }) {
  return (
    <button
      type="button"
      className="hover:text-fg underline-offset-2 hover:underline"
      onClick={() => window.dispatchEvent(new Event(CONSENT_OPEN_EVENT))}
    >
      {label}
    </button>
  );
}
