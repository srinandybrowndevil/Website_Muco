"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { createClient } from "@muco/core/browser";
import { Icon } from "@muco/ui";

/**
 * A day of work, in the intern's own words.
 *
 * One entry per intern per day is a database constraint, not a rule this form
 * enforces, so writing twice for the same date updates rather than duplicates.
 * That matters because the attendance percentage a certificate depends on is
 * counted from these rows: two entries for one Tuesday would make a day look
 * like two.
 */
export function WorkLogForm({
  internId,
  organizationId,
  today,
  existing,
}: {
  internId: string;
  organizationId: string;
  today: string;
  existing: { summary: string; hours: number | null } | null;
}) {
  const router = useRouter();
  const [date, setDate] = useState(today);
  const [summary, setSummary] = useState(existing?.summary ?? "");
  const [hours, setHours] = useState(existing?.hours?.toString() ?? "");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    if (!summary.trim()) return;
    setBusy(true);
    setError(null);
    setSaved(false);

    const supabase = createClient();
    if (!supabase) {
      setBusy(false);
      setError("This workspace is not connected to its database.");
      return;
    }

    const { error: failure } = await supabase
      .from("intern_work_logs")
      .upsert(
        {
          organization_id: organizationId,
          intern_id: internId,
          logged_on: date,
          summary: summary.trim(),
          hours: hours === "" ? null : Number(hours),
        },
        { onConflict: "intern_id,logged_on" },
      );

    setBusy(false);
    if (failure) {
      setError(
        failure.message.toLowerCase().includes("row-level")
          ? "Your internship is no longer open for writing. Entries can only be added while it is running."
          : failure.message,
      );
      return;
    }
    setSaved(true);
    router.refresh();
  }

  return (
    <form className="stack" onSubmit={submit}>
      <div className="grid-2">
        <div className="field">
          <label htmlFor="log-date">Date</label>
          <input
            id="log-date"
            type="date"
            value={date}
            max={today}
            onChange={event => { setDate(event.target.value); setSaved(false); }}
            required
          />
          <span className="hint">Today, or a day you missed. Not a future date.</span>
        </div>
        <div className="field">
          <label htmlFor="log-hours">Hours (optional)</label>
          <input
            id="log-hours"
            type="number"
            min="0"
            max="16"
            step="0.5"
            value={hours}
            onChange={event => setHours(event.target.value)}
          />
        </div>
      </div>

      <div className="field">
        <label htmlFor="log-summary">What you worked on</label>
        <textarea
          id="log-summary"
          value={summary}
          onChange={event => { setSummary(event.target.value); setSaved(false); }}
          placeholder="Two or three lines. What you built, what you got stuck on, what you are picking up tomorrow."
          required
        />
      </div>

      {error ? <p className="errortext" role="alert">{error}</p> : null}
      {saved ? (
        <p className="notice" role="status">
          <Icon name="checkCircle" size={14} />
          <span>Saved. Writing again for the same date replaces this entry rather than adding a second one.</span>
        </p>
      ) : null}

      <div>
        <button className="btn primary" type="submit" disabled={busy || !summary.trim()}>
          {busy ? "Saving" : "Save this day"}
        </button>
      </div>
    </form>
  );
}
