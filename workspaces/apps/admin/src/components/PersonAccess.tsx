"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { createClient } from "@muco/core/browser";
import { Icon } from "@muco/ui";

/**
 * Switching somebody off, and back on.
 *
 * Immediate and total. disabled_at is read by the four predicates every policy
 * is built on, so setting it closes the client portal, the intern workspace,
 * the staff workspace and the console at once — not when the session expires,
 * on the very next request.
 *
 * The reason is required. Six months later the question is never "was this
 * person disabled" but "why", and a blank column cannot answer it. It is
 * written into the audit trail by a trigger rather than by this form.
 */
export function PersonAccess({
  userId,
  name,
  disabledAt,
  reason,
}: {
  userId: string;
  name: string;
  disabledAt: string | null;
  reason: string | null;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [why, setWhy] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function apply(disable: boolean) {
    setBusy(true);
    setError(null);
    const supabase = createClient();
    if (!supabase) {
      setBusy(false);
      setError("Not connected to the database.");
      return;
    }
    const { error: failure } = await supabase
      .from("memberships")
      .update(
        disable
          ? { disabled_at: new Date().toISOString(), disabled_reason: why.trim() }
          : { disabled_at: null, disabled_reason: null },
      )
      .eq("user_id", userId);
    setBusy(false);
    if (failure) {
      // keep_one_active_admin refuses the last live administrator, which is
      // the one case where this button should fail and say so plainly.
      setError(
        failure.message.toLowerCase().includes("admin")
          ? "This is the last administrator who can still sign in. Promote somebody else first."
          : failure.message,
      );
      return;
    }
    setOpen(false);
    setWhy("");
    router.refresh();
  }

  if (disabledAt) {
    return (
      <div className="stack-sm">
        <div className="callout warn">
          <Icon name="lock" size={18} />
          <div>
            <b>Access is switched off.</b>
            <p>{reason || "No reason was recorded."}</p>
          </div>
        </div>
        <div>
          <button className="btn" type="button" onClick={() => apply(false)} disabled={busy}>
            <Icon name="unlock" size={15} />
            <span>{busy ? "Restoring" : "Give access back"}</span>
          </button>
        </div>
      </div>
    );
  }

  if (!open) {
    return (
      <div className="stack-sm">
        <p className="hint">
          Switching somebody off closes every workspace immediately and keeps everything they did.
          It is almost always the right move rather than deleting them.
        </p>
        <div>
          <button className="btn danger" type="button" onClick={() => setOpen(true)}>
            <Icon name="lock" size={15} />
            <span>Switch off access</span>
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="stack-sm">
      <div className="field">
        <label htmlFor="disable-why">Why is {name} being switched off?</label>
        <input
          id="disable-why"
          type="text"
          value={why}
          onChange={event => setWhy(event.target.value)}
          placeholder="Internship finished / contract ended / left the studio"
          autoFocus
          required
        />
        <span className="hint">Recorded against this change. A blank reason answers nothing later.</span>
      </div>
      {error ? <p className="errortext" role="alert">{error}</p> : null}
      <div className="cluster">
        <button className="btn danger" type="button" onClick={() => apply(true)} disabled={busy || !why.trim()}>
          {busy ? "Switching off" : "Switch off now"}
        </button>
        <button className="btn quiet" type="button" onClick={() => setOpen(false)}>Cancel</button>
      </div>
    </div>
  );
}
