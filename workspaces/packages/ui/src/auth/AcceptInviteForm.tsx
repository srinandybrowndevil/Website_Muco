"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@muco/core/browser";
import { isStrongPassword } from "@muco/core";
import { Icon } from "../Icon";
import { PasswordField } from "./PasswordField";

type Invitation = {
  organization_name: string;
  invited_email: string;
  invited_role: string;
  expires_at: string;
  available: boolean;
};

/**
 * Turning an invitation into an account.
 *
 * The email address comes from the invitation and is not editable. That is the
 * whole security property: an invitation names one address, and letting the
 * form change it would let anybody holding a link claim it for their own.
 *
 * The role, the dates, the mentor and the project grants were all decided when
 * the invitation was created and were validated then. accept_invitation turns
 * them into records in one transaction, so an invitation either becomes a
 * complete person or does not land at all.
 */
export function AcceptInviteForm({ token }: { token: string }) {
  const router = useRouter();
  const [invitation, setInvitation] = useState<Invitation | null>(null);
  const [loading, setLoading] = useState(true);
  const [password, setPassword] = useState("");
  const [breached, setBreached] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const supabase = createClient();
      if (!supabase) {
        if (!cancelled) setLoading(false);
        return;
      }
      const { data } = await supabase.rpc("get_invitation", { invite_token: token });
      if (!cancelled) {
        setInvitation(Array.isArray(data) ? (data[0] ?? null) : (data ?? null));
        setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [token]);

  const ready = isStrongPassword(password) && !breached;

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    if (!ready || !invitation) return;
    setBusy(true);
    setError(null);
    const supabase = createClient();
    if (!supabase) {
      setBusy(false);
      setError("This workspace is not connected to its database.");
      return;
    }

    const { error: signUpFailed } = await supabase.auth.signUp({
      email: invitation.invited_email,
      password,
    });
    // An account may already exist for this address — somebody invited twice,
    // or invited after signing up themselves. That is not a failure; the
    // invitation still has to be redeemed, so try signing in and continue.
    if (signUpFailed) {
      const { error: signInFailed } = await supabase.auth.signInWithPassword({
        email: invitation.invited_email,
        password,
      });
      if (signInFailed) {
        setBusy(false);
        setError("An account already exists for this address. Sign in with your existing password, or use the recovery link.");
        return;
      }
    }

    const { error: acceptFailed } = await supabase.rpc("accept_invitation", { invite_token: token });
    setBusy(false);
    if (acceptFailed) {
      setError(acceptFailed.message);
      return;
    }
    router.replace("/");
    router.refresh();
  }

  if (loading) return <p className="hint">Checking the invitation…</p>;

  if (!invitation || !invitation.available) {
    return (
      <div className="callout bad">
        <Icon name="alert" size={18} />
        <div>
          <b>This invitation is no longer valid.</b>
          <p>Invitations expire, and each one can be used once. Ask the studio for a new link.</p>
        </div>
      </div>
    );
  }

  return (
    <form className="stack" onSubmit={submit}>
      <dl className="facts">
        <div className="fact">
          <dt>Workspace</dt>
          <dd>{invitation.organization_name}</dd>
        </div>
        <div className="fact">
          <dt>Your address</dt>
          <dd className="mono">{invitation.invited_email}</dd>
        </div>
      </dl>

      <p className="notice">
        <Icon name="info" size={14} />
        <span>This invitation was issued for that address and cannot be moved to another.</span>
      </p>

      <PasswordField label="Choose a password" value={password} onChange={setPassword} onVerdict={setBreached} />

      {error ? <p className="errortext" role="alert">{error}</p> : null}

      <button className="btn primary lg block" type="submit" disabled={busy || !ready}>
        {busy ? "Setting up" : "Create my account"}
      </button>
    </form>
  );
}
