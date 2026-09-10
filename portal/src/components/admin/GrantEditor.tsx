"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

// Checklist 6.8 and 6.19: person, project, module, level -- and a way to take
// it back without a deploy.
//
// Grants were readable in two places and editable in none, so every access
// decision in this studio was made by writing SQL. That was never a security
// problem, because the policies were always right. It was an availability
// problem: the founder could not hand a grant to anybody else to make, and
// could not revoke one from a phone.
//
// Revoking sets an end date rather than deleting the row, so the record keeps
// the fact that access was held and when it stopped. A deleted grant reads as
// access somebody never had.

type Person = { user_id: string; name: string; role: string };
type Project = { id: string; name: string; kind: string };
type Grant = {
  id: string; user_id: string; project_id: string;
  module: string; level: string; ends_at: string | null;
};

const MODULES = ["scope", "source", "staging", "files", "tickets", "billing"] as const;
const LEVELS = ["read", "write", "admin"] as const;

const MODULE_LABEL: Record<string, string> = {
  scope: "Scope", source: "Source", staging: "Staging",
  files: "Files", tickets: "Tickets", billing: "Billing",
};

export function GrantEditor({
  organizationId, people, projects, grants,
}: { organizationId: string; people: Person[]; projects: Project[]; grants: Grant[] }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const nameOf = new Map(people.map(person => [person.user_id, person.name]));
  const projectOf = new Map(projects.map(project => [project.id, project]));
  const today = new Date().toISOString().slice(0, 10);

  async function add(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    const form = event.currentTarget;
    const values = new FormData(form);

    const client = createClient();
    if (!client) { setError("This workspace is not configured for sign-in."); return; }

    setBusy(true);
    // Upsert on the natural key. Granting the same module twice should change
    // the level, not leave two rows disagreeing about what somebody may do.
    const { error: failed } = await client.from("project_grants").upsert({
      organization_id: organizationId,
      user_id: String(values.get("user_id")),
      project_id: String(values.get("project_id")),
      module: String(values.get("module")),
      level: String(values.get("level")),
      ends_at: String(values.get("ends_at") || "") || null,
    }, { onConflict: "user_id,project_id,module" });
    setBusy(false);

    if (failed) { setError(failed.message); return; }
    form.reset();
    router.refresh();
  }

  async function revoke(id: string) {
    setError(null);
    const client = createClient();
    if (!client) { setError("This workspace is not configured for sign-in."); return; }

    setBusy(true);
    const { error: failed } = await client.from("project_grants")
      .update({ ends_at: today }).eq("id", id);
    setBusy(false);

    if (failed) { setError(failed.message); return; }
    router.refresh();
  }

  const live = grants.filter(grant => !grant.ends_at || grant.ends_at >= today);
  const ended = grants.filter(grant => grant.ends_at && grant.ends_at < today);

  return (
    <>
      <section className="panel">
        <h2>Give access</h2>
        <p className="muted">
          One person, one project, one module, at one level. Granting the same module twice
          replaces the earlier grant rather than stacking a second one on top of it.
        </p>
        <form onSubmit={add} className="grantform">
          <label>
            Person
            <select name="user_id" required defaultValue="">
              <option value="" disabled>Choose someone</option>
              {people.map(person => (
                <option key={person.user_id} value={person.user_id}>
                  {person.name} · {person.role}
                </option>
              ))}
            </select>
          </label>

          <label>
            Project
            <select name="project_id" required defaultValue="">
              <option value="" disabled>Choose a project</option>
              {projects.map(project => (
                <option key={project.id} value={project.id}>
                  {project.name} · {project.kind}
                </option>
              ))}
            </select>
          </label>

          <label>
            Module
            <select name="module" required defaultValue="scope">
              {MODULES.map(module => (
                <option key={module} value={module}>{MODULE_LABEL[module]}</option>
              ))}
            </select>
          </label>

          <label>
            Level
            <select name="level" required defaultValue="read">
              {LEVELS.map(level => <option key={level} value={level}>{level}</option>)}
            </select>
          </label>

          <label>
            Ends (optional)
            <input type="date" name="ends_at" />
          </label>

          <button className="primary" disabled={busy}>{busy ? "Saving…" : "Grant access"}</button>
        </form>
        {error && <p className="error" role="alert">{error}</p>}
      </section>

      <section className="panel">
        <h2>Live grants ({live.length})</h2>
        {live.length === 0 ? (
          <p className="muted">Nobody holds access to any project yet.</p>
        ) : (
          <div className="tablewrap">
            <table>
              <caption className="visually-hidden">Live project grants</caption>
              <thead>
                <tr>
                  <th scope="col">Person</th><th scope="col">Project</th>
                  <th scope="col">Module</th><th scope="col">Level</th>
                  <th scope="col">Ends</th><th scope="col">Revoke</th>
                </tr>
              </thead>
              <tbody>
                {live.map(grant => (
                  <tr key={grant.id}>
                    <td>{nameOf.get(grant.user_id) ?? "Unknown person"}</td>
                    <td>{projectOf.get(grant.project_id)?.name ?? "Unknown project"}</td>
                    <td>{MODULE_LABEL[grant.module] ?? grant.module}</td>
                    <td>{grant.level}</td>
                    <td>{grant.ends_at ?? "No end date"}</td>
                    <td>
                      <button type="button" className="secondary compact" disabled={busy}
                        onClick={() => revoke(grant.id)}>
                        Revoke
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {ended.length > 0 && (
        <section className="panel">
          <h2>Ended ({ended.length})</h2>
          <p className="muted">
            Kept rather than deleted. A deleted grant reads as access somebody never had, and
            the audit log would then disagree with this screen.
          </p>
          <div className="tablewrap">
            <table>
              <caption className="visually-hidden">Grants that have ended</caption>
              <thead>
                <tr>
                  <th scope="col">Person</th><th scope="col">Project</th>
                  <th scope="col">Module</th><th scope="col">Ended</th>
                </tr>
              </thead>
              <tbody>
                {ended.map(grant => (
                  <tr key={grant.id}>
                    <td>{nameOf.get(grant.user_id) ?? "Unknown person"}</td>
                    <td>{projectOf.get(grant.project_id)?.name ?? "Unknown project"}</td>
                    <td>{MODULE_LABEL[grant.module] ?? grant.module}</td>
                    <td>{grant.ends_at}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}
    </>
  );
}
