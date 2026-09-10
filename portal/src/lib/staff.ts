import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { accessSwitchedOff, primaryMembership } from "@/lib/membership";
import { ACCESS_CLOSED_PATH, homeForRole } from "@/lib/auth";

// The employee workspace. Contracted builders live here too -- specification
// A9 groups them with employees rather than inventing a fifth portal -- which
// is why the pages say "compensation" and never "salary".
export async function requireStaff() {
  const client = await createClient();
  if (!client) throw new Error("Configure Supabase before opening the staff workspace.");

  const { data: { user }, error } = await client.auth.getUser();
  if (error || !user) redirect("/login");

  const { data: rows, error: membershipError } = await client.from("memberships")
    .select("organization_id, role, disabled_at").eq("user_id", user.id);
  if (membershipError) throw new Error("Workspace access could not be checked.");
  const membership = primaryMembership(rows);
  if (accessSwitchedOff(rows)) redirect(ACCESS_CLOSED_PATH);
  if (!membership) redirect("/complete-profile");
  if (membership.role !== "employee") redirect(homeForRole(membership.role));

  return { organizationId: membership.organization_id, userId: user.id };
}
