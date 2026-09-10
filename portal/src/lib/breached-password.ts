// Finding F-05. Checks a password against known breach corpora without the
// password, or anything that identifies it, leaving the browser.
//
// The password is hashed here. Only the first five characters of that hash are
// sent. What comes back is every corpus entry sharing those five characters --
// several hundred -- and the comparison happens locally. Nobody on the wire,
// on our server, or at the corpus service learns which entry was of interest.

export type BreachVerdict = "safe" | "breached" | "unavailable";

async function sha1Hex(value: string): Promise<string | null> {
  // Web Crypto needs a secure context. On plain http, other than localhost,
  // subtle is undefined -- that is a reason to report the check unavailable,
  // never a reason to crash the sign-up form.
  if (typeof crypto === "undefined" || !crypto.subtle) return null;
  const bytes = new TextEncoder().encode(value);
  const digest = await crypto.subtle.digest("SHA-1", bytes);
  return Array.from(new Uint8Array(digest))
    .map(b => b.toString(16).padStart(2, "0"))
    .join("")
    .toUpperCase();
}

export async function checkPasswordBreached(
  password: string,
  signal?: AbortSignal,
): Promise<BreachVerdict> {
  if (!password) return "unavailable";

  const hash = await sha1Hex(password);
  if (!hash) return "unavailable";

  const prefix = hash.slice(0, 5);
  const suffix = hash.slice(5);

  try {
    const response = await fetch("/api/password-breach", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ prefix }),
      signal,
    });
    if (!response.ok) return "unavailable";

    const payload = (await response.json()) as { available?: boolean; suffixes?: string };
    if (!payload.available || typeof payload.suffixes !== "string") return "unavailable";

    // Each line is "SUFFIX:count". Padding entries carry a count of zero and
    // exist only to disguise the real size of the answer, so a match with no
    // occurrences behind it is not a match.
    for (const line of payload.suffixes.split("\n")) {
      const [candidate, count] = line.trim().split(":");
      if (candidate === suffix && Number(count) > 0) return "breached";
    }
    return "safe";
  } catch {
    return "unavailable";
  }
}

// Deliberately not "block on failure". If the corpus cannot be reached, the
// alternative is refusing to let anyone create an account or recover one, over
// a check that is a safety net rather than the password rule itself. The rest
// of the rules -- length, character classes, and the common and predictable
// lists in lib/auth -- are enforced locally and always apply.
export function breachMessage(verdict: BreachVerdict): string | null {
  if (verdict === "breached") {
    return "This password has appeared in a public data breach. It may be a good password in itself, but attackers try known ones first, so please choose another.";
  }
  return null;
}
