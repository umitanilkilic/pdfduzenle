import { runInNewContext } from "node:vm";
import { describe, expect, it } from "vitest";
import { CONSENT_KEY, consentUpdate, gtagInitScript, readConsent, writeConsent } from "./consent";

function memoryStorage(initial: Record<string, string> = {}) {
  const data = new Map(Object.entries(initial));
  return {
    getItem: (k: string) => data.get(k) ?? null,
    setItem: (k: string, v: string) => void data.set(k, v),
  };
}

/** Runs the inline script in a sandbox and returns what it pushed to dataLayer. */
function runInit(saved: string | null) {
  const window: { dataLayer?: unknown[] } = {};
  const localStorage = memoryStorage(saved ? { [CONSENT_KEY]: saved } : {});
  runInNewContext(gtagInitScript("G-TEST1234"), {
    window,
    localStorage,
    get dataLayer() {
      return window.dataLayer;
    },
  });
  return (window.dataLayer ?? []).map((args) => Array.from(args as ArrayLike<unknown>));
}

describe("readConsent / writeConsent", () => {
  it("round-trips a choice and ignores anything else", () => {
    const storage = memoryStorage();
    expect(readConsent(storage)).toBeNull();
    writeConsent(storage, "granted");
    expect(readConsent(storage)).toBe("granted");
    expect(readConsent(memoryStorage({ [CONSENT_KEY]: "yes" }))).toBeNull();
  });

  it("treats blocked storage as undecided", () => {
    const blocked = {
      getItem: () => {
        throw new Error("SecurityError");
      },
    };
    expect(readConsent(blocked)).toBeNull();
    expect(readConsent(null)).toBeNull();
  });
});

describe("gtagInitScript", () => {
  it("denies everything by default, before config", () => {
    const calls = runInit(null);
    expect(calls[0]).toEqual([
      "consent",
      "default",
      { ad_storage: "denied", ad_user_data: "denied", ad_personalization: "denied", analytics_storage: "denied" },
    ]);
    expect(calls.at(-1)).toEqual(["config", "G-TEST1234"]);
  });

  it("restores a saved grant for analytics only", () => {
    const [, , defaults] = runInit("granted")[0] as [string, string, Record<string, string>];
    expect(defaults.analytics_storage).toBe("granted");
    expect(defaults.ad_storage).toBe("denied");
  });
});

describe("consentUpdate", () => {
  it("never grants ads signals", () => {
    expect(consentUpdate("granted")).toMatchObject({ analytics_storage: "granted", ad_storage: "denied" });
  });
});
