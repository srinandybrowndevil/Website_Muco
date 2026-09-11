"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { createClient } from "@muco/core/browser";
import { Icon } from "@muco/ui";

/**
 * Issuing a certificate.
 *
 * The approver's name is captured at issue time and stored on the certificate,
 * not looked up when it is displayed. That is what lets the founder's account
 * be deleted one day without the document losing the name of whoever signed
 * it — the identifier may go null, the name may not.
 *
 * Attendance is shown beside this button rather than enforced by it. A founder
 * closing an internship early, or one who watched somebody work through a
 * fortnight of exams, knows something the count does not.
 */
export function IssueCertificate({
  internId,
  name,
  mentorName,
  attendance,
  threshold,
}: {
  internId: string;
  name: string;
  mentorName: string | null;
  attendance: number;
  threshold: number;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [tools, setTools] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const short = attendance < threshold;

  async function issue() {
    setBusy(true);
    setError(null);
    const supabase = createClient();
    if (!supabase) {
      setBusy(false);
      setError("Not connected to the database.");
      return;
    }
    const { error: failure } = await supabase.rpc("issue_certificate", {
      p_intern_id: internId,
      p_tools: tools.split(",").map(tool => tool.trim()).filter(Boolean),
      p_mentor_name: mentorName,
    });
    setBusy(false);
    if (failure) {
      setError(failure.message);
      return;
    }
    setOpen(false);
    router.refresh();
  }

  if (!open) {
    return (
      <button className="btn sm primary" type="button" onClick={() => setOpen(true)}>
        <Icon name="award" size={14} />
        <span>Approve certificate</span>
      </button>
    );
  }

  return (
    <div className="stack-sm" style={{ flexBasis: "100%" }}>
      {short ? (
        <div className="callout warn">
          <Icon name="alert" size={18} />
          <div>
            <b>{name} logged {attendance}% against a threshold of {threshold}%.</b>
            <p>
              Not a block — you may know something the count does not. It is shown because a
              certificate is a statement the studio stands behind.
            </p>
          </div>
        </div>
      ) : null}

      <div className="field">
        <label htmlFor={"tools-" + internId}>Tools to name on the certificate</label>
        <input
          id={"tools-" + internId}
          type="text"
          value={tools}
          onChange={event => setTools(event.target.value)}
          placeholder="React, Supabase, Figma"
        />
        <span className="hint">Comma separated. Leave empty to name none.</span>
      </div>

      {error ? <p className="errortext" role="alert">{error}</p> : null}

      <div className="cluster">
        <button className="btn sm primary" type="button" onClick={issue} disabled={busy}>
          {busy ? "Issuing" : "Issue the certificate"}
        </button>
        <button className="btn sm quiet" type="button" onClick={() => setOpen(false)}>Not yet</button>
      </div>
    </div>
  );
}
