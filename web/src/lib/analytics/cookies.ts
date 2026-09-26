const ANALYTICS_COOKIE = /^(_ga|_gid|_gat|_clck|_clsk)(_|$)/;

/**
 * `document.cookie` assignments that expire the analytics cookies found in `cookieHeader`. GA and Clarity
 * set them on the host or a parent domain, so every candidate domain is covered.
 */
export function expiredAnalyticsCookies(cookieHeader: string, hostname: string): string[] {
  const names = cookieHeader
    .split(";")
    .map((c) => c.split("=")[0].trim())
    .filter((name) => ANALYTICS_COOKIE.test(name));
  const labels = hostname.split(".");
  const domains = [""];
  for (let i = 0; i < labels.length - 1; i++) domains.push(`; domain=.${labels.slice(i).join(".")}`);
  const expired = "=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=/";
  return names.flatMap((name) => domains.map((domain) => `${name}${expired}${domain}`));
}
