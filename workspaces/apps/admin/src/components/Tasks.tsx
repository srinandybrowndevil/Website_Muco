"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { createClient } from "@muco/core/browser";
import { formatDate } from "@muco/core";
import { Icon, StatusPill } from "@muco/ui";

export type ProjectTask = {
  id: string;
  title: string;
  status: string;
  due_at: string | null;
  assignee_id: string | null;
  assignee: string | null;
};

/**
 * Assigning work.
 *
 * The intern and employee workspaces both show "only tasks assigned to you",
 * and until this existed nothing assigned one. Every task in the database had
 * arrived as an INSERT, which meant the two workspaces that exist to show
 * somebody their work were reliably empty.
 *
 * Only people who hold a grant on this project can be chosen. Assigning a task
 * to somebody without one creates a row they cannot read — the policy on tasks
 * admits the assignee, but the project behind it stays invisible, so they get
 * a task with no context and no way to ask about it.
 */
export function Tasks({
  projectId,
  organizationId,
  tasks,
  assignable,
  canEdit,
}: {
  projectId: string;
  organizationId: string;
  tasks: ProjectTask[];
  assignable: { id: string; name: string; note: string }[];
  canEdit: boolean;
}) {
  const router = useRouter();
  const [adding, setAdding] = useState(false);
  const [title, setTitle] = useState("");
  const [assignee, setAssignee] = useState(assignable[0]?.id ?? "");
  const [dueAt, setDueAt] = useState("");
  const [priority, setPriority] = useState("normal");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function add(event: React.FormEvent) {
    event.preventDefault();
    setBusy(true);
    setError(null);
    const supabase = createClient();
    if (!supabase) {
      setBusy(false);
      setError("Not connected to the database.");
      return;
    }
    const { error: failure } = await supabase.from("tasks").insert({
      organization_id: organizationId,
      project_id: projectId,
      assignee_id: assignee || null,
      title: title.trim(),
      priority,
      status: "open",
      due_at: dueAt ? new Date(dueAt + "T18:00:00+05:30").toISOString() : null,
    });
    setBusy(false);
    if (failure) {
      setError(failure.message);
      return;
    }
    setTitle("");
    setDueAt("");
    setAdding(false);
    router.refresh();
  }

  return (
    <>
      {tasks.length === 0 ? (
        <div className="empty">
          <span className="mark"><Icon name="list" size={22} /></span>
          <b>No tasks on this project</b>
          <p>
            A task assigned here is what appears in somebody&rsquo;s own workspace. Nothing else
            puts work in front of them.
          </p>
        </div>
      ) : (
        <div className="list">
          {tasks.map(task => (
            <div className="item" key={task.id}>
              <span className="item-main">
                <b>{task.title}</b>
                <small>
                  {task.assignee ?? "Unassigned"}
                  {task.due_at ? " · due " + formatDate(task.due_at) : ""}
                </small>
              </span>
              <StatusPill value={task.status} />
            </div>
          ))}
        </div>
      )}

      {canEdit ? (
        <div className="panel-body">
          {adding ? (
            <form className="stack" onSubmit={add}>
              <div className="field">
                <label htmlFor="t-title">What needs doing</label>
                <input id="t-title" type="text" value={title} autoFocus
                  onChange={event => setTitle(event.target.value)}
                  placeholder="Build the enquiry form validation" required />
              </div>
              <div className="grid-2">
                <div className="field">
                  <label htmlFor="t-assignee">Assign to</label>
                  <select id="t-assignee" value={assignee} onChange={event => setAssignee(event.target.value)}>
                    <option value="">Nobody yet</option>
                    {assignable.map(person => (
                      <option key={person.id} value={person.id}>{person.name} — {person.note}</option>
                    ))}
                  </select>
                  {assignable.length === 0 ? (
                    <span className="hint">
                      Nobody holds a grant on this project yet. Grant somebody access first, or the
                      task lands somewhere they cannot open.
                    </span>
                  ) : null}
                </div>
                <div className="field">
                  <label htmlFor="t-due">Due</label>
                  <input id="t-due" type="date" value={dueAt}
                    onChange={event => setDueAt(event.target.value)} />
                </div>
              </div>
              <div className="field">
                <label htmlFor="t-priority">Priority</label>
                <select id="t-priority" value={priority} onChange={event => setPriority(event.target.value)}>
                  <option value="low">Low</option>
                  <option value="normal">Normal</option>
                  <option value="high">High</option>
                </select>
              </div>
              {error ? <p className="errortext" role="alert">{error}</p> : null}
              <div className="cluster">
                <button className="btn sm primary" type="submit" disabled={busy || !title.trim()}>
                  {busy ? "Assigning" : "Assign task"}
                </button>
                <button className="btn sm quiet" type="button" onClick={() => setAdding(false)}>Cancel</button>
              </div>
            </form>
          ) : (
            <button className="btn sm" type="button" onClick={() => setAdding(true)}>
              <Icon name="plus" size={14} />
              <span>Assign a task</span>
            </button>
          )}
        </div>
      ) : null}
    </>
  );
}
