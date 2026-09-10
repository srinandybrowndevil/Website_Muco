"use client";

import { FormEvent, useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";

// Checklist 6.12: the four settings the checklist names, plus the two
// sentences the product has to be able to say.
//
// These are not preferences. The grace window decides how long a finished
// intern can still collect their certificate; the support address is what the
// intern help page prints; the handover note is the sentence a client reads
// about their code transferring on final payment. Every one of them was
// hardcoded or absent, which meant changing any of them was a deploy.

const DEFAULTS = {
  signature_path: "",
  letterhead_path: "",
  default_grace_days: 7,
  attendance_threshold: 75,
  support_email: "",
  handover_note: "",
};

export function WorkspaceSettings({ organizationId }: { organizationId: string }) {
  const [values, setValues] = useState(DEFAULTS);
  const [loaded, setLoaded] = useState(false);
  const [busy, setBusy] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const client = createClient();
    if (!client) return;
    let live = true;

    void (async () => {
      const { data } = await client.from("organization_settings")
        .select("signature_path, letterhead_path, default_grace_days, attendance_threshold, support_email, handover_note")
        .eq("organization_id", organizationId).maybeSingle();
      if (!live) return;
      if (data) {
        setValues({
          signature_path: data.signature_path ?? "",
          letterhead_path: data.letterhead_path ?? "",
          default_grace_days: data.default_grace_days ?? 7,
          attendance_threshold: data.attendance_threshold ?? 75,
          support_email: data.support_email ?? "",
          handover_note: data.handover_note ?? "",
        });
      }
      setLoaded(true);
    })();

    return () => { live = false; };
  }, [organizationId]);

  async function submit(event: FormEvent) {
    event.preventDefault();
    setError(null);
    setSaved(false);

    const client = createClient();
    if (!client) { setError("This workspace is not configured for sign-in."); return; }

    setBusy(true);
    // Upsert on the organization, because the row may not exist yet on a
    // workspace created before these settings did.
    const { error: failed } = await client.from("organization_settings").upsert({
      organization_id: organizationId,
      signature_path: values.signature_path.trim() || null,
      letterhead_path: values.letterhead_path.trim() || null,
      default_grace_days: Number(values.default_grace_days),
      attendance_threshold: Number(values.attendance_threshold),
      support_email: values.support_email.trim() || null,
      handover_note: values.handover_note.trim(),
    }, { onConflict: "organization_id" });
    setBusy(false);

    if (failed) { setError(failed.message); return; }
    setSaved(true);
  }

  if (!loaded) return <section className="panel"><h2>Workspace settings</h2><p className="muted">Reading settings…</p></section>;

  return (
    <form onSubmit={submit} className="panel invitefields">
      <h2>Workspace settings</h2>
      <p className="muted">
        These reach real screens. The support address is printed on the intern help page, and
        the handover sentence is what every client reads about their code.
      </p>

      <div className="fieldgrid">
        <label>
          Read-only days after an internship ends
          <input type="number" min="0" max="60" value={values.default_grace_days}
            onChange={e => setValues({ ...values, default_grace_days: Number(e.target.value) })} />
          <small className="fieldnote">
            How long a finished intern can still collect their certificate. Applied to new
            internships; existing ones keep the window they were created with.
          </small>
        </label>

        <label>
          Attendance threshold
          <input type="number" min="0" max="100" value={values.attendance_threshold}
            onChange={e => setValues({ ...values, attendance_threshold: Number(e.target.value) })} />
          <small className="fieldnote">Percent, used when judging an internship complete.</small>
        </label>

        <label>
          Support email
          <input type="email" value={values.support_email} placeholder="hello@example.com"
            onChange={e => setValues({ ...values, support_email: e.target.value })} />
          <small className="fieldnote">
            Shown to interns as the studio address. Leave it empty and the help page says so
            plainly rather than inventing one.
          </small>
        </label>

        <label>
          Signature image path
          <input value={values.signature_path} placeholder="branding/signature.png"
            onChange={e => setValues({ ...values, signature_path: e.target.value })} />
          <small className="fieldnote">
            A path in the private files bucket. Printed on certificates, so upload it once and
            every certificate carries it.
          </small>
        </label>

        <label>
          Letterhead image path
          <input value={values.letterhead_path} placeholder="branding/letterhead.png"
            onChange={e => setValues({ ...values, letterhead_path: e.target.value })} />
        </label>
      </div>

      <label>
        What clients are told about handover
        <textarea rows={3} value={values.handover_note}
          onChange={e => setValues({ ...values, handover_note: e.target.value })} />
        <small className="fieldnote">
          Shown on every client dashboard. Say what actually happens on final payment, in the
          words you would use out loud.
        </small>
      </label>

      {error && <p className="error" role="alert">{error}</p>}
      {saved && <p className="account-saved" role="status">Saved.</p>}

      <button className="primary" disabled={busy}>{busy ? "Saving…" : "Save settings"}</button>
    </form>
  );
}
