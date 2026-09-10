"use client";

import { FormEvent, useCallback, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { label } from "@/lib/crm";
import { useLiveQuery } from "@/lib/use-live-query";

// What happened to one record, in order, with a way to add to it.
//
// The database has no update or delete policy on activities, so this is
// append-only whether the interface allows editing or not. That is the right
// shape for a history -- a note somebody can quietly rewrite is not a record of
// what was said -- but it has to be stated, or the first person to spot a typo
// will hunt for an edit button that was never going to exist.

type Entry = {
  id: string;
  action: string;
  payload: Record<string, unknown> | null;
  created_at: string;
  actor_id: string | null;
  profiles: { full_name: string | null } | null;
};

function when(value: string) {
  return new Date(value).toLocaleString("en-IN", {
    day: "numeric", month: "short", hour: "numeric", minute: "2-digit",
    timeZone: "Asia/Kolkata",
  });
}

function describe(entry: Entry): string {
  const detail = entry.payload ?? {};
  switch (entry.action) {
    case "note":
      return String(detail.body ?? "");
    case "stage_changed":
      return `Moved from ${label(detail.from)} to ${label(detail.to)}`;
    case "created":
      return "Created";
    default:
      // An action nobody has written a sentence for still reads as something,
      // rather than showing a blank row and looking broken.
      return label(entry.action);
  }
}

export function ActivityTimeline({
  organizationId,
  entityType,
  entityId,
}: {
  organizationId: string;
  entityType: string;
  entityId: string;
}) {
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    const client = createClient()!;
    // The actor embed names its foreign key. activities reaches profiles once
    // today, but naming it costs nothing and is what stops this becoming the
    // ambiguous-embed failure that printed certificates with no name on them.
    const { data, error: failed } = await client.from("activities")
      .select("id, action, payload, created_at, actor_id, profiles!activities_actor_id_fkey(full_name)")
      .eq("organization_id", organizationId)
      .eq("entity_type", entityType)
      .eq("entity_id", entityId)
      .order("created_at", { ascending: false })
      .limit(200);
    if (failed) throw new Error(failed.message);
    return (data ?? []) as unknown as Entry[];
  }, [organizationId, entityType, entityId]);

  const state = useLiveQuery("activities", load, organizationId);

  async function addNote(event: FormEvent) {
    event.preventDefault();
    const body = note.trim();
    if (!body) return;

    setBusy(true);
    setError(null);
    const client = createClient()!;
    const { data: { user } } = await client.auth.getUser();
    if (!user) {
      setBusy(false);
      setError("Your session has expired. Refresh and sign in again.");
      return;
    }

    const { error: failed } = await client.from("activities").insert({
      organization_id: organizationId,
      actor_id: user.id,
      entity_type: entityType,
      entity_id: entityId,
      action: "note",
      payload: { body },
    });

    setBusy(false);
    if (failed) {
      // The note stays in the box on failure. Clearing it would lose what
      // somebody just typed in order to tell them it did not send.
      setError(`That note was not saved. ${failed.message}`);
      return;
    }
    setNote("");
  }

  const entries = state.data ?? [];

  return (
    <div className="timeline">
      <form className="timeline-add" onSubmit={addNote}>
        <label htmlFor="timeline-note" className="visually-hidden">Add a note</label>
        <textarea
          id="timeline-note"
          rows={2}
          value={note}
          maxLength={2000}
          disabled={busy}
          placeholder="What happened? Who said what, and what comes next."
          onChange={event => setNote(event.target.value)}
        />
        <div className="timeline-add-foot">
          <small>Notes are part of the record and cannot be edited afterwards.</small>
          <button className="primary compact" disabled={busy || !note.trim()}>
            {busy ? "Saving…" : "Add note"}
          </button>
        </div>
      </form>

      {error && <p className="error" role="alert">{error}</p>}
      {state.error && <p className="error" role="alert">{state.error}</p>}
      {state.loading && !entries.length && <p role="status">Loading the history…</p>}

      {!state.loading && entries.length === 0 ? (
        <p className="timeline-empty">
          Nothing recorded yet. Moves between stages appear here on their own; anything
          said on a call is only here if somebody writes it down.
        </p>
      ) : (
        <ol className="timeline-list">
          {entries.map(entry => (
            <li key={entry.id} className={entry.action === "note" ? "note" : undefined}>
              <p>{describe(entry)}</p>
              <small>
                {entry.profiles?.full_name ?? "Someone no longer listed"} · {when(entry.created_at)}
              </small>
            </li>
          ))}
        </ol>
      )}
    </div>
  );
}
