import type { Dictionary } from "@/i18n";
import { GatewayError } from "@/api/gateway";
import { PdfToolError } from "@/pdf/errors";

/** Turns any thrown value into a translated, user-facing message. */
export function errorMessage(err: unknown, dict: Dictionary): string {
  if (err instanceof PdfToolError || err instanceof GatewayError) return dict.errors[err.code];
  return dict.errors.unknown;
}
