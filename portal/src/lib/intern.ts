import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { accessSwitchedOff, primaryMembership } from "@/lib/membership";
import { ACCESS_CLOSED_PATH, homeForRole } from "@/lib/auth";

export type InternAccess = {
  state: "not_started" | "active" | "grace" | "closed";
  ends_at: string;
  days_left: number;
};

export type InternSession = {
  organizationId: string;
  userId: string;
  access: InternAccess;
};

// Specification section 7.1: an intern is denied before starts_at and after the
// grace window, and cannot change their own dates. The window is computed by
// intern_access() in the database so the guard, a page and any future API all
// read the same rule instead of each deriving it slightly differently.
//
// `readOnly` marks the grace period. During it the profile, work log and
// certificate stay readable and nothing may be written -- the point of the
// grace window is collecting the certificate, not continuing the internship.
export async function requireIntern(): Promise<InternSession & { readOnly: boolean }> {
  const client = await createClient();
  if (!client) throw new Error("Configure Supabase before opening the intern workspace.");

  const { data: { user }, error } = await client.auth.getUser();
  if (error || !user) redirect("/login");
  // Checklist 9.6. Enforced here rather than trusted to a setting in the
  // Supabase dashboard: a rule that lives only in a console somewhere can be
  // switched off by accident and nothing in this repository would notice.
  // Google sign-in arrives already confirmed, so this only stops an address
  // nobody has proved they can read.
  if (!user.email_confirmed_at) redirect("/verify-email");

  const { data: rows, error: membershipError } = await client.from("memberships")
    .select("organization_id, role, disabled_at").eq("user_id", user.id);
  if (membershipError) throw new Error("Workspace access could not be checked.");
  const membership = primaryMembership(rows);
  if (accessSwitchedOff(rows)) redirect(ACCESS_CLOSED_PATH);
  if (!membership) redirect("/complete-profile");
  if (membership.role !== "intern") redirect(homeForRole(membership.role));

  const { data: access, error: accessError } = await client
    .rpc("intern_access", { p_user: user.id })
    .maybeSingle<InternAccess>();
  if (accessError) throw new Error("Your internship dates could not be read.");

  // A membership without an internship record is an incomplete setup, not an
  // open door. Deny rather than guess a window.
  if (!access) redirect("/intern/closed?reason=missing");
  if (access.state === "not_started") redirect("/intern/closed?reason=not_started");
  if (access.state === "closed") redirect("/intern/closed?reason=ended");

  return {
    organizationId: membership.organization_id,
    userId: user.id,
    access,
    readOnly: access.state === "grace",
  };
}
