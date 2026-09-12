/**
 * A path we are willing to send somebody to after they sign in.
 *
 * The value arrives in a query string, so it is attacker-controlled. Three
 * shapes have to be refused rather than sanitised: an absolute URL, because it
 * turns sign-in into an open redirect; a protocol-relative "//evil.example",
 * which most URL parsers read as absolute; and a backslash, which some
 * browsers normalise to a forward slash after the check has passed.
 */
export function safeInternalPath(value: string | null | undefined, fallback = "/"): string {
  if (!value || !value.startsWith("/") || value.startsWith("//") || value.includes("\\")) return fallback;
  try {
    const url = new URL(value, "http://internal");
    return url.origin === "http://internal" ? `${url.pathname}${url.search}${url.hash}` : fallback;
  } catch {
    return fallback;
  }
}

/**
 * Header the proxy writes so a Server Component can know its own path.
 *
 * Next.js does not expose the request path to a server component. Without
 * this, a page that wants to say "sign in and come back here" has to guess,
 * and every page that guesses guesses differently.
 */
export const PATH_HEADER = "x-muco-path";

/** Paths reachable without a session, in every workspace. */
export const PUBLIC_PATHS = [
  "/login",
  "/signup",
  "/onboarding",
  "/forgot-password",
  "/reset-password",
  "/accept-invite",
  "/auth/callback",
  "/auth/error",
  "/robots.txt",
];

export function isPublicPath(pathname: string): boolean {
  return PUBLIC_PATHS.some(route => pathname === route || pathname.startsWith(`${route}/`));
}

/**
 * Your own account, which belongs to no workspace and is reachable from all
 * four. Everything else here answers "which workspace owns this"; this one
 * answers "this is yours wherever you are".
 */
export function isAccountPath(pathname: string): boolean {
  return pathname === "/account" || pathname.startsWith("/account/");
}
