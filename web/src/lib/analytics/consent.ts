export type ConsentChoice = "granted" | "denied";

/** localStorage key of the visitor's analytics choice. */
export const CONSENT_KEY = "analytics-consent";
/** Window event fired after the choice changes (same tab; other tabs get `storage`). */
export const CONSENT_CHANGE_EVENT = "pdfduzenle:consent-change";
/** Window event that reopens the consent banner (footer "Cookie settings"). */
export const CONSENT_OPEN_EVENT = "pdfduzenle:consent-open";

type ReadableStorage = Pick<Storage, "getItem">;

export function readConsent(storage: ReadableStorage | null): ConsentChoice | null {
  try {
    const value = storage?.getItem(CONSENT_KEY);
    return value === "granted" || value === "denied" ? value : null;
  } catch {
    // Blocked storage (private mode, disabled cookies): treat as "not decided yet".
    return null;
  }
}

export function writeConsent(storage: Pick<Storage, "setItem"> | null, choice: ConsentChoice): void {
  try {
    storage?.setItem(CONSENT_KEY, choice);
  } catch {
    // Without storage the choice lasts for this page view only.
  }
}

/**
 * Inline script that must run before gtag.js (Google Consent Mode v2): ads signals are always denied,
 * analytics storage follows the saved choice and stays denied until the visitor accepts. Without consent
 * gtag sends cookieless pings only.
 */
export function gtagInitScript(gaId: string): string {
  const id = JSON.stringify(gaId);
  const key = JSON.stringify(CONSENT_KEY);
  return `(function(){window.dataLayer=window.dataLayer||[];function gtag(){dataLayer.push(arguments)}window.gtag=gtag;var c=null;try{c=localStorage.getItem(${key})}catch(e){}gtag("consent","default",{ad_storage:"denied",ad_user_data:"denied",ad_personalization:"denied",analytics_storage:c==="granted"?"granted":"denied"});gtag("js",new Date());gtag("config",${id})})()`;
}

/** Consent Mode update after the visitor decides; ads signals stay denied either way. */
export function consentUpdate(choice: ConsentChoice) {
  return {
    ad_storage: "denied",
    ad_user_data: "denied",
    ad_personalization: "denied",
    analytics_storage: choice,
  } as const;
}
