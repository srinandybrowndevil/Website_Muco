"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { createClient } from "@muco/core/browser";
import { isStrongPassword } from "@muco/core";
import { Icon } from "../Icon";
import { PasswordField } from "./PasswordField";

/**
 * Asking for a recovery link.
 *
 * The answer is the same whether or not the address has an account here. That
 * is not politeness — a form that says "no such account" is a way to find out
 * who works at the studio, and these four addresses are the only public clue
 * that the people behind them exist.
 */
export function ForgotPasswordForm() {
  const [email, setEmail] = useState("");
  const [sent, setSent] = useState(false);
  const [busy, setBusy] = useState(false);

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    setBusy(true);
    const supabase = createClient();
    if (supabase) {
      await supabase.auth.resetPasswordForEmail(email, {
        // Back to this workspace, not to a shared address: the link has to
        // land on the origin whose session it is about.
        redirectTo: `${window.location.origin}/auth/callback?next=%2Freset-password`,
      });
    }
    setBusy(false);
    setSent(true);
  }

  if (sent) {
    return (
      <div className="callout ok" role="status">
        <Icon name="mail" size={18} />
        <div>
          <b>Check your email.</b>
          <p>If that address has an account in this workspace, a recovery link is on its way. The link expires in one hour.</p>
        </div>
      </div>
    );
  }

  return (
    <form className="stack" onSubmit={submit}>
      <div className="field">
        <label htmlFor="recover-email">Email address</label>
        <input
          id="recover-email"
          type="email"
          value={email}
          onChange={event => setEmail(event.target.value)}
          autoComplete="username"
          autoFocus
          required
        />
      </div>
      <button className="btn primary lg block" type="submit" disabled={busy}>
        {busy ? "Sending" : "Send a recovery link"}
      </button>
      <a className="hint" href="/login">Back to sign in</a>
    </form>
  );
}

/**
 * Setting a new password, reached from a recovery link.
 *
 * The link has already created a session by the time this renders, so the old
 * password is not asked for and cannot be: whoever holds the link is who this
 * form is for.
 */
export function ResetPasswordForm() {
  const router = useRouter();
  const [password, setPassword] = useState("");
  const [breached, setBreached] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  const ready = isStrongPassword(password) && !breached;

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    if (!ready) return;
    setBusy(true);
    setError(null);
    const supabase = createClient();
    if (!supabase) {
      setBusy(false);
      setError("This workspace is not connected to its database.");
      return;
    }
    const { error: failure } = await supabase.auth.updateUser({ password });
    setBusy(false);
    if (failure) {
      setError(
        failure.message.toLowerCase().includes("session")
          ? "This recovery link has expired. Ask for a new one."
          : failure.message
      );
      return;
    }
    setDone(true);
    router.replace("/");
    router.refresh();
  }

  if (done) {
    return (
      <div className="callout ok" role="status">
        <Icon name="checkCircle" size={18} />
        <div>
          <b>Password changed.</b>
          <p>Opening your workspace.</p>
        </div>
      </div>
    );
  }

  return (
    <form className="stack" onSubmit={submit}>
      <PasswordField label="New password" value={password} onChange={setPassword} onVerdict={setBreached} />
      {error ? <p className="errortext" role="alert">{error}</p> : null}
      <button className="btn primary lg block" type="submit" disabled={busy || !ready}>
        {busy ? "Saving" : "Set new password"}
      </button>
    </form>
  );
}

/**
 * Changing the password of an account that is already signed in.
 *
 * The current password is verified by signing in with it rather than trusting
 * the session, because a session left open on a shared machine is exactly the
 * case this check exists for.
 */
export function ChangePasswordForm({ email }: { email: string }) {
  const [current, setCurrent] = useState("");
  const [next, setNext] = useState("");
  const [breached, setBreached] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  const ready = current.length > 0 && isStrongPassword(next) && !breached;

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    if (!ready) return;
    setBusy(true);
    setError(null);
    setDone(false);
    const supabase = createClient();
    if (!supabase) {
      setBusy(false);
      setError("This workspace is not connected to its database.");
      return;
    }
    const { error: wrong } = await supabase.auth.signInWithPassword({ email, password: current });
    if (wrong) {
      setBusy(false);
      setError("That is not your current password.");
      return;
    }
    const { error: failure } = await supabase.auth.updateUser({ password: next });
    setBusy(false);
    if (failure) {
      setError(failure.message);
      return;
    }
    setCurrent("");
    setNext("");
    setDone(true);
  }

  return (
    <form className="stack" onSubmit={submit}>
      <div className="field">
        <label htmlFor="current-password">Current password</label>
        <input
          id="current-password"
          type="password"
          value={current}
          onChange={event => setCurrent(event.target.value)}
          autoComplete="current-password"
          required
        />
      </div>
      <PasswordField label="New password" value={next} onChange={setNext} onVerdict={setBreached} />
      {error ? <p className="errortext" role="alert">{error}</p> : null}
      {done ? <p className="hint" role="status">Password changed.</p> : null}
      <div>
        <button className="btn primary" type="submit" disabled={busy || !ready}>
          {busy ? "Saving" : "Change password"}
        </button>
      </div>
    </form>
  );
}
