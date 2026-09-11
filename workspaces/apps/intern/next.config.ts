import { resolve } from "node:path";
import { fileURLToPath } from "node:url";
import type { NextConfig } from "next";

// Security headers for intern.mucolabs.com.
//
// These four applications hold people and money, so the header set is the same
// on all of them and lives beside each one rather than in a shared helper: a
// header that is wrong is wrong on one origin only, and reviewing it means
// reading the file next to the app it protects.
//
// 'unsafe-inline' for script stays. Next.js hydration ships inline scripts and
// there is no nonce plumbing here yet; the header still refuses script from any
// other origin, which is the vector that matters. 'unsafe-eval' is React
// Refresh, which only runs in development, so it is scoped there — shipping it
// to production would permit eval on the origin holding customer records.
const csp = [
  "default-src 'self'",
  `script-src 'self' 'unsafe-inline'${process.env.NODE_ENV === "development" ? " 'unsafe-eval'" : ""}`,
  "style-src 'self' 'unsafe-inline'",
  // Avatars and uploaded documents are served from Supabase storage, so the
  // origin has to be named or every image is blocked. blob: covers a local
  // preview before upload, data: the inline marks.
  "img-src 'self' data: blob: https://*.supabase.co",
  "font-src 'self'",
  `connect-src 'self' https://*.supabase.co wss://*.supabase.co${
    process.env.NODE_ENV === "development" ? " ws://localhost:* http://localhost:*" : ""
  }`,
  "form-action 'self'",
  "frame-ancestors 'none'",
  "base-uri 'self'",
  "object-src 'none'",
].join("; ");

const nextConfig: NextConfig = {
  // The workspace packages ship as TypeScript source rather than a build step,
  // so Next has to compile them the same way it compiles this app.
  transpilePackages: ["@muco/core", "@muco/ui"],
  // The workspace root, not this app: npm hoists next, react and the two
  // @muco packages to workspaces/node_modules, and a root pinned at the app
  // directory cannot see any of them. Pointing it at the repository root
  // instead would pull in the marketing site lockfile, so it is named exactly.
  turbopack: { root: resolve(fileURLToPath(import.meta.url), "../../..") },
  async headers() {
    return [
      {
        source: "/:path*",
        headers: [
          { key: "Content-Security-Policy", value: csp },
          // Beside robots.txt and the per-page meta tag, because this one also
          // covers responses that never render HTML and so have nowhere to put
          // a meta tag.
          { key: "X-Robots-Tag", value: "noindex, nofollow" },
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "X-Frame-Options", value: "DENY" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          { key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains" },
          { key: "Cross-Origin-Opener-Policy", value: "same-origin" },
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
