import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { primaryMembership } from "@/lib/membership";
import { workspaceDestination } from "@/lib/auth";
import { isSupabaseConfigured } from "@/lib/supabase/config";

// The team workspace used to live here. It now lives under /admin so an intern
// or employee token cannot reach it by loading the site root, and so the client
// portal can own /portal outright.
//
// This route stays as the front door: a bookmark, an old link or someone typing
// the bare domain lands here and is sent to whichever workspace their account
// actually belongs to, rather than meeting a 404.
export default async function Root() {
  if (!isSupabaseConfigured) redirect("/admin");

  const client = await createClient();
  if (!client) redirect("/login");

  const { data: { user } } = await client.auth.getUser();
  if (!user) redirect("/login");

  const { data: rows, error: membershipError } = await client.from("memberships")
    .select("organization_id, role").eq("user_id", user.id);
  // A failed lookup is not the same as having no workspace. Without this, a
  // transient error sent an existing customer, intern or employee to the
  // onboarding form as though their account did not exist.
  if (membershipError) throw new Error("Your workspace could not be opened. Refresh and try again.");

  const membership = primaryMembership(rows);
  if (!membership) redirect("/complete-profile");

  redirect(workspaceDestination(membership.role));
}
