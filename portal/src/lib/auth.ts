export const DEFAULT_AUTHENTICATED_PATH = "/";

export function workspaceDestination(role: string, requested?: string | null) {
  const path = safeInternalPath(requested);
  const pathname = new URL(path, "http://internal").pathname;
  const customerPath = pathname === "/portal" || pathname.startsWith("/portal/");
  return role === "client" ? (customerPath ? path : "/portal") : (customerPath ? "/" : path);
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

export function passwordRequirements(password: string) {
  return {
    length: password.length >= 10,
    letter: /[A-Za-z]/.test(password),
    number: /\d/.test(password),
    symbol: /[^A-Za-z0-9]/.test(password),
  };
}

export function isStrongPassword(password: string) {
  return Object.values(passwordRequirements(password)).every(Boolean);
}

export function appOrigin() {
  if (typeof window !== "undefined") return window.location.origin;
  return process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/$/, "") ?? "http://localhost:3000";
}
