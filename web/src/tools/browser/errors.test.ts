import { describe, expect, it } from "vitest";
import { getDictionary } from "@/i18n";
import { PdfToolError, type PdfErrorCode } from "@/pdf/errors";
import { errorMessage } from "./errors";

describe("errorMessage", () => {
  const dict = getDictionary("tr");

  it("translates every PdfToolError code", () => {
    const codes = Object.keys(dict.errors).filter((c) => c !== "unknown") as PdfErrorCode[];
    for (const code of codes) expect(errorMessage(new PdfToolError(code), dict)).toBe(dict.errors[code]);
  });

  it("falls back to a generic message", () => {
    expect(errorMessage(new Error("boom"), dict)).toBe(dict.errors.unknown);
    expect(errorMessage("x", dict)).toBe(dict.errors.unknown);
  });
});
