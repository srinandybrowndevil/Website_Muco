import { redirect } from "next/navigation";
import { AppShell } from "@/components/AppShell";
import { requireWorkspace } from "@/lib/workspace";
import { createClient } from "@/lib/supabase/server";
import { homeForRole } from "@/lib/auth";
import { GrantEditor } from "@/components/admin/GrantEditor";

// Checklist 6.8: the grant editor.

export const metadata = { title: "Grants" };

export default async function GrantsPage() {
  const { organizationId, role } = await requireWorkspace();
  if (role !== "admin") redirect(homeForRole(role));

  const client = await createClient();
  if (!client) throw new Error("Configure Supabase before opening grants.");

  const [memberships, projects, grants] = await Promise.all([
    client.from("memberships")
      .select("user_id, role, disabled_at, profiles(full_name)")
      .eq("organization_id", organizationId),
    client.from("projects").select("id, name, kind")
      .eq("organization_id", organizationId).order("name"),
    client.from("project_grants").select("id, user_id, project_id, module, level, ends_at")
      .eq("organization_id", organizationId).order("created_at", { ascending: false }),
  ]);

  // Only people who can actually hold a grant. A client is not granted a
  // module on a project; they are the project. Offering them in this list
  // would invite a grant the policies would then have to argue with.
  const people = (memberships.data ?? [])
    .filter(row => !row.disabled_at && row.role !== "client")
    .map(row => ({
      user_id: row.user_id as string,
      name: (row.profiles as unknown as { full_name: string | null } | null)?.full_name || "Name not set",
      role: row.role as string,
    }))
    .sort((a, b) => a.name.localeCompare(b.name));

  const failed = memberships.error || projects.error || grants.error;

  return (
    <AppShell>
      <div className="page">
        <div className="pagehead">
          <div>
            <p className="eyebrow">Workspace / Grants</p>
            <h1>Who may open what.</h1>
            <p>Access is per person, per project, per module. Being on one project does not open another, and nothing here needs a deploy.</p>
          </div>
        </div>

        {failed && (
          <div className="panel error" role="alert">
            Some records could not be loaded. Refresh before changing anybody access.
          </div>
        )}

        <GrantEditor organizationId={organizationId} people={people}
          projects={projects.data ?? []} grants={grants.data ?? []} />

        <p className="invoicedoc-note">
          Clients are not listed here. A client is not granted a module on a project; the
          project is theirs, and their own workspace shows it.
        </p>
      </div>
    </AppShell>
  );
}
