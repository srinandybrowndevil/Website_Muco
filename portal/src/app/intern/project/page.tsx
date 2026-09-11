import { requireIntern } from "@/lib/intern";
import { createClient } from "@/lib/supabase/server";
import { InternShell } from "@/components/intern/InternShell";
import { EmptyState } from "@/components/EmptyState";

// Specification 11.3 item 6: "links to the assigned repo / Figma / staging,
// no global switcher".
//
// The absence of a switcher is the feature. An intern reaches the slice they
// were granted and has no way to discover that other projects exist -- which
// is why this reads granted_projects rather than the projects table, and why
// there is no list of anything they do not hold a grant on.

export const metadata = { title: "Your project" };

const MODULE: Record<string, string> = {
  scope: "Scope", source: "Source", staging: "Staging",
  files: "Files", tickets: "Tickets", billing: "Billing",
};

const KIND: Record<string, string> = {
  sandbox: "Practice sandbox", internal: "Internal project", client: "Client project",
};

export default async function InternProjectPage() {
  const { readOnly } = await requireIntern();
  const client = await createClient();
  if (!client) throw new Error("Configure Supabase before opening your project.");

  const [rooms, grants] = await Promise.all([
    client.from("granted_projects")
      .select("id, name, description, status, progress, kind, preview_url, staging_url"),
    client.from("project_grants").select("project_id, module, level, ends_at"),
  ]);

  const byProject = new Map<string, { module: string; level: string }[]>();
  for (const grant of grants.data ?? []) {
    const list = byProject.get(grant.project_id as string) ?? [];
    list.push({ module: grant.module as string, level: grant.level as string });
    byProject.set(grant.project_id as string, list);
  }

  const projects = rooms.data ?? [];

  return (
    <InternShell readOnly={readOnly}>
      <div className="pagehead">
        <div>
          <p className="eyebrow">Internship</p>
          <h1>Your project.</h1>
          <p>The slice you were given. There is no switcher here because there is nothing else to switch to.</p>
        </div>
      </div>

      {projects.length === 0 ? (
        <section className="panel">
          <EmptyState icon="briefcase" title="No project assigned yet"
            body="A practice sandbox or an assigned slice appears here once the founder grants it. Until then your work is the tasks and learning already set for you."
            note="Customer records, invoices and other projects are not part of an internship at any length." />
        </section>
      ) : projects.map(project => {
        const held = byProject.get(project.id as string) ?? [];
        return (
          <section className="panel" key={project.id as string}>
            <div className="panelhead">
              <h2>{project.name as string}</h2>
              <span className="muted">{KIND[String(project.kind)] ?? ""}</span>
            </div>

            {project.description && <p className="requesttext">{project.description as string}</p>}

            <dl className="detaillist">
              <div><dt>Status</dt><dd>{project.status as string}</dd></div>
              <div><dt>Progress</dt><dd>{String(project.progress)}%</dd></div>
            </dl>

            <h3>What you may open</h3>
            {held.length === 0 ? (
              <p className="muted">No modules granted on this project yet.</p>
            ) : (
              <ul className="permlist">
                {held.map(grant => (
                  <li key={grant.module}>
                    <span>{MODULE[grant.module] ?? grant.module}</span>
                    <b>{grant.level}</b>
                  </li>
                ))}
              </ul>
            )}

            {(project.preview_url || project.staging_url) && (
              <>
                <h3>Where it runs</h3>
                <ul className="linklist">
                  {project.preview_url && (
                    <li><a href={project.preview_url as string} target="_blank" rel="noreferrer noopener">Preview</a></li>
                  )}
                  {project.staging_url && (
                    <li><a href={project.staging_url as string} target="_blank" rel="noreferrer noopener">Staging</a></li>
                  )}
                </ul>
              </>
            )}
          </section>
        );
      })}

      <p className="invoicedoc-note">
        Staging links appear only with a staging grant. If a task needs something you cannot
        reach, ask your mentor rather than assuming the page is broken.
      </p>
    </InternShell>
  );
}
