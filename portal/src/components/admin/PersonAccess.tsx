"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

// Switching somebody off, from the screen where you can see who they are.
//
// The rule itself lives in the database -- disabled_at is read by the four
// predicates every policy calls, so an account that is switched off stops
// answering everywhere at once, whether the person uses this product or talks
// to the API directly. This is only the handle on it. That order matters: a
// button that hides a workspace while the API keeps serving it would be the
// reassuring kind of useless.
//
// A reason is required rather than optional. The moment you need this screen
// is the moment you are least likely to write it down afterwards, and the
// audit log keeps whatever is typed here.

type Props = {
  organizationId: string;
  userId: string;
  name: string;
  disabledAt: string | null;
  disabledReason: string | null;
  isSelf: boolean;
};

export function PersonAccess({ organizationId, userId, name, disabledAt, disabledReason, isSelf }: Props) {
  const router = useRouter();
  const [asking, setAsking] = useState(false);
  const [reason, setReason] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function write(patch: { disabled_at: string | null; disabled_reason: string | null }) {
    setError(null);
    const client = createClient();
    if (!client) {
      setError("This workspace is not configured for sign-in.");
      return;
    }
    setBusy(true);
    const { error: failed } = await client.from("memberships")
      .update(patch).eq("organization_id", organizationId).eq("user_id", userId);
    setBusy(false);

    if (failed) {
      // The database refuses to strand an organization without an
      // administrator, and says so in words meant for a person. Anything else
      // is reported as it came rather than flattened into "something went
      // wrong", which would hide exactly the detail needed to fix it.
      setError(failed.message);
      return;
    }
    setAsking(false);
    setReason("");
    router.refresh();
  }

  if (disabledAt) {
    return (
      <div className="accesscell">
        <span className="accessstate off">Switched off</span>
        <span className="muted">{disabledReason || "No reason recorded"}</span>
        <button type="button" className="secondary compact" disabled={busy}
          onClick={() => write({ disabled_at: null, disabled_reason: null })}>
          {busy ? "Working…" : "Switch back on"}
        </button>
        {error && <p className="error" role="alert">{error}</p>}
      </div>
    );
  }

  return (
    <div className="accesscell">
      <span className="accessstate on">Active</span>

      {isSelf ? (
        <span className="muted">This is you</span>
      ) : !asking ? (
        <button type="button" className="secondary compact" onClick={() => setAsking(true)}>
          Switch off
        </button>
      ) : (
        <div className="accessconfirm">
          <label htmlFor={`reason-${userId}`}>Why is {name} losing access?</label>
          <input id={`reason-${userId}`} value={reason} disabled={busy}
            placeholder="Laptop lost, left the team, suspected breach…"
            onChange={event => setReason(event.target.value)} />
          <div className="accessbuttons">
            <button type="button" className="primary compact" disabled={busy || reason.trim().length < 3}
              onClick={() => write({ disabled_at: new Date().toISOString(), disabled_reason: reason.trim() })}>
              {busy ? "Switching off…" : "Switch off now"}
            </button>
            <button type="button" className="secondary compact" disabled={busy}
              onClick={() => { setAsking(false); setReason(""); setError(null); }}>
              Cancel
            </button>
          </div>
          <p className="muted">
            Takes effect immediately, everywhere. They stay in this list and keep their
            history, so this can be undone.
          </p>
        </div>
      )}

      {error && <p className="error" role="alert">{error}</p>}
    </div>
  );
}
