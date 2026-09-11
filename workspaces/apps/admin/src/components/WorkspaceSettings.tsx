"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { createClient } from "@muco/core/browser";
import { Icon } from "@muco/ui";

export type Settings = {
  signature_path: string | null;
  letterhead_path: string | null;
  default_grace_days: number;
  attendance_threshold: number;
  support_email: string | null;
  handover_note: string | null;
};

/**
 * The settings that other pages actually read.
 *
 * Every field here has a consumer, and that is the test a setting has to pass
 * before it belongs on this page. A field added to satisfy a checklist row
 * rather than a rule is the failure the checklist itself warns about — it
 * looks like configuration and changes nothing.
 *
 *   grace days           inherited by an internship when it is created
 *   attendance threshold shown beside every approve button
 *   support email        the address the intern and client workspaces print
 *   handover note        shown to interns on their help page
 *   signature            the founder signature the certificate carries
 */
export function WorkspaceSettings({
  organizationId,
  settings,
}: {
  organizationId: string;
  settings: Settings | null;
}) {
  const router = useRouter();
  const [grace, setGrace] = useState(String(settings?.default_grace_days ?? 7));
  const [threshold, setThreshold] = useState(String(settings?.attendance_threshold ?? 80));
  const [support, setSupport] = useState(settings?.support_email ?? "");
  const [note, setNote] = useState(settings?.handover_note ?? "");
  const [signature, setSignature] = useState(settings?.signature_path ?? "");
  const [busy, setBusy] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    setBusy(true);
    setError(null);
    setSaved(false);

    const supabase = createClient();
    if (!supabase) {
      setBusy(false);
      setError("Not connected to the database.");
      return;
    }

    const { error: failure } = await supabase.from("organization_settings").upsert(
      {
        organization_id: organizationId,
        default_grace_days: Number(grace),
        attendance_threshold: Number(threshold),
        support_email: support.trim() || null,
        handover_note: note.trim() || null,
        signature_path: signature.trim() || null,
      },
      { onConflict: "organization_id" },
    );

    setBusy(false);
    if (failure) {
      setError(failure.message);
      return;
    }
    setSaved(true);
    router.refresh();
  }

  return (
    <form className="stack" onSubmit={submit}>
      <div className="grid-2">
        <div className="field">
          <label htmlFor="set-grace">Grace days after an internship ends</label>
          <input id="set-grace" type="number" min="0" max="60" value={grace}
            onChange={event => { setGrace(event.target.value); setSaved(false); }} />
          <span className="hint">
            Read-only access for this many days after the end date. Inherited by every new
            internship; changing it does not move anybody already running.
          </span>
        </div>
        <div className="field">
          <label htmlFor="set-threshold">Attendance threshold</label>
          <input id="set-threshold" type="number" min="0" max="100" value={threshold}
            onChange={event => { setThreshold(event.target.value); setSaved(false); }} />
          <span className="hint">
            Shown beside every approve button. Shown rather than enforced — you may know something
            the count does not.
          </span>
        </div>
      </div>

      <div className="field">
        <label htmlFor="set-support">Support address</label>
        <input id="set-support" type="email" value={support}
          onChange={event => { setSupport(event.target.value); setSaved(false); }}
          placeholder="founder@mucolabs.com" />
        <span className="hint">Printed on the intern help page and the client support page.</span>
      </div>

      <div className="field">
        <label htmlFor="set-signature">Signature image path</label>
        <input id="set-signature" type="text" value={signature}
          onChange={event => { setSignature(event.target.value); setSaved(false); }}
          placeholder="crm-files/signatures/founder.png" />
        <span className="hint">
          A path inside the private bucket. The certificate names its approver in text regardless,
          so a missing signature does not make a certificate unverifiable.
        </span>
      </div>

      <div className="field">
        <label htmlFor="set-note">Note shown to interns</label>
        <textarea id="set-note" value={note}
          onChange={event => { setNote(event.target.value); setSaved(false); }}
          placeholder="Anything every intern should read: where standups happen, how to ask for help, what the studio expects." />
      </div>

      {error ? <p className="errortext" role="alert">{error}</p> : null}
      {saved ? (
        <p className="notice" role="status">
          <Icon name="checkCircle" size={14} />
          <span>Saved. These take effect on the next page load in every workspace.</span>
        </p>
      ) : null}

      <div>
        <button className="btn primary" type="submit" disabled={busy}>
          {busy ? "Saving" : "Save settings"}
        </button>
      </div>
    </form>
  );
}
