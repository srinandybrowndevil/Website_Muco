import { headers } from "next/headers";
import { createClient } from "@/lib/supabase/server";

// Specification 13 asks for a record of who looked at what: compensation,
// certificates, client contact details, access grants, and accounts being
// disabled. Writes are covered by database triggers, which cannot be forgotten
// by a new page or bypassed by a direct API call. Views have no trigger to
// catch them, so the page records them here.
//
// What must never reach this log: passwords, and images of identity documents.
// record_audit_event() also strips anything with a secret-looking key name, so
// a careless caller upstream cannot leak a credential into the log.
export type AuditView =
  | "compensation.view"
  | "certificate.view"
  | "client_pii.view";

export async function recordView(
  action: AuditView,
  resourceType: string,
  resourceId?: string | null,
  detail: Record<string, unknown> = {},
) {
  // Next prefetches routes on hover and in the viewport. Recording those would
  // fill the log with views that never happened, and a log claiming someone
  // opened a colleague's file when they only hovered a link is worse than no
  // log at all -- it would be evidence of something untrue.
  const requestHeaders = await headers();
  if (requestHeaders.get("next-router-prefetch")) return;

  const client = await createClient();
  if (!client) return;

  const { error } = await client.rpc("record_audit_event", {
    p_action: action,
    p_resource_type: resourceType,
    p_resource_id: resourceId ?? null,
    p_detail: detail,
    p_organization_id: null,
  });

  // Deliberately not thrown. The reader is already entitled to what they are
  // reading -- the policy decided that, not this function -- so a hiccup in
  // logging should not blank out the page. It is reported loudly server-side
  // rather than swallowed, so a persistent failure shows up in the platform
  // logs instead of quietly leaving a gap in the trail.
  if (error) console.error(`[audit] failed to record ${action}:`, error.message);
}
