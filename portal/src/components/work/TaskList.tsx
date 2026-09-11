"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { EmptyState } from "@/components/EmptyState";

// Specification 11.3 item 3 and 11.4 item 4: "assigned tickets only".
//
// The same list serves an intern and an employee because the rule is the same
// for both -- you see what was assigned to you, and the one thing you may
// change about it is whether it is done. Everything else belongs to whoever
// assigned it, and a trigger in the database enforces that rather than this
// component being trusted.

type Task = {
  id: string;
  title: string;
  description: string | null;
  priority: number | null;
  status: string;
  due_at: string | null;
  project: { name: string } | null;
};

const PRIORITY = ["", "High", "Medium", "Low"];

function dueLabel(due: string | null) {
  if (!due) return null;
  const days = Math.floor((Date.now() - new Date(due).getTime()) / 86_400_000);
  if (days > 1) return days + " days late";
  if (days === 1) return "a day late";
  if (days === 0) return "due today";
  if (days === -1) return "due tomorrow";
  return "due in " + Math.abs(days) + " days";
}

export function TaskList({ tasks, emptyBody }: { tasks: Task[]; emptyBody: string }) {
  const router = useRouter();
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function close(id: string) {
    setError(null);
    const client = createClient();
    if (!client) { setError("This workspace is not configured for sign-in."); return; }

    setBusy(id);
    const { error: failed } = await client.from("tasks")
      .update({ status: "completed", completed_at: new Date().toISOString() })
      .eq("id", id);
    setBusy(null);

    if (failed) { setError(failed.message); return; }
    router.refresh();
  }

  const open = tasks.filter(task => task.status === "open");
  const done = tasks.filter(task => task.status !== "open");

  return (
    <>
      <section className="panel">
        <h2>Open ({open.length})</h2>
        {open.length === 0 ? (
          <EmptyState compact icon="check" title="Nothing assigned to you right now" body={emptyBody} />
        ) : open.map(task => {
          const late = dueLabel(task.due_at);
          return (
            <article className="taskrow" key={task.id}>
              <div>
                <b>{task.title}</b>
                <small>
                  {[task.project?.name, PRIORITY[task.priority ?? 2], late]
                    .filter(Boolean).join(" · ")}
                </small>
                {task.description && <p className="taskdetail">{task.description}</p>}
              </div>
              <button type="button" className="secondary compact" disabled={busy === task.id}
                onClick={() => close(task.id)}>
                {busy === task.id ? "Saving…" : "Mark done"}
              </button>
            </article>
          );
        })}
        {error && <p className="error" role="alert">{error}</p>}
      </section>

      {done.length > 0 && (
        <section className="panel">
          <h2>Done ({done.length})</h2>
          {done.map(task => (
            <article className="taskrow done" key={task.id}>
              <div><b>{task.title}</b><small>{task.project?.name ?? ""}</small></div>
            </article>
          ))}
        </section>
      )}
    </>
  );
}
