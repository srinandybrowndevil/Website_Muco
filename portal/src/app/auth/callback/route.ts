import { NextResponse } from "next/server";
import { safeInternalPath } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const code = url.searchParams.get("code");
  const requestedNext = safeInternalPath(url.searchParams.get("next"), "");
  const supabase = await createClient();

  if (!code || !supabase) {
    return NextResponse.redirect(new URL("/auth/error?reason=invalid", url.origin));
  }

  const { error } = await supabase.auth.exchangeCodeForSession(code);
  if (error) {
    return NextResponse.redirect(new URL("/auth/error?reason=callback", url.origin));
  }

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.redirect(new URL("/auth/error?reason=callback", url.origin));
  }

  // Recovery must reach the password form before workspace role routing,
  // including for customers who have not completed onboarding yet.
  if (requestedNext === "/reset-password") {
    return NextResponse.redirect(new URL(requestedNext, url.origin));
  }

  const isInviteNext = requestedNext.startsWith("/accept-invite");

  if (requestedNext) {
    if (isInviteNext) {
      return NextResponse.redirect(new URL(requestedNext, url.origin));
    }

    if (requestedNext === "/complete-profile") {
      return NextResponse.redirect(new URL(requestedNext, url.origin));
    }
  }

  // Existing members are routed to their workspace. Non-members are sent to
  // complete-profile so that self-serve customers can onboard safely.
  const { data: membership } = await supabase
    .from("memberships")
    .select("role")
    .eq("user_id", user.id)
    .limit(1)
    .maybeSingle();

  if (membership) {
    let destination = requestedNext || (membership.role === "client" ? "/portal" : "/");
    if (membership.role === "client" && !destination.startsWith("/portal")) destination = "/portal";
    if (membership.role !== "client" && destination.startsWith("/portal")) destination = "/";
    return NextResponse.redirect(new URL(destination, url.origin));
  }

  // No membership: route to customer onboarding instead of showing an error.
  return NextResponse.redirect(new URL("/complete-profile", url.origin));
}
