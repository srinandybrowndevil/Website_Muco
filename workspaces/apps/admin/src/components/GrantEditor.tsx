"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { daysFromToday, today } from "@muco/core";
import { createClient } from "@muco/core/browser";
import { Icon } from "@muco/ui";

// The vocabulary the policies actually read. Adding a module here that no
// policy checks would create a grant that grants nothing, which is worse than
// no grant at all: it looks like access somebody has.
const MODULES: [string, string][] = [
  ["scope", "Scope — the brief, the description and scope documents"],
  ["files", "Files — documents attached to the project"],
  ["tickets", "Tickets — tasks on the project"],
  ["staging", "Staging — the preview and staging addresses"],
];

const LEVELS: [string, string][] = [
  ["read", "Read"],
  ["write", "Read and write"],
];

/**
 * Granting somebody access to one module of one project, until a date.
 *
 * An end date is offered and defaulted rather than left blank, because a grant
 * with no end date is a grant nobody ever revokes. The home page counts the
 * ones expiring within seven days for the same reason.
 */
export function GrantEditor({
  organizationId,
  people,
  projects,
}: {
  organizationId: string;
  people: { id: string; name: string; role: string }[];
  projects: { id: string; name: string }[];
}) {
  const router = useRouter();
  const [userId, setUserId] = useState(people[0]?.id ?? "");
  const [projectId, setProjectId] = useState(projects[0]?.id ?? "");
  const [module, setModule] = useState(MODULES[0][0]);
  const [level, setLevel] = useState("read");
  const [endsAt, setEndsAt] = useState(() => daysFromToday(90));
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    setBusy(true);
    setError(null);

    const supabase = createClient();
    if (!supabase) {
      setBusy(false);
      setError("Not connected to the database.");
      return;
    }

    const { error: failure } = await supabase.from("project_grants").insert({
      organization_id: organizationId,
      user_id: userId,
      project_id: projectId,
      module,
      level,
      starts_at: today(),
      ends_at: endsAt || null,
    });

    setBusy(false);
    if (failure) {
      setError(failure.message);
      return;
    }
    router.refresh();
  }

  if (people.length === 0 || projects.length === 0) {
    return (
      <p className="hint">
        A grant needs a person and a project. {people.length === 0 ? "Invite somebody first." : "Create a project first."}
      </p>
    );
  }

  return (
    <form className="stack" onSubmit={submit}>
      <div className="grid-2">
        <div className="field">
          <label htmlFor="grant-person">Person</label>
          <select id="grant-person" value={userId} onChange={event => setUserId(event.target.value)}>
            {people.map(person => (
              <option key={person.id} value={person.id}>{person.name} — {person.role}</option>
            ))}
          </select>
        </div>
        <div className="field">
          <label htmlFor="grant-project">Project</label>
          <select id="grant-project" value={projectId} onChange={event => setProjectId(event.target.value)}>
            {projects.map(project => (
              <option key={project.id} value={project.id}>{project.name}</option>
            ))}
          </select>
        </div>
      </div>

      <div className="field">
        <label htmlFor="grant-module">Module</label>
        <select id="grant-module" value={module} onChange={event => setModule(event.target.value)}>
          {MODULES.map(([value, label]) => <option key={value} value={value}>{label}</option>)}
        </select>
      </div>

      <div className="grid-2">
        <div className="field">
          <label htmlFor="grant-level">Level</label>
          <select id="grant-level" value={level} onChange={event => setLevel(event.target.value)}>
            {LEVELS.map(([value, label]) => <option key={value} value={value}>{label}</option>)}
          </select>
        </div>
        <div className="field">
          <label htmlFor="grant-ends">Expires</label>
          <input id="grant-ends" type="date" value={endsAt}
            onChange={event => setEndsAt(event.target.value)} />
          <span className="hint">A grant with no end date is one nobody revokes.</span>
        </div>
      </div>

      {error ? <p className="errortext" role="alert">{error}</p> : null}

      <div>
        <button className="btn primary" type="submit" disabled={busy}>
          <Icon name="key" size={15} />
          <span>{busy ? "Granting" : "Grant access"}</span>
        </button>
      </div>
    </form>
  );
}
