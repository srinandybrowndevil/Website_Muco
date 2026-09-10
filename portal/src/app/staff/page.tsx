import { requireStaff } from "@/lib/staff";
import { createClient } from "@/lib/supabase/server";
import { StaffShell } from "@/components/staff/StaffShell";
import { EmptyState } from "@/components/EmptyState";

const MODULE_LABEL: Record<string, string> = {
  scope: "Scope", source: "Source", staging: "Staging",
  files: "Files", tickets: "Tickets", billing: "Billing",
};

export default async function StaffHome() {
  await requireStaff();
  const client = await createClient();
  if (!client) throw new Error("Configure Supabase before opening the staff workspace.");

  // No user filter here: the grants policy already restricts this to the
  // signed-in person's own rows. A second filter would hide a policy
  // regression rather than let it surface.
  const { data: grants, error } = await client.from("project_grants")
    .select("id, module, level, ends_at, projects(name, status)")
    .order("created_at", { ascending: false });

  const byProject = new Map<string, { name: string; status: string; modules: string[] }>();
  for (const grant of grants ?? []) {
    const project = grant.projects as unknown as { name: string; status: string } | null;
    const key = project?.name ?? "Unnamed project";
    const entry = byProject.get(key) ?? { name: key, status: project?.status ?? "", modules: [] };
    entry.modules.push(`${MODULE_LABEL[grant.module] ?? grant.module} · ${grant.level}`);
    byProject.set(key, entry);
  }

  return (
    <StaffShell>
      <div className="pagehead">
        <div>
          <p className="eyebrow">Staff</p>
          <h1>Your projects.</h1>
          <p>You can see only the projects assigned to you.</p>
        </div>
      </div>

      <section className="panel">
        <h2>Assigned work</h2>
        {error && <p className="error" role="alert">Your assignments could not be loaded. Refresh to try again.</p>}
        {!error && byProject.size === 0 && (
          <EmptyState compact icon="briefcase" title="Nothing assigned yet"
            body="A project appears here once the founder grants you access to it, with the parts of it you may open. Nothing is hidden from you that you have been granted."
            note="Access is per project and per module, so being on one project does not open another." />
        )}
        {[...byProject.values()].map(project => (
          <article className="portalf" key={project.name}>
            <div>
              <b>{project.name}</b>
              <small>{project.modules.join("  ·  ")}</small>
            </div>
          </article>
        ))}
      </section>
    </StaffShell>
  );
}
