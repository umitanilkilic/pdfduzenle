import { gtagInitScript } from "@/lib/analytics/consent";

/** Google Analytics with Consent Mode v2: the consent defaults run before gtag.js loads. */
export function GtagScripts({ gaId }: { gaId: string }) {
  return (
    <>
      <script dangerouslySetInnerHTML={{ __html: gtagInitScript(gaId) }} />
      <script async src={`https://www.googletagmanager.com/gtag/js?id=${gaId}`} />
    </>
  );
}
