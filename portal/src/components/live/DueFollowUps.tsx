"use client";

import { useCallback, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { useLiveQuery } from "@/lib/use-live-query";

// The follow-ups that are due, on the page you already open.
//
// A count of open follow-ups tells you there is work. It does not tell you
// which promise you are about to break. This lists the ones that are late or
// due today, worst first, with the only action that matters next to each.
//
// Nothing here notifies anybody. That needs somewhere to send it and a decision
// about interrupting people, neither of which exists yet. Putting it where the
// day starts is the honest version of a reminder until then.

// How late, worked out once when the rows arrive rather than on every render.
// Reading the clock while rendering makes the output depend on when React
// happened to run, which is impure, and is the same thing that made the work
// log disagree with itself between the server and the browser.
type Due = { id: string; title: string; priority: number | null; daysLate: number };

function dueLabel(daysLate: number) {
  if (daysLate > 1) return `${daysLate} days late`;
  if (daysLate === 1) return "a day late";
  if (daysLate === 0) return "due today";
  return "due soon";
}

const PRIORITY = ["", "High", "Medium", "Low"];

export function DueFollowUps({ organizationId }: { organizationId: string }) {
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    const client = createClient()!;
    // End of today in the studio's own timezone. Using the browser's midnight
    // would mean a follow-up counts as due at a different moment depending on
    // where the person opening the page happens to be.
    const endOfToday = new Date(new Date().toLocaleString("en-US", { timeZone: "Asia/Kolkata" }));
    endOfToday.setHours(23, 59, 59, 999);

    const { data, error: failed } = await client.from("tasks")
      .select("id, title, priority, due_at, customer_id, lead_id")
      .eq("organization_id", organizationId)
      .eq("status", "open")
      .not("due_at", "is", null)
      .lte("due_at", endOfToday.toISOString())
      .order("due_at", { ascending: true })
      .limit(25);
    if (failed) throw new Error(failed.message);

    const now = Date.now();
    return (data ?? []).map(row => {
      const due = new Date(String(row.due_at));
      const daysLate = Number.isNaN(due.getTime())
        ? -1
        : Math.floor((now - due.getTime()) / 86_400_000);
      return {
        id: String(row.id),
        title: String(row.title ?? ""),
        priority: row.priority == null ? null : Number(row.priority),
        daysLate,
      } satisfies Due;
    });
  }, [organizationId]);

  const state = useLiveQuery("tasks", load, organizationId);

  async function complete(task: Due) {
    const id = task.id;
    setBusy(id);
    setError(null);

    const client = createClient()!;
    const { error: failed } = await client.from("tasks")
      .update({ status: "completed", completed_at: new Date().toISOString() })
      .eq("id", id)
      .eq("organization_id", organizationId);

    if (failed) {
      setBusy(null);
      setError(`${task.title} could not be closed. ${failed.message}`);
      return;
    }

    // Same order as a stage change: the fact first, the record of it after, and
    // a failure to record is reported rather than swallowed.
    const { data: { user } } = await client.auth.getUser();
    if (user) {
      const { error: noteFailed } = await client.from("activities").insert({
        organization_id: organizationId,
        actor_id: user.id,
        entity_type: "task",
        entity_id: id,
        action: "completed",
        payload: { title: task.title },
      });
      if (noteFailed) setError(`Closed, but it was not added to the history. ${noteFailed.message}`);
    }

    setBusy(null);
  }

  const rows = state.data ?? [];
  const late = rows.filter(task => task.daysLate >= 1).length;

  // Nothing due is worth saying once, not worth a panel taking up the page.
  if (!state.loading && rows.length === 0 && !state.error) return null;

  return (
    <section className="panel duepanel">
      <div className="panelhead">
        <h2>Needs you today</h2>
        <span>{late > 0 ? `${late} already late` : "nothing overdue"}</span>
      </div>

      {state.error && <p className="error" role="alert">{state.error}</p>}
      {error && <p className="error" role="alert">{error}</p>}
      {state.loading && !rows.length && <p role="status">Checking your follow-ups…</p>}

      <ul className="duelist">
        {rows.map(task => {
          const id = task.id;
          return (
            <li key={id} className={task.daysLate >= 1 ? "late" : undefined}>
              <div>
                <b>{task.title}</b>
                <small>
                  {dueLabel(task.daysLate)}
                  {task.priority ? ` · ${PRIORITY[task.priority] ?? ""} priority` : ""}
                </small>
              </div>
              <button
                className="secondary compact"
                disabled={busy === id}
                onClick={() => void complete(task)}
              >
                {busy === id ? "Closing…" : "Done"}
              </button>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
