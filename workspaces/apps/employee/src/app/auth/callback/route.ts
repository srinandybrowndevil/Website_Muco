import { NextResponse } from "next/server";
import { safeInternalPath } from "@muco/core";
import { createServerSupabase } from "@muco/core/server";

// Where an email link lands: confirmation, recovery, and invitation.
//
// Two shapes arrive here. A "code" is the exchange flow. A "token_hash" with a
// "type" is what the email templates send. Both end in a session on this
// origin, and only this origin — the four workspaces do not share cookies.
export async function GET(request: Request) {
  const url = new URL(request.url);
  const code = url.searchParams.get("code");
  const tokenHash = url.searchParams.get("token_hash");
  const type = url.searchParams.get("type");
  const next = safeInternalPath(url.searchParams.get("next"), "/");

  // The redirect has to keep the host the request arrived on. Building it from
  // request.url alone is right in development and wrong behind a proxy that
  // rewrites the host, so the header wins where it exists.
  const host = request.headers.get("host");
  const destination = new URL(next, url.origin);
  if (host) destination.host = host;

  const supabase = await createServerSupabase();
  if (!supabase) return NextResponse.redirect(new URL("/login", destination));

  if (code) {
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (error) return NextResponse.redirect(new URL("/auth/error?reason=expired", destination));
    return NextResponse.redirect(destination);
  }

  if (tokenHash && type) {
    const { error } = await supabase.auth.verifyOtp({
      type: type as "email" | "recovery" | "invite" | "magiclink" | "email_change",
      token_hash: tokenHash,
    });
    if (error) return NextResponse.redirect(new URL("/auth/error?reason=expired", destination));
    return NextResponse.redirect(destination);
  }

  return NextResponse.redirect(new URL("/auth/error?reason=missing", destination));
}
