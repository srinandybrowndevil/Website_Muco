"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

// One entry per day is a database constraint, not a suggestion: the attendance
// percentage the certificate depends on is only meaningful if a day cannot be
// counted twice. A repeat save updates that day rather than failing.
// `today` arrives from the server rather than being read from the browser
// clock. Reading it during render makes the server and the browser disagree
// whenever they sit in different time zones, and the studio keeps one working
// calendar anyway -- a day is a day in Erode, not wherever the laptop is.
export function WorkLogForm({
  organizationId, internId, today,
}: { organizationId: string; internId: string; today: string }) {
  const router = useRouter();
  const [loggedOn, setLoggedOn] = useState(today);
  const [summary, setSummary] = useState("");
  const [hours, setHours] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  async function save(event: FormEvent) {
    event.preventDefault();
    setError(null); setSaved(false);
    const text = summary.trim();
    if (text.length < 5) { setError("Write a sentence about what you worked on."); return; }
    if (!loggedOn) { setError("Choose the day this entry is for."); return; }
    if (loggedOn > today) { setError("You cannot log a day that has not happened yet."); return; }
    const client = createClient();
    if (!client) { setError("Saving is unavailable right now."); return; }

    setBusy(true);
    const { error: saveError } = await client.from("intern_work_logs").upsert({
      organization_id: organizationId,
      intern_id: internId,
      logged_on: loggedOn,
      summary: text,
      hours: hours.trim() ? Number(hours) : null,
    }, { onConflict: "intern_id,logged_on" });
    setBusy(false);

    if (saveError) {
      setError("That entry could not be saved. Your internship may have ended, which closes the log.");
      return;
    }
    setSummary(""); setHours(""); setSaved(true);
    router.refresh();
  }

  return (
    <form className="record-fields worklogform" onSubmit={save}>
      <label htmlFor="log-date">Day<input id="log-date" type="date" max={today} value={loggedOn} onChange={e => setLoggedOn(e.target.value)} required /></label>
      <label htmlFor="log-hours">Hours (optional)<input id="log-hours" type="number" min="0.5" max="24" step="0.5" value={hours} onChange={e => setHours(e.target.value)} placeholder="6" /></label>
      <label className="worklog-summary" htmlFor="log-summary">What you worked on
        <textarea id="log-summary" value={summary} onChange={e => setSummary(e.target.value)} required
          placeholder="What you built or learned, and anything that blocked you." />
      </label>
      {error && <p className="error" role="alert">{error}</p>}
      {saved && <p className="success" role="status">Saved.</p>}
      <div className="formactions"><button className="primary" disabled={busy}>{busy ? "Saving…" : "Save entry"}</button></div>
    </form>
  );
}
