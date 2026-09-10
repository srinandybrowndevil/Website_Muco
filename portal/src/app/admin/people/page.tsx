import { AppShell } from "@/components/AppShell";
import { EmptyState } from "@/components/EmptyState";
import { requireWorkspace } from "@/lib/workspace";
import { createClient } from "@/lib/supabase/server";

// Specification 11.2, item 2: one list of everyone, filterable by actor type.
// It reads memberships as the source of truth for who exists and what they are,
// then decorates with whatever profile each actor type carries.

const ROLE_LABEL: Record<string, string> = {
  admin: "Founder / admin",
  member: "Team member",
  employee: "Employee",
  intern: "Intern",
  client: "Client",
};

function formatDate(value: string | null) {
  if (!value) return "—";
  return new Date(`${value}T00:00:00`).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });
}

export default async function PeoplePage() {
  const { organizationId } = await requireWorkspace();
  const client = await createClient();
  if (!client) throw new Error("Configure Supabase before opening people.");

  const [memberships, interns, staff] = await Promise.all([
    client.from("memberships").select("user_id, role, profiles(full_name)").eq("organization_id", organizationId),
    client.from("intern_profiles").select("user_id, track, tier, starts_at, ends_at, status").eq("organization_id", organizationId),
    client.from("staff_profiles").select("user_id, roles, is_mentor, status").eq("organization_id", organizationId),
  ]);

  const internBy = new Map((interns.data ?? []).map(i => [i.user_id, i]));
  const staffBy = new Map((staff.data ?? []).map(s => [s.user_id, s]));
  const failed = memberships.error || interns.error || staff.error;

  const people = (memberships.data ?? []).map(m => {
    const name = (m.profiles as unknown as { full_name: string | null } | null)?.full_name;
    const intern = internBy.get(m.user_id);
    const staffRow = staffBy.get(m.user_id);
    return {
      id: m.user_id,
      name: name || "Name not set",
      role: m.role as string,
      detail: intern
        ? `${String(intern.track).replace("intern_", "")} · ${formatDate(intern.starts_at)} to ${formatDate(intern.ends_at)}`
        : staffRow
          ? [(staffRow.roles as string[] ?? []).join(", ") || "no role set", staffRow.is_mentor ? "mentor" : null]
              .filter(Boolean).join(" · ")
          : "",
      status: intern?.status ?? staffRow?.status ?? "",
    };
  }).sort((a, b) => a.role.localeCompare(b.role) || a.name.localeCompare(b.name));

  return (
    <AppShell>
      <div className="page">
        <div className="pagehead">
          <div>
            <p className="eyebrow">Workspace / People</p>
            <h1>Everyone with access.</h1>
            <p>Each login belongs to exactly one workspace. Changing what someone may reach means changing their role here.</p>
          </div>
        </div>

        {failed && <div className="panel error" role="alert">Some records could not be loaded. Refresh before making changes.</div>}

        <div className="panel">
          {people.length === 0 ? (
            <EmptyState icon="users" title="No one listed"
              body="Everyone who can sign in appears here with the workspace their account belongs to. If this stays empty, the membership query is being blocked rather than returning nobody." />
          ) : (
            <div className="tablewrap">
              <table>
                <caption className="visually-hidden">People with access</caption>
                <thead>
                  <tr><th scope="col">Name</th><th scope="col">Workspace</th><th scope="col">Details</th><th scope="col">Status</th></tr>
                </thead>
                <tbody>
                  {people.map(person => (
                    <tr key={person.id}>
                      <td>{person.name}</td>
                      <td>{ROLE_LABEL[person.role] ?? person.role}</td>
                      <td>{person.detail || "—"}</td>
                      <td>{person.status || "—"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        <p className="invoicedoc-note">
          Interns, employees and clients each sign in to their own workspace and cannot reach
          the others. Creating and dating those records is not yet in this screen; it is done
          in the database until the invite flows for the new roles are built.
        </p>
      </div>
    </AppShell>
  );
}
