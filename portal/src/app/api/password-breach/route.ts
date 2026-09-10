import { NextResponse } from "next/server";

// Finding F-05. Supabase can refuse passwords that appear in known breach
// corpora, but only on a paid plan. This does the same job on the free one.
//
// How the privacy works. The browser hashes the password and sends only the
// first five characters of that hash. Every corpus entry sharing those five
// characters comes back -- several hundred of them -- and the browser decides
// locally whether one is a match. The password never leaves the device, and
// neither this server nor the corpus service can tell which of the returned
// entries was being asked about. That is the whole point of the range design.
//
// The lookup is proxied rather than called from the browser for two reasons:
// the portal's connect-src stays limited to itself and Supabase, and the
// visitor's IP address is never handed to a third party on the one page where
// they are typing a password.
//
// SHA-1 appears here because the corpus is indexed by it. It is not being
// relied on for security -- it is a lookup key into a public dataset.

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
      // The answer for a given prefix changes only when the corpus is
      // republished, so a long cache costs nothing and spares the service.
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
