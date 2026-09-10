import { requireStaff } from "@/lib/staff";
import { createClient } from "@/lib/supabase/server";
import { StaffShell } from "@/components/staff/StaffShell";
import { EmptyState } from "@/components/EmptyState";
import { WorkspaceLink as Link } from "@/components/WorkspaceHost";

const KIND_LABEL: Record<string, string> = {
  internal: "Internal", client: "Client project", sandbox: "Sandbox",
};

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
    .select("id, project_id, module, level, ends_at, projects(name, status, kind)")
    .order("created_at", { ascending: false });

  // Grouped by project id rather than by name. Names are not unique and two
  // projects called "Website" would have collapsed into one row carrying both
  // their grants -- and there is no link to follow from a name.
  const byProject = new Map<string, { id: string; name: string; kind: string; modules: string[] }>();
  for (const grant of grants ?? []) {
    const project = grant.projects as unknown as { name: string; status: string; kind: string } | null;
    const key = grant.project_id as string;
    const entry = byProject.get(key) ?? {
      id: key,
      name: project?.name ?? "Project not readable",
      kind: project?.kind ?? "",
      modules: [],
    };
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
          <article className="portalf" key={project.id}>
            <div>
              <b>{project.name}</b>
              <small>
                {[KIND_LABEL[project.kind], project.modules.join("  ·  ")].filter(Boolean).join("  ·  ")}
              </small>
            </div>
            <Link className="secondary compact" href={`/staff/projects/${project.id}`}>Open</Link>
          </article>
        ))}
      </section>
    </StaffShell>
  );
}
