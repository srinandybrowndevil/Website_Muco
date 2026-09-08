import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export async function requireWorkspace(customer = false) {
  const client = await createClient();
  if (!client) throw new Error("Configure Supabase before opening a live workspace.");
  const { data: { user }, error } = await client.auth.getUser();
  if (error || !user) redirect("/login");
  const { data, error: membershipError } = await client.from("memberships")
    .select("organization_id, role").eq("user_id", user.id)
    .order("organization_id").limit(1).maybeSingle();
  if (membershipError) throw new Error("Workspace access could not be checked. Check the database migrations.");
  if (!data) redirect("/complete-profile");
  if (customer && data.role !== "client") redirect("/");
  if (!customer && data.role === "client") redirect("/portal");
  const version = await client.rpc("crm_schema_version");
  if (version.error || version.data !== 8) throw new Error("Live CRM setup is incomplete. Apply the live workspace and analytics retention migrations before continuing.");
  return { organizationId: data.organization_id as string, role: data.role as string, userId: user.id };
}
