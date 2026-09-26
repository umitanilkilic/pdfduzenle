import type { AnalyticsIds } from "./analytics/config";

/**
 * Production Content-Security-Policy. Static pages cannot carry per-request nonces, so inline scripts
 * (Next's RSC payload, theme and gtag bootstraps) need 'unsafe-inline'. Everything else is our own origin,
 * plus the analytics hosts of the services that are configured.
 */
export function contentSecurityPolicy(ids: AnalyticsIds): string {
  const script = ["'self'", "'unsafe-inline'"];
  const img = ["'self'", "blob:", "data:"];
  const connect = ["'self'"];
  if (ids.ga) {
    script.push("https://www.googletagmanager.com");
    const hosts = [
      "https://*.google-analytics.com",
      "https://*.analytics.google.com",
      "https://*.googletagmanager.com",
    ];
    img.push(...hosts);
    connect.push(...hosts);
  }
  if (ids.clarity) {
    script.push("https://www.clarity.ms", "https://*.clarity.ms");
    img.push("https://*.clarity.ms", "https://c.bing.com");
    connect.push("https://*.clarity.ms", "https://c.bing.com");
  }
  return [
    "default-src 'self'",
    `script-src ${script.join(" ")}`,
    "style-src 'self' 'unsafe-inline'",
    `img-src ${img.join(" ")}`,
    "font-src 'self'",
    `connect-src ${connect.join(" ")}`,
    "worker-src 'self' blob:",
    "object-src 'none'",
    "base-uri 'self'",
    "form-action 'self'",
    "frame-ancestors 'none'",
  ].join("; ");
}
