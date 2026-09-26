/** Third-party IDs, fixed at build time. Unset or malformed IDs keep that service off. */
export interface AnalyticsIds {
  /** Google Analytics 4 measurement ID, e.g. "G-ABC123DEF4". */
  ga: string | null;
  /** Microsoft Clarity project ID. */
  clarity: string | null;
}

// IDs end up inside inline scripts and URLs, so only their documented shapes are accepted.
const GA_ID = /^G-[A-Z0-9]{4,20}$/;
const CLARITY_ID = /^[a-z0-9]{6,20}$/;

export function parseAnalyticsIds(env: { ga?: string; clarity?: string }): AnalyticsIds {
  const ga = env.ga?.trim() ?? "";
  const clarity = env.clarity?.trim() ?? "";
  return { ga: GA_ID.test(ga) ? ga : null, clarity: CLARITY_ID.test(clarity) ? clarity : null };
}

// Literal `process.env.NEXT_PUBLIC_*` accesses so Next inlines them into client bundles.
export const analyticsIds = parseAnalyticsIds({
  ga: process.env.NEXT_PUBLIC_GA_ID,
  clarity: process.env.NEXT_PUBLIC_CLARITY_ID,
});

export function analyticsEnabled(ids: AnalyticsIds): boolean {
  return ids.ga !== null || ids.clarity !== null;
}

/** Search engine site verification tokens (Search Console, Bing, Yandex) for the page metadata. */
export function siteVerification(env: { google?: string; bing?: string; yandex?: string }) {
  const token = (v?: string) => (v && /^[A-Za-z0-9_-]{8,100}$/.test(v.trim()) ? v.trim() : undefined);
  const google = token(env.google);
  const bing = token(env.bing);
  const yandex = token(env.yandex);
  if (!google && !bing && !yandex) return undefined;
  return {
    ...(google && { google }),
    ...(yandex && { yandex }),
    ...(bing && { other: { "msvalidate.01": bing } }),
  };
}
