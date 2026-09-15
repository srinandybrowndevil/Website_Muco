"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@muco/core/browser";

export function LeadForm({ lead, organizationId }: { organizationId: string; lead: {
  id: string; stage: string; estimated_value: number | string; last_contact_at: string | null;
} }) {
  const router = useRouter();
  const [stage, setStage] = useState(lead.stage);
  const [value, setValue] = useState(String(lead.estimated_value ?? 0));
  const [contact, setContact] = useState(lead.last_contact_at?.slice(0, 10) ?? "");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [saved, setSaved] = useState(false);
  async function submit(event: React.FormEvent) {
    event.preventDefault();
    if (busy) return;
    const amount = Number(value);
    if (!Number.isFinite(amount) || amount < 0 || amount > 9999999999.99) { setError("Enter a valid, non-negative estimate."); return; }
    setBusy(true); setError(""); setSaved(false);
    try {
      const client = createClient();
      if (!client) throw new Error("Not connected to the database.");
      const { data, error: failure } = await client.from("leads").update({ stage, estimated_value: amount,
        last_contact_at: contact === lead.last_contact_at?.slice(0, 10) ? lead.last_contact_at : contact ? new Date(`${contact}T12:00:00Z`).toISOString() : null,
      }).eq("id", lead.id).eq("organization_id", organizationId).select("id").single();
      if (failure || !data) throw failure ?? new Error("The lead could not be updated.");
      setSaved(true); router.refresh();
    } catch { setError("The lead could not be saved. Check your connection and access, then try again. Your changes are still here."); }
    finally { setBusy(false); }
  }
  return <form className="stack" onSubmit={submit} onChange={() => setSaved(false)}>
    <fieldset className="stack" disabled={busy} style={{ border: 0, margin: 0, padding: 0, minWidth: 0 }}>
      <div className="field"><label htmlFor="lead-stage">Sales stage</label><select id="lead-stage" value={stage} onChange={event => setStage(event.target.value)}>
        {[["new", "New"], ["qualified", "Qualified"], ["proposal", "Proposal sent"], ["negotiation", "Negotiating"], ["won", "Won"], ["lost", "Lost"]].map(([key, label]) => <option value={key} key={key}>{label}</option>)}
      </select></div>
      <div className="field"><label htmlFor="lead-value">Estimated value (INR)</label><input id="lead-value" type="number" min="0" max="9999999999.99" step="0.01" required value={value} onChange={event => setValue(event.target.value)} /></div>
      <div className="field"><label htmlFor="lead-contact">Last contact date</label><input id="lead-contact" type="date" value={contact} onChange={event => setContact(event.target.value)} /></div>
      <p className="hint">These are internal sales notes. Saving a lead does not create an invoice or change delivery progress.</p>
      {error ? <p role="alert" className="errortext">{error}</p> : null}
      {saved ? <p role="status" className="callout ok">Lead updated.</p> : null}
      <div><button className="btn primary" disabled={busy}>{busy ? "Saving" : "Save lead"}</button></div>
    </fieldset>
  </form>;
}
