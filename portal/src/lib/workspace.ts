import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { accessSwitchedOff, primaryMembership } from "@/lib/membership";
import { ACCESS_CLOSED_PATH, ADMIN_HOME, CLIENT_HOME } from "@/lib/auth";

// crm_schema_version() is `select 8` -- a constant written by a migration, not
// per-request data. Reading it cost a full Postgres round trip on every page
// load, in series behind the auth and membership queries, which is most of why
// "Opening workspace..." sat there. Cache the successful answer: the value can
// only change when a migration runs, and a migration means a redeploy, which
// resets this. A failed check is deliberately never cached, so an incomplete
// migration keeps failing loudly instead of being masked until the TTL runs out.
const REQUIRED_SCHEMA_VERSION = 8;
const SCHEMA_TTL_MS = 5 * 60 * 1000;
let schemaVerifiedAt = 0;

async function assertSchema(client: NonNullable<Awaited<ReturnType<typeof createClient>>>) {
  if (Date.now() - schemaVerifiedAt < SCHEMA_TTL_MS) return;
  const version = await client.rpc("crm_schema_version");
  // A minimum, not an exact match. Requiring equality made every migration a
  // coordinated outage: applying it broke the running deploy until the new code
  // shipped, and shipping first broke until the migration ran. A newer schema is
  // additive, so it stays compatible with code that asks for less.
  if (version.error || typeof version.data !== "number" || version.data < REQUIRED_SCHEMA_VERSION) {
    throw new Error("Live CRM setup is incomplete. Apply the outstanding database migrations before continuing.");
  }
  schemaVerifiedAt = Date.now();
}

export async function requireWorkspace(customer = false) {
  const client = await createClient();
  if (!client) throw new Error("Configure Supabase before opening a live workspace.");
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
  const data = primaryMembership(rows);
  if (membershipError) throw new Error("Workspace access could not be checked. Check the database migrations.");
  if (accessSwitchedOff(rows)) redirect(ACCESS_CLOSED_PATH);
  if (!data) redirect("/complete-profile");
  if (customer && data.role !== "client") redirect(ADMIN_HOME);
  if (!customer && data.role === "client") redirect(CLIENT_HOME);
  await assertSchema(client);
  return { organizationId: data.organization_id as string, role: data.role as string, userId: user.id };
}
