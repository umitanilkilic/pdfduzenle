import type { Dictionary } from "@/i18n";
import type { ErrorKey } from "./types";
import { GatewayError } from "@/api/gateway";
import { PdfToolError } from "@/pdf/errors";

/** The dictionary key of any thrown value; unexpected errors are "unknown". */
export function errorCode(err: unknown): ErrorKey {
  return err instanceof PdfToolError || err instanceof GatewayError ? err.code : "unknown";
}

/** Turns any thrown value into a translated, user-facing message. */
export function errorMessage(err: unknown, dict: Dictionary): string {
  return dict.errors[errorCode(err)];
}
