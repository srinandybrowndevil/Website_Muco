import { NextResponse } from "next/server";

// The server half of the breach check. Each application re-exports this from
// /api/password-breach, because the browser calls a same-origin path and the
// four applications are four origins.
//
// Why it is proxied rather than called from the browser: the Content Security
// Policy keeps connect-src limited to the app itself and Supabase, and the
// visitor's IP address is never handed to a third party on the one page where
// they are typing a password.
//
// SHA-1 appears here because the corpus is indexed by it. It is not being
// relied on for security — it is a lookup key into a public dataset.

const CORPUS = "https://api.pwnedpasswords.com/range/";
const PREFIX = /^[0-9A-F]{5}$/;

export async function POST(request: Request) {
  let prefix: unknown;
  try {
    ({ prefix } = await request.json());
  } catch {
    return NextResponse.json({ error: "Malformed request." }, { status: 400 });
  }

  // Exactly five uppercase hex characters, or nothing happens. This is what
  // stops the endpoint being used as a general-purpose request forwarder.
  if (typeof prefix !== "string" || !PREFIX.test(prefix)) {
    return NextResponse.json({ error: "Expected a five-character hash prefix." }, { status: 400 });
  }

  try {
    const response = await fetch(`${CORPUS}${prefix}`, {
      // Padding hides the real result size, so a network observer cannot infer
      // anything from how much came back.
      headers: { "Add-Padding": "true" },
      // The answer for a prefix changes only when the corpus is republished,
      // so a long cache costs nothing and spares the service.
      next: { revalidate: 60 * 60 * 24 },
    });
    if (!response.ok) return NextResponse.json({ available: false }, { status: 200 });
    return NextResponse.json({ available: true, suffixes: await response.text() }, { status: 200 });
  } catch {
    // The check being unavailable is not the same as the password being safe.
    // The caller is told exactly that and decides what to do about it.
    return NextResponse.json({ available: false }, { status: 200 });
  }
}
