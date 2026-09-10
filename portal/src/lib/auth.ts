// The two workspaces, as path prefixes. Named once so a redirect, a guard and
// a nav link cannot disagree about where a workspace lives.
export const ADMIN_HOME = "/admin";
export const CLIENT_HOME = "/portal";
export const INTERN_HOME = "/intern";
export const STAFF_HOME = "/staff";

export const DEFAULT_AUTHENTICATED_PATH = ADMIN_HOME;

// Where somebody goes when their access has been switched off. Deliberately
// not /complete-profile: to primaryMembership the two states look the same,
// but sending a switched-off account to the onboarding form would invite the
// person to sign themselves back up, and the sign-in screen is the one page
// that can explain the situation without offering a way around it.
export const ACCESS_CLOSED_PATH = "/login?access=closed";

export function isClientPath(pathname: string) {
  return pathname === CLIENT_HOME || pathname.startsWith(`${CLIENT_HOME}/`);
}

export function isAdminPath(pathname: string) {
  return pathname === ADMIN_HOME || pathname.startsWith(`${ADMIN_HOME}/`);
}

/**
 * Your own account, which belongs to no workspace.
 *
 * Every other path here answers "which workspace owns this". This one answers
 * "this is yours wherever you are", so it is reachable by any signed-in person
 * from any of the four addresses, and never takes a workspace prefix.
 */
export function isAccountPath(pathname: string) {
  return pathname === "/account" || pathname.startsWith("/account/");
}

export function isInternPath(pathname: string) {
  return pathname === INTERN_HOME || pathname.startsWith(`${INTERN_HOME}/`);
}

export function isStaffPath(pathname: string) {
  return pathname === STAFF_HOME || pathname.startsWith(`${STAFF_HOME}/`);
}

/** The workspace a role owns. One place, so no guard invents its own answer. */
export function homeForRole(role: string) {
  if (role === "client") return CLIENT_HOME;
  if (role === "intern") return INTERN_HOME;
  if (role === "employee") return STAFF_HOME;
  // admin and member both run the studio; the difference between them is what
  // they may do inside /admin, not which workspace they belong to.
  return ADMIN_HOME;
}

/** Where this role should land, honouring a requested path it is allowed to open. */
/** Where this role should land, honouring a requested path it is allowed to open. */
export function workspaceDestination(role: string, requested?: string | null) {
  const path = safeInternalPath(requested);
  const pathname = new URL(path, "http://internal").pathname;
  const home = homeForRole(role);

  // Each role may only keep a request that lands inside its own workspace.
  // Anything else -- another workspace, the router, an unknown path -- resolves
  // to where that role belongs.
  const ownsRequest =
    role === "client" ? isClientPath(pathname)
    : role === "intern" ? isInternPath(pathname)
    : role === "employee" ? isStaffPath(pathname)
    : !isClientPath(pathname) && !isInternPath(pathname) && !isStaffPath(pathname) && pathname !== "/";

  return ownsRequest ? path : home;
}

export function onboardingDestination(requested?: string | null) {
  return `/complete-profile?next=${encodeURIComponent(workspaceDestination("client", requested))}`;
}

export function safeInternalPath(value: string | null | undefined, fallback = DEFAULT_AUTHENTICATED_PATH) {
  if (!value || !value.startsWith("/") || value.startsWith("//") || value.includes("\\")) return fallback;
  try {
    const url = new URL(value, "http://internal");
    return url.origin === "http://internal" ? `${url.pathname}${url.search}${url.hash}` : fallback;
  } catch {
    return fallback;
  }
}

// Supabase checks passwords against HaveIBeenPwned, but only on paid plans.
// Until that is available this stands in for the part of it that matters most
// here: the character rules alone happily accept "Mucolabs@2026", which is the
// first password anyone attacking this portal would try.
//
// Not a breach corpus -- a short list of the roots that appear at the top of
// every leaked-password study, plus the studio's own names. The password is
// reduced to letters before comparing, so Password123!, p4ssw0rd and
// P@ssword all collapse to the same root.
const COMMON_ROOTS = [
  "password", "passwd", "qwerty", "qwertyuiop", "asdfgh", "zxcvbn",
  "welcome", "letmein", "admin", "administrator", "login", "iloveyou",
  "monkey", "dragon", "sunshine", "princess", "football", "baseball",
  "abcdef", "abcabc", "trustno", "master", "shadow", "superman",
  "muco", "mucolabs", "muclabs", "portal", "client", "intern", "erode",
];

function passwordRoot(password: string) {
  return password
    .toLowerCase()
    .replace(/[@4]/g, "a").replace(/[3]/g, "e").replace(/[1!|]/g, "i")
    .replace(/[0]/g, "o").replace(/[5$]/g, "s").replace(/[7]/g, "t")
    .replace(/[^a-z]/g, "");
}

/** Rejects a password whose letters reduce to a well-known root. */
export function isCommonPassword(password: string) {
  const root = passwordRoot(password);
  if (root.length < 3) return false;
  return COMMON_ROOTS.some(common => root === common || root.startsWith(common) || common.startsWith(root));
}

/** Rejects repeated characters and straight keyboard or alphabet runs. */
export function isPredictablePassword(password: string) {
  const lower = password.toLowerCase();
  // One character repeated, whether or not a few digits are tacked on the end:
  // "aaaaaaaaaa1!" is not meaningfully stronger than "aaaaaaaaaa".
  if (/^(.)+$/.test(passwordRoot(password))) return true;
  let same = 1;
  let step1 = 1;
  for (let i = 1; i < lower.length; i++) {
    same = lower[i] === lower[i - 1] ? same + 1 : 1;
    if (same >= 4) return true;
    const step = lower.charCodeAt(i) - lower.charCodeAt(i - 1);
    step1 = step === 1 || step === -1 ? step1 + 1 : 1;
    if (step1 >= 6) return true;
  }
  return false;
}

export function passwordRequirements(password: string) {
  return {
    length: password.length >= 10,
    letter: /[A-Za-z]/.test(password),
    number: /\d/.test(password),
    symbol: /[^A-Za-z0-9]/.test(password),
    uncommon: password.length === 0
      ? false
      : !isCommonPassword(password) && !isPredictablePassword(password),
  };
}

export function isStrongPassword(password: string) {
  return Object.values(passwordRequirements(password)).every(Boolean);
}

export function appOrigin() {
  if (typeof window !== "undefined") return window.location.origin;
  return process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/$/, "") ?? "http://localhost:3000";
}
