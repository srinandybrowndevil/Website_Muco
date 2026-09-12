// One proxy, configured four times.
//
// Each application passes its own workspace key and gets a middleware that
// admits exactly the roles that workspace serves. The alternative — four
// hand-written proxies — is four chances for one of them to be written
// slightly differently, and the one written slightly differently is the one
// that admits an intern to the compensation table.
//
// What this does on every request, in order:
//   1. Redirects a retired hostname to the workspace that replaced it.
//   2. Refuses to serve at all if the database is not configured.
//   3. Refreshes the Supabase session cookies.
//   4. Lets public paths through untouched.
//   5. Sends anybody without a session to sign in, remembering where they were
//      going.
//   6. Sends anybody whose membership is switched off to a page that says so,
//      rather than to onboarding.
//   7. Sends anybody holding another workspace's role to that workspace's
//      address.
//   8. Tells the route which path it is, because a Server Component cannot
//      otherwise find out.

import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { isLocalPreview } from "./preview-mode";
import { isDemoAllowed, isSupabaseConfigured, supabaseAnonKey, supabaseUrl } from "./env";
import { accessSwitchedOff, primaryMembership } from "./membership";
import { PATH_HEADER, isPublicPath, safeInternalPath } from "./paths";
import { urlForWorkspace, workspaceAdmits, workspaceForRole, type WorkspaceKey } from "./workspaces";

export type ProxyOptions = {
  /** Extra paths this application serves without a session. */
  publicPaths?: string[];
  /**
   * A hostname this application answers on but does not belong to, and the
   * workspace it should be sent to instead. portal.mucolabs.com is the only
   * one: retired as a workspace, kept as an address, because it is in several
   * hundred published links.
   */
  redirectHosts?: Record<string, WorkspaceKey>;
};

export function createWorkspaceProxy(workspace: WorkspaceKey, options: ProxyOptions = {}) {
  const extraPublic = options.publicPaths ?? [];
  const isPublic = (path: string) =>
    isPublicPath(path) || extraPublic.some(route => path === route || path.startsWith(`${route}/`));

  return async function proxy(request: NextRequest) {
    const requestHost = request.headers.get("host");
    const path = request.nextUrl.pathname;
    if (isLocalPreview) {
      const hostname = request.nextUrl.hostname;
      if (!(hostname === "localhost" || hostname === "127.0.0.1" || hostname === "[::1]" || hostname.endsWith(".localhost"))) {
        return new NextResponse("Local preview is available on localhost only.", { status: 403 });
      }
      const credentials = ["/signup", "/onboarding", "/forgot-password", "/reset-password", "/accept-invite", "/account/password", "/auth/callback"];
      if (credentials.includes(path)) {
        const target = new URL("/login", request.url);
        const next = safeInternalPath(request.nextUrl.searchParams.get("next"), "/");
        if (next !== "/") target.searchParams.set("next", next);
        return NextResponse.redirect(target);
      }
      const forwarded = new Headers(request.headers);
      forwarded.set(PATH_HEADER, path);
      const result = NextResponse.next({ request: { headers: forwarded } });
      result.headers.set("Cache-Control", "no-store");
      return result;
    }
    if (path === "/api/preview") return new NextResponse(null, { status: 404 });

    // A retired address keeps working by naming its successor, not by serving
    // the same pages under a second name. Two addresses for one product means
    // two sets of cookies and a canonical nobody chose.
    const label = requestHost?.split(":")[0].toLowerCase().split(".")[0];
    const movedTo = label ? options.redirectHosts?.[label] : undefined;
    if (movedTo) {
      const destination = urlForWorkspace(requestHost, movedTo, `${path}${request.nextUrl.search}`);
      if (destination) return NextResponse.redirect(destination, 308);
    }

    if (!isSupabaseConfigured) {
      // Fail closed. Serving a workspace with authentication switched off is
      // worse than serving nothing at all.
      if (!isDemoAllowed) return new NextResponse("This workspace is not configured.", { status: 503 });
      return NextResponse.next({ request });
    }

    let response = NextResponse.next({ request });
    const supabase = createServerClient(supabaseUrl!, supabaseAnonKey!, {
      cookies: {
        getAll: () => request.cookies.getAll(),
        setAll(values) {
          values.forEach(({ name, value }) => request.cookies.set(name, value));
          response = NextResponse.next({ request });
          values.forEach(({ name, value, options: cookieOptions }) =>
            response.cookies.set(name, value, cookieOptions));
        },
      },
    });

    // Redirects have to keep the address the visitor arrived on. Building one
    // from request.url loses it — the runtime reports its own host there, not
    // the one in the request — so a preview deployment would bounce people to
    // the production address to sign in and leave them there afterwards.
    const redirect = (destination: string) => {
      const target = new URL(destination, request.nextUrl.origin);
      if (requestHost) target.host = requestHost;
      const result = NextResponse.redirect(target);
      response.cookies.getAll().forEach(cookie => result.cookies.set(cookie));
      return result;
    };

    const serve = () => {
      const forwarded = new Headers(request.headers);
      forwarded.set(PATH_HEADER, path);
      const next = NextResponse.next({ request: { headers: forwarded } });
      response.cookies.getAll().forEach(cookie => next.cookies.set(cookie));
      return next;
    };

    const { data } = await supabase.auth.getClaims();
    const claims = data?.claims;
    const userId = typeof claims?.sub === "string" ? claims.sub : null;

    if (!userId) {
      if (isPublic(path)) return serve();
      return redirect(`/login?next=${encodeURIComponent(`${path}${request.nextUrl.search}`)}`);
    }

    const { data: rows } = await supabase
      .from("memberships")
      .select("organization_id,role,disabled_at")
      .eq("user_id", userId);
    const membership = primaryMembership(rows);

    if (!membership) {
      if (isPublic(path)) return serve();
      return redirect(accessSwitchedOff(rows) ? "/login?access=closed" : "/login?access=none");
    }

    if (!workspaceAdmits(workspace, membership.role)) {
      const own = urlForWorkspace(requestHost, workspaceForRole(membership.role));
      if (own) {
        const away = NextResponse.redirect(own);
        response.cookies.getAll().forEach(cookie => away.cookies.set(cookie));
        return away;
      }
      // Nowhere to send them — a bare host in development — so say so here.
      if (path === "/login") return serve();
      return redirect(`/login?access=wrong-workspace&belongs=${workspaceForRole(membership.role)}`);
    }

    // Already signed in and standing on the sign-in page. Honour the
    // destination they asked for rather than dropping everyone on the home
    // page: invitations and the marketing site both link here with ?next=.
    if (path === "/login") {
      return redirect(safeInternalPath(request.nextUrl.searchParams.get("next"), "/"));
    }

    return serve();
  };
}
