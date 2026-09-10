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
  // 'unsafe-eval' is React Refresh in development, not anything a production
  // build does, so it is scoped the same way the dev websocket below is. It
  // being in the shipped header was a default nobody revisited: it permits
  // eval and new Function on the origin holding every customer record.
  //
  // 'unsafe-inline' stays. Next.js hydration ships inline scripts and there is
  // no nonce plumbing here yet; the header still refuses script from any other
  // origin, which is the vector that matters.
  `script-src 'self' 'unsafe-inline'${
    process.env.NODE_ENV === "development" ? " 'unsafe-eval'" : ""
  }`,
  "style-src 'self' 'unsafe-inline'",
  // Profile photos are served from the Supabase storage bucket, so the origin
  // has to be named here or every avatar is blocked. blob: covers the local
  // crop preview shown before a photo is uploaded, data: the inline SVG marks.
  "img-src 'self' data: blob: https://*.supabase.co",
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
  // The team workspace moved from the site root to /admin so an intern or
  // employee token cannot reach it by loading "/", and so the client portal
  // owns /portal outright. These keep every link that was ever shared or
  // bookmarked working, pointing at the same page in its new home rather than
  // dropping people on a 404 or on the workspace home.
  async redirects() {
    const moved = ["leads", "customers", "tasks", "projects", "proposals",
                   "invoices", "files", "reports", "automation", "settings",
                   "enquiries", "requests", "analytics"];
    // Not on a workspace address. Each of those serves one workspace and
    // writes its paths without the prefix, so on client.mucolabs.com a bare
    // /requests is the customer's own request list -- sending it to
    // /admin/requests would hand a customer a team URL and then refuse them.
    const notAWorkspaceAddress = [
      { type: "host" as const, value: "(admin|client|intern|employee)\..*" },
    ];
    return moved.flatMap(section => [
      { source: `/${section}`, destination: `/admin/${section}`, permanent: true, missing: notAWorkspaceAddress },
      { source: `/${section}/:path*`, destination: `/admin/${section}/:path*`, permanent: true, missing: notAWorkspaceAddress },
    ]);
  },

  // The repository contains a separate lockfile for the static marketing site.
  // Pin Turbopack to this app so local and Vercel builds do not infer the
  // parent workspace and emit a root warning.
  turbopack: {
    root: process.cwd(),
  },
  async headers() {
    return [
      {
        source: "/:path*",
        headers: [
          { key: "Content-Security-Policy", value: csp },
          // Belt and braces beside robots.txt and the per-page meta tag: this
          // covers responses that never render HTML, where a meta robots tag
          // has nowhere to live.
          { key: "X-Robots-Tag", value: "noindex, nofollow" },
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
