import type { NextConfig } from "next";

// The marketing site sets these in vercel.json; the portal had none at all,
// which is backwards -- this is the half that holds sessions and customer
// records. A login page with no X-Frame-Options can be framed and clickjacked.
//
// The CSP is deliberately looser than the marketing site's: Next.js hydration
// ships inline scripts, and there is no nonce plumbing here, so 'unsafe-inline'
// stays until there is. It still refuses script from any other origin, which is
// the vector that matters. connect-src has to name Supabase or every query and
// the realtime socket fail -- verified locally before committing.
const csp = [
  "default-src 'self'",
  "script-src 'self' 'unsafe-inline' 'unsafe-eval'",
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data: blob:",
  "font-src 'self' data:",
  // Next.js talks to its own dev server over a websocket for hot reload. That
  // is a development-only origin, so it is added only in development rather
  // than widened in the header that ships to production.
  `connect-src 'self' https://*.supabase.co wss://*.supabase.co${
    process.env.NODE_ENV === "development" ? " ws://localhost:* http://localhost:*" : ""
  }`,
  "form-action 'self'",
  "frame-ancestors 'none'",
  "base-uri 'self'",
  "object-src 'none'",
].join("; ");

const nextConfig: NextConfig = {
  async headers() {
    return [
      {
        source: "/:path*",
        headers: [
          { key: "Content-Security-Policy", value: csp },
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "X-Frame-Options", value: "DENY" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          { key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains" },
          {
            key: "Permissions-Policy",
            value: "camera=(), microphone=(), geolocation=(), payment=(), usb=(), interest-cohort=()",
          },
        ],
      },
    ];
  },
};

export default nextConfig;
