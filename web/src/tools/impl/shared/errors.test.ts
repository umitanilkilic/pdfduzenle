import { describe, expect, it } from "vitest";
import { GatewayError, type GatewayErrorCode } from "@/api/gateway";
import { getDictionary } from "@/i18n";
import { PdfToolError, type PdfErrorCode } from "@/pdf/errors";
import { errorCode, errorMessage } from "./errors";

describe("errorMessage", () => {
  const dict = getDictionary("tr");

  it("translates every PdfToolError code", () => {
    const codes = Object.keys(dict.errors).filter((c) => c !== "unknown") as PdfErrorCode[];
    for (const code of codes) expect(errorMessage(new PdfToolError(code), dict)).toBe(dict.errors[code]);
  });

  it("translates gateway error codes", () => {
    const codes: GatewayErrorCode[] = ["wrongPassword", "rateLimited", "tooLarge", "network", "busy"];
    for (const code of codes) expect(errorMessage(new GatewayError(code), dict)).toBe(dict.errors[code]);
  });

  it("falls back to a generic message", () => {
    expect(errorMessage(new Error("boom"), dict)).toBe(dict.errors.unknown);
    expect(errorMessage("x", dict)).toBe(dict.errors.unknown);
  });
});

describe("errorCode", () => {
  it("keeps known codes and hides unexpected errors behind unknown", () => {
    expect(errorCode(new PdfToolError("encrypted"))).toBe("encrypted");
    expect(errorCode(new GatewayError("busy"))).toBe("busy");
    expect(errorCode(new Error("/home/user/secret.pdf failed"))).toBe("unknown");
  });
});
