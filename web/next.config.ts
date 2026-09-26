import type { NextConfig } from "next";

const GATEWAY_URL = process.env.GATEWAY_URL ?? "http://localhost:8080";

// Static pages cannot carry per-request nonces, so inline scripts (Next's RSC payload, the theme
// bootstrap) need 'unsafe-inline'. Everything else is locked to our own origin.
const CONTENT_SECURITY_POLICY = [
  "default-src 'self'",
  "script-src 'self' 'unsafe-inline'",
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' blob: data:",
  "font-src 'self'",
  "connect-src 'self'",
  "worker-src 'self' blob:",
  "object-src 'none'",
  "base-uri 'self'",
  "form-action 'self'",
  "frame-ancestors 'none'",
].join("; ");

const nextConfig: NextConfig = {
  output: "standalone",
  poweredByHeader: false,
  // Multiple root layouts ((tr) and (en)) need a global 404 page for unmatched URLs.
  experimental: {
    globalNotFound: true,
    // Uploads to the gateway pass through the /api rewrite; the default 10 MB limit would truncate them.
    // Keep in sync with GATEWAY_MAX_UPLOAD_MB (+1 MB for multipart overhead).
    proxyClientMaxBodySize: "101mb",
  },
  // Server tools talk to the Go gateway through the same origin.
  async rewrites() {
    return [{ source: "/api/:path*", destination: `${GATEWAY_URL}/api/:path*` }];
  },
  async headers() {
    return [
      {
        source: "/:path*",
        headers: [
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          { key: "X-Frame-Options", value: "SAMEORIGIN" },
          { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
          { key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains" },
          // `next dev` needs eval for hot reloading, so the policy only applies to production builds.
          ...(process.env.NODE_ENV === "production"
            ? [{ key: "Content-Security-Policy", value: CONTENT_SECURITY_POLICY }]
            : []),
        ],
      },
    ];
  },
};

export default nextConfig;
