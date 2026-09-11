"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { createClient } from "@muco/core/browser";
import { formatDate } from "@muco/core";
import { Icon, StatusPill } from "@muco/ui";

export type Milestone = {
  id: string;
  title: string;
  detail: string | null;
  status: string;
  due_on: string | null;
  position: number;
  completed_at: string | null;
};

/**
 * The milestones a customer reads on their own Milestones page.
 *
 * These existed in the schema, were displayed in three workspaces, and could
 * only be created with an INSERT — so in practice every client project showed
 * "Milestones are not set yet" forever. A screen the customer reads and the
 * studio cannot write is worse than no screen: it looks like the studio has
 * nothing planned.
 *
 * Marking one complete stamps completed_at here rather than leaving it to a
 * trigger, because the client page shows that date and "completed with no date"
 * is a row that reads as a bug to the person paying for it.
 */
export function Milestones({
  projectId,
  organizationId,
  milestones,
  canEdit,
}: {
  projectId: string;
  organizationId: string;
  milestones: Milestone[];
  canEdit: boolean;
}) {
  const router = useRouter();
  const [adding, setAdding] = useState(false);
  const [title, setTitle] = useState("");
  const [detail, setDetail] = useState("");
  const [dueOn, setDueOn] = useState("");
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
    const { error: failure } = await supabase.from("project_milestones").insert({
      organization_id: organizationId,
      project_id: projectId,
      title: title.trim(),
      detail: detail.trim() || null,
      due_on: dueOn || null,
      status: "planning",
      position: milestones.length + 1,
    });
    setBusy(false);
    if (failure) {
      setError(failure.message);
      return;
    }
    setTitle("");
    setDetail("");
    setDueOn("");
    setAdding(false);
    router.refresh();
  }

  async function setStatus(id: string, status: string) {
    setBusy(true);
    const supabase = createClient();
    if (supabase) {
      await supabase.from("project_milestones").update({
        status,
        completed_at: status === "completed" ? new Date().toISOString() : null,
      }).eq("id", id);
    }
    setBusy(false);
    router.refresh();
  }

  return (
    <>
      {milestones.length === 0 ? (
        <div className="empty">
          <span className="mark"><Icon name="target" size={22} /></span>
          <b>No milestones set</b>
          <p>
            The customer reads these on their own Milestones page, so a project without them tells
            them nothing about when anything lands.
          </p>
        </div>
      ) : (
        <div className="list">
          {milestones.map(milestone => (
            <div className="item" key={milestone.id}>
              <span className="item-main">
                <b>{milestone.title}</b>
                <small>
                  {milestone.detail ? milestone.detail + " · " : ""}
                  {milestone.status === "completed"
                    ? "Accepted " + formatDate(milestone.completed_at)
                    : milestone.due_on ? "Due " + formatDate(milestone.due_on) : "No date"}
                </small>
              </span>
              <StatusPill value={milestone.status} />
              {canEdit ? (
                <select
                  value={milestone.status}
                  disabled={busy}
                  onChange={event => setStatus(milestone.id, event.target.value)}
                  style={{ width: "auto" }}
                  aria-label={"Status of " + milestone.title}
                >
                  <option value="planning">Planning</option>
                  <option value="active">In progress</option>
                  <option value="on_hold">On hold</option>
                  <option value="completed">Accepted</option>
                </select>
              ) : null}
            </div>
          ))}
        </div>
      )}

      {canEdit ? (
        <div className="panel-body">
          {adding ? (
            <form className="stack" onSubmit={add}>
              <div className="field">
                <label htmlFor="m-title">Milestone</label>
                <input id="m-title" type="text" value={title} autoFocus
                  onChange={event => setTitle(event.target.value)}
                  placeholder="Design signed off" required />
              </div>
              <div className="field">
                <label htmlFor="m-detail">What it means (optional)</label>
                <input id="m-detail" type="text" value={detail}
                  onChange={event => setDetail(event.target.value)}
                  placeholder="Written in the customer's words -- they read this." />
              </div>
              <div className="field">
                <label htmlFor="m-due">Expected</label>
                <input id="m-due" type="date" value={dueOn}
                  onChange={event => setDueOn(event.target.value)} />
              </div>
              {error ? <p className="errortext" role="alert">{error}</p> : null}
              <div className="cluster">
                <button className="btn sm primary" type="submit" disabled={busy || !title.trim()}>
                  {busy ? "Adding" : "Add milestone"}
                </button>
                <button className="btn sm quiet" type="button" onClick={() => setAdding(false)}>Cancel</button>
              </div>
            </form>
          ) : (
            <button className="btn sm" type="button" onClick={() => setAdding(true)}>
              <Icon name="plus" size={14} />
              <span>Add a milestone</span>
            </button>
          )}
        </div>
      ) : null}
    </>
  );
}
