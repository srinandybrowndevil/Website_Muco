import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { primaryMembership } from "@/lib/membership";

// crm_schema_version() is `select 8` -- a constant written by a migration, not
// per-request data. Reading it cost a full Postgres round trip on every page
// load, in series behind the auth and membership queries, which is most of why
// "Opening workspace..." sat there. Cache the successful answer: the value can
// only change when a migration runs, and a migration means a redeploy, which
// resets this. A failed check is deliberately never cached, so an incomplete
// migration keeps failing loudly instead of being masked until the TTL runs out.
const SCHEMA_TTL_MS = 5 * 60 * 1000;
let schemaVerifiedAt = 0;

async function assertSchema(client: NonNullable<Awaited<ReturnType<typeof createClient>>>) {
  if (Date.now() - schemaVerifiedAt < SCHEMA_TTL_MS) return;
  const version = await client.rpc("crm_schema_version");
  if (version.error || version.data !== 8) throw new Error("Live CRM setup is incomplete. Apply the live workspace and analytics retention migrations before continuing.");
  schemaVerifiedAt = Date.now();
}

export async function requireWorkspace(customer = false) {
  const client = await createClient();
  if (!client) throw new Error("Configure Supabase before opening a live workspace.");
  const { data: { user }, error } = await client.auth.getUser();
  if (error || !user) redirect("/login");
  const { data: rows, error: membershipError } = await client.from("memberships")
    .select("organization_id, role").eq("user_id", user.id);
  const data = primaryMembership(rows);
  if (membershipError) throw new Error("Workspace access could not be checked. Check the database migrations.");
  if (!data) redirect("/complete-profile");
  if (customer && data.role !== "client") redirect("/");
  if (!customer && data.role === "client") redirect("/portal");
  await assertSchema(client);
  return { organizationId: data.organization_id as string, role: data.role as string, userId: user.id };
}
