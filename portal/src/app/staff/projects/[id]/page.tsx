import { notFound } from "next/navigation";
import { requireStaff } from "@/lib/staff";
import { createClient } from "@/lib/supabase/server";
import { StaffShell } from "@/components/staff/StaffShell";
import { EmptyState } from "@/components/EmptyState";

// Checklist 4.5 and 4.6: one project room, and the scope document for it.
//
// Everything on this page is reached through a grant. There is no filter here
// asking whether the person is allowed -- the policies answer that, and a
// project they have no grant on simply does not come back, which is why this
// page ends in notFound rather than a refusal message. A refusal message would
// confirm the project exists.

const MODULE: Record<string, string> = {
  scope: "Scope", source: "Source", staging: "Staging",
  files: "Files", tickets: "Tickets", billing: "Billing",
};

const KIND: Record<string, string> = {
  internal: "Internal project", client: "Client project", sandbox: "Practice sandbox",
};

function formatBytes(size: number | null) {
  if (!size) return "";
  if (size < 1024) return `${size} B`;
  if (size < 1024 * 1024) return `${Math.round(size / 1024)} KB`;
  return `${(size / (1024 * 1024)).toFixed(1)} MB`;
}

export default async function StaffProjectPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  await requireStaff();
  const client = await createClient();
  if (!client) throw new Error("Configure Supabase before opening a project.");

  const [project, grants, files] = await Promise.all([
    // granted_projects, not projects. The view carries exactly the columns a
    // project room renders; budget, repo_url, customer_id and owner_id are not
    // in it at all, so a narrow grant cannot reach them by asking directly.
    client.from("granted_projects")
      .select("id, name, description, status, progress, kind, starts_on, due_on, preview_url, staging_url")
      .eq("id", id).maybeSingle(),
    client.from("project_grants").select("module, level, ends_at").eq("project_id", id),
    client.from("files").select("id, name, mime_type, size_bytes, created_at")
      .eq("project_id", id).order("created_at", { ascending: false }),
  ]);

  if (!project.data) notFound();

  const held = (grants.data ?? []).map(g => g.module as string);
  const canSeeFiles = held.includes("scope") || held.includes("files");

  return (
    <StaffShell>
      <div className="pagehead">
        <div>
          <p className="eyebrow">Staff / Project</p>
          <h1>{project.data.name}</h1>
          <p>{KIND[String(project.data.kind)] ?? "Project"} · {project.data.status} · {project.data.progress}% complete</p>
        </div>
      </div>

      <section className="panel">
        <h2>What you may open</h2>
        {(grants.data ?? []).length === 0 ? (
          <p className="muted">No modules are granted to you on this project.</p>
        ) : (
          <ul className="permlist">
            {(grants.data ?? []).map(grant => (
              <li key={grant.module}>
                <span>{MODULE[grant.module as string] ?? grant.module}</span>
                <b>{grant.level}{grant.ends_at ? ` · until ${grant.ends_at}` : ""}</b>
              </li>
            ))}
          </ul>
        )}
      </section>

      {project.data.description && (
        <section className="panel">
          <h2>Brief</h2>
          <p className="requesttext">{project.data.description}</p>
        </section>
      )}

      {(project.data.preview_url || project.data.staging_url) && held.includes("staging") && (
        <section className="panel">
          <h2>Where it runs</h2>
          <ul className="linklist">
            {project.data.preview_url && (
              <li><a href={project.data.preview_url} target="_blank" rel="noreferrer noopener">Preview</a></li>
            )}
            {project.data.staging_url && (
              <li><a href={project.data.staging_url} target="_blank" rel="noreferrer noopener">Staging</a></li>
            )}
          </ul>
        </section>
      )}

      <section className="panel">
        <h2>Documents</h2>
        {!canSeeFiles && (
          <p className="muted">
            Documents need a scope or files grant on this project. You do not have one, so
            none are listed — that is the grant working, not a fault.
          </p>
        )}
        {canSeeFiles && (files.data ?? []).length === 0 && (
          <EmptyState compact icon="file" title="No documents yet"
            body="The written scope and anything else shared for this project appears here once it is uploaded." />
        )}
        {canSeeFiles && (files.data ?? []).map(file => (
          <article className="portalf" key={file.id}>
            <div>
              <b>{file.name}</b>
              <small>{[file.mime_type, formatBytes(file.size_bytes)].filter(Boolean).join(" · ")}</small>
            </div>
          </article>
        ))}
      </section>
    </StaffShell>
  );
}
