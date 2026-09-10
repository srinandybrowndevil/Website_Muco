"use client";

import { FormEvent, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { isStrongPassword, passwordRequirements } from "@/lib/auth";
import { breachMessage, checkPasswordBreached } from "@/lib/breached-password";

export function ChangePassword() {
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const checks = passwordRequirements(password);

  async function submit(event: FormEvent) {
    event.preventDefault();
    setError(null);

    if (!isStrongPassword(password)) {
      setError("Meet every requirement below before saving.");
      return;
    }
    if (password !== confirm) {
      setError("The two passwords do not match.");
      return;
    }

    setBusy(true);
    // The same corpus check as sign-up and recovery. A password changed from
    // inside the product should not be held to a lower standard than one set
    // from an email link.
    const breached = breachMessage(await checkPasswordBreached(password));
    if (breached) {
      setBusy(false);
      setError(breached);
      return;
    }

    const client = createClient();
    if (!client) {
      setBusy(false);
      setError("This workspace is not configured for sign-in.");
      return;
    }

    const { error: failed } = await client.auth.updateUser({ password });
    setBusy(false);

    if (failed) {
      // Supabase refuses a change on a session that is too old, which reads as
      // a puzzle unless the way out is named. Everything else is reported as
      // it came, rather than flattened into "something went wrong".
      const text = failed.message || "";
      setError(/reauthenticat|session|recent/i.test(text)
        ? "For a change this sensitive you need to have signed in recently. Sign out, sign in again, and come straight back here."
        : text);
      return;
    }

    setPassword("");
    setConfirm("");
    setDone(true);
  }

  if (done) {
    return (
      <div className="account-done" role="status">
        <b>Password changed.</b>
        <p>
          You are still signed in here. Anywhere else you were signed in stays signed in,
          so sign out on those devices if the old password was known to anyone.
        </p>
      </div>
    );
  }

  return (
    <form onSubmit={submit} className="account-form">
      <label htmlFor="new-password">New password</label>
      <input
        id="new-password"
        type="password"
        autoComplete="new-password"
        required
        value={password}
        disabled={busy}
        onChange={event => setPassword(event.target.value)}
      />

      <ul className="requirements" aria-label="Password requirements">
        <li className={checks.length ? "met" : ""}>10 or more characters</li>
        <li className={checks.letter ? "met" : ""}>A letter</li>
        <li className={checks.number ? "met" : ""}>A number</li>
        <li className={checks.symbol ? "met" : ""}>A symbol</li>
        <li className={checks.uncommon ? "met" : ""}>Not a common or guessable password</li>
      </ul>

      <label htmlFor="confirm-password">Confirm new password</label>
      <input
        id="confirm-password"
        type="password"
        autoComplete="new-password"
        required
        value={confirm}
        disabled={busy}
        onChange={event => setConfirm(event.target.value)}
      />

      {error && <p className="error" role="alert">{error}</p>}

      <button className="primary" disabled={busy}>
        {busy ? "Saving…" : "Change password"}
      </button>

      <p className="account-hint">
        Generate this in a password manager rather than inventing one. It is also checked
        against public breach lists, so a password that has appeared in one is refused even
        if it meets every rule above.
      </p>
    </form>
  );
}
