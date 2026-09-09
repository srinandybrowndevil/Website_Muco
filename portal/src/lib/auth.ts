// The two workspaces, as path prefixes. Named once so a redirect, a guard and
// a nav link cannot disagree about where a workspace lives.
export const ADMIN_HOME = "/admin";
export const CLIENT_HOME = "/portal";

export const DEFAULT_AUTHENTICATED_PATH = ADMIN_HOME;

export function isClientPath(pathname: string) {
  return pathname === CLIENT_HOME || pathname.startsWith(`${CLIENT_HOME}/`);
}

export function isAdminPath(pathname: string) {
  return pathname === ADMIN_HOME || pathname.startsWith(`${ADMIN_HOME}/`);
}

/** Where this role should land, honouring a requested path it is allowed to open. */
export function workspaceDestination(role: string, requested?: string | null) {
  const path = safeInternalPath(requested);
  const pathname = new URL(path, "http://internal").pathname;
  if (role === "client") return isClientPath(pathname) ? path : CLIENT_HOME;
  // A team member asking for a client page is sent to their own workspace, not
  // to the page they asked for. Every other request they may keep.
  return isClientPath(pathname) ? ADMIN_HOME : (pathname === "/" ? ADMIN_HOME : path);
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
