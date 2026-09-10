"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { CrmRow, currency, label } from "@/lib/crm";
import { useLiveQuery } from "@/lib/use-live-query";
import { EmptyState } from "../EmptyState";
import { ActivityTimeline } from "./ActivityTimeline";

// The stages, in the order money actually moves through them. This mirrors the
// lead_stage type in the database rather than restating it loosely: a stage the
// database will not accept must never appear as a column somebody can drop a
// card into.
const STAGES = ["new", "qualified", "proposal", "negotiation", "won", "lost"] as const;
type Stage = (typeof STAGES)[number];

// Won and lost leave the pipeline. They are still shown, because a board that
// hides its outcomes tells you only what is pending and never what happened.
const CLOSED: Stage[] = ["won", "lost"];

const MAX_ON_BOARD = 500;

function sinceLabel(value: unknown) {
  if (!value) return "not contacted";
  const then = new Date(String(value));
  if (Number.isNaN(then.getTime())) return "not contacted";
  const days = Math.floor((Date.now() - then.getTime()) / 86_400_000);
  if (days <= 0) return "today";
  if (days === 1) return "yesterday";
  if (days < 30) return `${days} days ago`;
  const months = Math.floor(days / 30);
  return months === 1 ? "a month ago" : `${months} months ago`;
}

export function LeadPipeline({ organizationId }: { organizationId: string }) {
  const [moving, setMoving] = useState<string | null>(null);
  const [dragging, setDragging] = useState<string | null>(null);
  const [over, setOver] = useState<Stage | null>(null);
  const [error, setError] = useState<string | null>(null);
  // Applied on top of what the server last sent, so a card moves the instant it
  // is dropped instead of after a round trip.
  const [optimistic, setOptimistic] = useState<Record<string, Stage>>({});
  // The card whose history is open. Held by id rather than by object so it
  // follows the live data: a lead edited elsewhere updates in the open panel
  // instead of showing what it looked like when the panel opened.
  const [openId, setOpenId] = useState<string | null>(null);
  const detail = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    const box = detail.current;
    if (!box) return;
    if (openId && !box.open) box.showModal();
    if (!openId && box.open) box.close();
  }, [openId]);

  const load = useCallback(async () => {
    const client = createClient()!;
    const { data, error: failed } = await client.from("leads")
      .select("id, name, company, email, source, stage, estimated_value, last_contact_at")
      .eq("organization_id", organizationId)
      .order("estimated_value", { ascending: false })
      .limit(MAX_ON_BOARD);
    if (failed) throw new Error(failed.message);
    return (data ?? []) as CrmRow[];
  }, [organizationId]);

  const state = useLiveQuery("leads", load, organizationId);

  async function move(lead: CrmRow, to: Stage) {
    const from = String(lead.stage) as Stage;
    if (from === to) return;

    const id = String(lead.id);
    setError(null);
    setMoving(id);
    setOptimistic(current => ({ ...current, [id]: to }));

    const client = createClient()!;
    const { error: failed } = await client.from("leads")
      .update({ stage: to })
      .eq("id", id)
      .eq("organization_id", organizationId);

    if (failed) {
      // Put it back where it was. A card that stays in the new column after a
      // failed save is a lie the next person will act on.
      setOptimistic(current => {
        const next = { ...current };
        delete next[id];
        return next;
      });
      setMoving(null);
      setError(`${String(lead.name)} could not be moved. ${failed.message}`);
      return;
    }

    // The move is the fact; the history entry is the record of it. Written
    // after, so a failure here never blocks the move -- but it is reported,
    // because a pipeline whose history quietly has holes cannot answer "when
    // did this stall?".
    const { data: { user } } = await client.auth.getUser();
    if (user) {
      const { error: noteFailed } = await client.from("activities").insert({
        organization_id: organizationId,
        actor_id: user.id,
        entity_type: "lead",
        entity_id: id,
        action: "stage_changed",
        payload: { from, to },
      });
      if (noteFailed) setError(`Moved, but the change was not added to the history. ${noteFailed.message}`);
    }

    setMoving(null);
  }

  const rows = state.data ?? [];
  const stageOf = (lead: CrmRow) => (optimistic[String(lead.id)] ?? String(lead.stage)) as Stage;
  const inStage = (stage: Stage) => rows.filter(lead => stageOf(lead) === stage);
  const totalOf = (stage: Stage) =>
    inStage(stage).reduce((sum, lead) => sum + (Number(lead.estimated_value) || 0), 0);

  const openStages = STAGES.filter(s => !CLOSED.includes(s));
  const openValue = openStages.reduce((sum, s) => sum + totalOf(s), 0);
  const openCount = openStages.reduce((n, s) => n + inStage(s).length, 0);

  return (
    <>
      <div className="pagehead">
        <div>
          <p className="eyebrow">Leads</p>
          <h1>Pipeline.</h1>
          <p>
            {rows.length === 0
              ? "Every lead you are working, by stage."
              : `${currency(openValue)} still in play across ${openCount} open ${openCount === 1 ? "lead" : "leads"}.`}
          </p>
        </div>
      </div>

      {state.error && <p className="error" role="alert">{state.error}</p>}
      {error && <p className="error" role="alert">{error}</p>}
      {state.loading && !rows.length && <p role="status">Loading the pipeline…</p>}

      {!state.loading && rows.length === 0 ? (
        <section className="panel">
          <EmptyState
            icon="target"
            title="No leads yet"
            body="A lead is someone worth following up. Add one and it appears here, moving through the stages as the conversation does — so the board shows what is actually in play rather than what you remember."
          />
        </section>
      ) : (
        <div className="board" role="list" aria-label="Lead pipeline by stage">
          {STAGES.map(stage => {
            const cards = inStage(stage);
            return (
              <section
                key={stage}
                role="listitem"
                className={`boardcol${CLOSED.includes(stage) ? " closed" : ""}${over === stage ? " over" : ""}`}
                onDragOver={event => { event.preventDefault(); setOver(stage); }}
                onDragLeave={() => setOver(current => (current === stage ? null : current))}
                onDrop={event => {
                  event.preventDefault();
                  setOver(null);
                  const lead = rows.find(r => String(r.id) === dragging);
                  setDragging(null);
                  if (lead) void move(lead, stage);
                }}
              >
                <header className="boardcol-head">
                  <b>{label(stage)}</b>
                  <span>{cards.length}</span>
                  <small>{currency(totalOf(stage))}</small>
                </header>

                <div className="boardcol-body">
                  {cards.map(lead => {
                    const id = String(lead.id);
                    return (
                      <article
                        key={id}
                        className={`leadcard${moving === id ? " busy" : ""}`}
                        draggable
                        onDragStart={() => setDragging(id)}
                        onDragEnd={() => { setDragging(null); setOver(null); }}
                        onClick={() => setOpenId(id)}
                        onKeyDown={event => {
                          if (event.key === "Enter" || event.key === " ") {
                            event.preventDefault();
                            setOpenId(id);
                          }
                        }}
                        tabIndex={0}
                        role="button"
                        aria-label={`Open ${String(lead.name)}`}
                      >
                        <b>{String(lead.name)}</b>
                        {lead.company ? <span>{String(lead.company)}</span> : null}
                        <span className="leadcard-value">{currency(lead.estimated_value)}</span>
                        <small>
                          {lead.source ? `${label(lead.source)} · ` : ""}
                          {sinceLabel(lead.last_contact_at)}
                        </small>

                        {/* Dragging is the quick way, not the only way. A board
                            that can only be worked with a mouse cannot be worked
                            by everyone, so every card carries the same move as a
                            control that works from the keyboard. */}
                        <label
                          className="leadcard-move"
                          onClick={event => event.stopPropagation()}
                          onKeyDown={event => event.stopPropagation()}
                        >
                          <span className="visually-hidden">Stage for {String(lead.name)}</span>
                          <select
                            value={stageOf(lead)}
                            disabled={moving === id}
                            onChange={event => void move(lead, event.target.value as Stage)}
                          >
                            {STAGES.map(option => (
                              <option key={option} value={option}>{label(option)}</option>
                            ))}
                          </select>
                        </label>
                      </article>
                    );
                  })}

                  {cards.length === 0 && <p className="boardcol-empty">Nothing here.</p>}
                </div>
              </section>
            );
          })}
        </div>
      )}

      <dialog ref={detail} className="detailbox" onClose={() => setOpenId(null)}>
        {(() => {
          const lead = rows.find(r => String(r.id) === openId);
          if (!lead) return null;
          return (
            <>
              <div className="detailbox-head">
                <div>
                  <p className="eyebrow">{label(stageOf(lead))}</p>
                  <h2>{String(lead.name)}</h2>
                  <p>
                    {[lead.company, lead.email, lead.source && `via ${label(lead.source)}`]
                      .filter(Boolean).map(String).join(" · ") || "No other details recorded."}
                  </p>
                </div>
                <button className="secondary compact" onClick={() => setOpenId(null)}>Close</button>
              </div>

              <p className="detailbox-value">{currency(lead.estimated_value)}</p>
              <p className="detailbox-since">Last contact {sinceLabel(lead.last_contact_at)}.</p>

              <h3>History</h3>
              <ActivityTimeline
                organizationId={organizationId}
                entityType="lead"
                entityId={String(lead.id)}
              />
            </>
          );
        })()}
      </dialog>

      {rows.length === MAX_ON_BOARD && (
        <p className="invoicedoc-note">
          Showing the {MAX_ON_BOARD} largest leads by value. Older ones are still in the table view.
        </p>
      )}
    </>
  );
}
