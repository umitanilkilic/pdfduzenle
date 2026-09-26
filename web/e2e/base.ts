import { test as base } from "@playwright/test";

export { expect } from "@playwright/test";

/** Third-party analytics hosts; e2e builds use test IDs, so these are stubbed, never contacted. */
const THIRD_PARTY = /googletagmanager\.com|google-analytics\.com|analytics\.google\.com|clarity\.ms|c\.bing\.com/;

/**
 * Every spec imports `test` from here. Analytics requests get an empty script, and the consent banner is
 * pre-answered ("denied") so it doesn't cover the page; analytics.spec.ts sets `consent` to test it.
 */
export const test = base.extend<{ consent: "granted" | "denied" | null }>({
  consent: ["denied", { option: true }],
  // The fixture callback is named `provide`: ESLint mistakes Playwright's usual `use` for a React hook.
  context: async ({ context, consent }, provide) => {
    await context.route(THIRD_PARTY, (route) =>
      route.fulfill({ status: 200, contentType: "text/javascript", body: "" }),
    );
    if (consent) {
      await context.addInitScript((choice) => {
        try {
          if (!localStorage.getItem("analytics-consent")) localStorage.setItem("analytics-consent", choice);
        } catch {
          // Opaque origins (about:blank) have no storage.
        }
      }, consent);
    }
    await provide(context);
  },
});
