"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { createClient } from "@muco/core/browser";
import { formatDate, relativeDays } from "@muco/core";
import { EmptyState, Icon, StatusPill } from "@muco/ui";

export type TaskRow = {
  id: string;
  title: string;
  description: string | null;
  status: string;
  priority: string | null;
  due_at: string | null;
  project: string | null;
};

/**
 * The tasks assigned to you, and the one thing you may do to them.
 *
 * Marking a task done is the only change an assignee can make. The database
 * enforces that rather than this component: guard_task_selfservice refuses a
 * change of assignee, project or organisation coming from the person the task
 * is assigned to, so the worst a broken build of this page could do is fail.
 */
export function TaskList({ tasks }: { tasks: TaskRow[] }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function setStatus(id: string, status: "open" | "completed") {
    setBusy(id);
    setError(null);
    const supabase = createClient();
    if (!supabase) {
      setBusy(null);
      setError("This workspace is not connected to its database.");
      return;
    }
    const { error: failure } = await supabase
      .from("tasks")
      .update({
        status,
        completed_at: status === "completed" ? new Date().toISOString() : null,
      })
      .eq("id", id);
    setBusy(null);
    if (failure) {
      setError("That change was refused. Reload the page — somebody may have reassigned this task.");
      return;
    }
    startTransition(() => router.refresh());
  }

  if (tasks.length === 0) {
    return (
      <EmptyState icon="checkCircle" title="Nothing assigned to you right now">
        Only tasks assigned to you appear here — not the studio&rsquo;s whole board. If you are
        waiting on work, ask your mentor rather than waiting for this page to change.
      </EmptyState>
    );
  }

  return (
    <div className="list" aria-busy={pending}>
      {error ? <p className="errortext" role="alert" style={{ padding: "0 var(--pad-card)" }}>{error}</p> : null}
      {tasks.map(task => {
        const done = task.status === "completed";
        const overdue = !done && task.due_at ? Date.parse(task.due_at) < Date.now() : false;
        return (
          <div className="item" key={task.id}>
            <button
              type="button"
              className="iconbtn"
              onClick={() => setStatus(task.id, done ? "open" : "completed")}
              disabled={busy === task.id || task.status === "cancelled"}
              aria-label={done ? "Reopen " + task.title : "Mark " + task.title + " done"}
              aria-pressed={done}
            >
              <Icon name={done ? "checkCircle" : "circle"} size={19} />
            </button>
            <span className="item-main">
              <b style={done ? { textDecoration: "line-through", opacity: 0.6 } : undefined}>
                {task.title}
              </b>
              <small>
                {task.project ?? "No project"}
                {task.due_at ? " · due " + formatDate(task.due_at) + " (" + relativeDays(task.due_at) + ")" : ""}
              </small>
            </span>
            {overdue ? <StatusPill value="overdue" label="Overdue" /> : null}
            {task.priority && task.priority !== "normal" ? (
              <span className="badge">{task.priority}</span>
            ) : null}
          </div>
        );
      })}
    </div>
  );
}
