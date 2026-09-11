import type { SupabaseClient } from "@supabase/supabase-js";

/**
 * The customer record behind a signed-in client, and their projects.
 *
 * Every client page needs both, and every client page would otherwise write
 * its own version of the join. Worth saying plainly: the filters here are for
 * ordering and clarity. The policies on customers, projects, invoices, files
 * and milestones all reduce to "this customer's auth_user_id is you", so a
 * request with the filters removed returns exactly the same rows.
 */
export type ClientProject = {
  id: string;
  name: string;
  description: string | null;
  status: string;
  kind: string;
  starts_on: string | null;
  due_on: string | null;
  preview_url: string | null;
  staging_url: string | null;
};

export async function loadCustomer(supabase: SupabaseClient, userId: string) {
  const { data } = await supabase
    .from("customers")
    .select("id,name,company,email,phone,status,created_at")
    .eq("auth_user_id", userId)
    .maybeSingle();
  return data;
}

export async function loadProjects(supabase: SupabaseClient, customerId: string) {
  const { data } = await supabase
    .from("projects")
    .select("id,name,description,status,kind,starts_on,due_on,preview_url,staging_url")
    .eq("customer_id", customerId)
    .order("created_at", { ascending: false });
  return (data ?? []) as ClientProject[];
}

/**
 * What the studio is doing, as a sentence.
 *
 * Not a percentage. The specification is explicit that project status stays
 * honest and does not show a fake completion figure, and a bar at 80% is a
 * promise the studio has not made. A sentence can be true.
 */
export function statusSentence(status: string, projectName: string): string {
  switch (status) {
    case "planning":
      return "We are planning " + projectName + ".";
    case "active":
      return "We are building " + projectName + " now.";
    case "on_hold":
      return projectName + " is paused.";
    case "completed":
      return projectName + " is complete.";
    default:
      return projectName + " is with the studio.";
  }
}

export function statusDetail(status: string): string {
  switch (status) {
    case "planning":
      return "Scope and milestones are being agreed. Nothing is being built yet, and nothing is being billed for build work.";
    case "active":
      return "Work is underway. Milestones below show what is finished and what is next, and previews appear as soon as there is something to look at.";
    case "on_hold":
      return "Work has stopped for now. A paused project is usually waiting on a decision or on something from your side — support will tell you which.";
    case "completed":
      return "The work is finished and handed over. On final payment the code, the design and the accounts are yours.";
    default:
      return "";
  }
}
