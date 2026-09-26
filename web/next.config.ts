import type { NextConfig } from "next";
import { analyticsIds } from "./src/lib/analytics/config";
import { contentSecurityPolicy } from "./src/lib/csp";

const GATEWAY_URL = process.env.GATEWAY_URL ?? "http://localhost:8080";

// Only in production: `next dev` needs eval for hot reloading.
const CONTENT_SECURITY_POLICY = contentSecurityPolicy(analyticsIds);

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
          ...(process.env.NODE_ENV === "production"
            ? [{ key: "Content-Security-Policy", value: CONTENT_SECURITY_POLICY }]
            : []),
        ],
      },
    ];
  },
};

export default nextConfig;
