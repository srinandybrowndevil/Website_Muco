"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useState } from "react";
import { createClient } from "@muco/core/browser";
import { isLocalPreview, safeInternalPath, WORKSPACES, type WorkspaceKey } from "@muco/core";
import { Icon } from "../Icon";

/**
 * One sign-in form, used by all four workspaces.
 *
 * Four copies of this would be four chances to get the redirect validation
 * wrong, and an open redirect on a sign-in page is worth more to an attacker
 * than anything else on these origins. The destination always goes through
 * safeInternalPath, which refuses an absolute URL, a protocol-relative one,
 * and a backslash.
 *
 * What each workspace supplies is the frame around this: its own art, its own
 * sentence, its own palette. Not this.
 */
export function SignInForm({ workspace, allowSignup = false }: { workspace: WorkspaceKey; allowSignup?: boolean }) {
  return isLocalPreview
    ? <PreviewSignIn workspace={workspace} />
    : <ConnectedSignIn workspace={workspace} allowSignup={allowSignup} />;
}

function PreviewSignIn({ workspace }: { workspace: WorkspaceKey }) {
  const params = useSearchParams();
  const next = safeInternalPath(params.get("next"), "/");
  return (
    <div className="stack">
      <p>Explore the {WORKSPACES[workspace].name.toLowerCase()} workspace with sample records. No account or password is needed.</p>
      <a className="btn primary lg block" href={next}>Sign in</a>
      <p className="hint">Preview only. Nothing is sent to Supabase, Google or real customers.</p>
    </div>
  );
}

function ConnectedSignIn({ workspace, allowSignup }: { workspace: WorkspaceKey; allowSignup: boolean }) {
  const router = useRouter();
  const params = useSearchParams();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [google, setGoogle] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const next = safeInternalPath(params.get("next"), "/");
  const access = params.get("access");
  const belongs = params.get("belongs");
  const elsewhere = belongs ? WORKSPACES[belongs as WorkspaceKey] : undefined;

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    setError(null);
    const supabase = createClient();
    if (!supabase) {
      setError("This workspace is not connected to its database. Tell the studio.");
      return;
    }
    setBusy(true);
    const { error: failure } = await supabase.auth.signInWithPassword({ email, password });
    if (failure) {
      setBusy(false);
      // Deliberately the same sentence whether the address is unknown or the
      // password is wrong. Telling them apart turns this form into a way to
      // find out who has an account here.
      setError(
        failure.message.toLowerCase().includes("email not confirmed")
          ? "Confirm your email address first. The link is in the message sent when your account was created."
          : "That email address and password do not match an account in this workspace."
      );
      return;
    }
    // replace, not push: the sign-in page should not sit in history behind a
    // signed-in workspace, where Back lands on a form that redirects forward
    // again immediately.
    router.replace(next);
    router.refresh();
  }

  // Carried over rather than added. The application this replaced offered
  // Google, and section 2 of the specification rules out social login "beyond
  // what auth already supports" -- which is an instruction to keep this and not
  // to add a second one.
  //
  // The redirect returns to this origin, not to a shared one. Each workspace
  // holds its own session, so a callback landing on another host would create
  // a session in the wrong product.
  async function signInWithGoogle() {
    setError(null);
    const supabase = createClient();
    if (!supabase) {
      setError("This workspace is not connected to its database. Tell the studio.");
      return;
    }
    setGoogle(true);
    const { error: failure } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: window.location.origin + "/auth/callback?next=" + encodeURIComponent(next),
      },
    });
    if (failure) {
      setGoogle(false);
      setError(
        failure.message.toLowerCase().includes("provider")
          ? "Google sign-in is not switched on for this workspace. Use your email address and password."
          : failure.message,
      );
    }
  }

  return (
    <form className="stack" onSubmit={submit} noValidate>
      {access === "closed" ? (
        <div className="callout warn" role="status">
          <Icon name="lock" size={18} />
          <div>
            <b>This account has been switched off.</b>
            <p>Access was closed by an administrator. Signing in again will not reopen it; contact the studio if you believe that is a mistake.</p>
          </div>
        </div>
      ) : null}

      {access === "none" ? (
        <div className="callout" role="status">
          <Icon name="info" size={18} />
          <div>
            <b>This account is not part of a workspace yet.</b>
            <p>Accounts here are created by invitation. Ask the studio to send you one.</p>
          </div>
        </div>
      ) : null}

      {access === "wrong-workspace" && elsewhere ? (
        <div className="callout" role="status">
          <Icon name="arrowRight" size={18} />
          <div>
            <b>This account belongs to the {elsewhere.name.toLowerCase()} workspace.</b>
            <p>You are signed in, just at the wrong address. Open the workspace your account belongs to.</p>
          </div>
        </div>
      ) : null}

      <div className="field">
        <label htmlFor="signin-email">Email address</label>
        <input
          id="signin-email"
          type="email"
          value={email}
          onChange={event => setEmail(event.target.value)}
          autoComplete="username"
          autoFocus
          required
        />
      </div>

      <div className="field">
        <label htmlFor="signin-password">Password</label>
        <input
          id="signin-password"
          type="password"
          value={password}
          onChange={event => setPassword(event.target.value)}
          autoComplete="current-password"
          required
        />
      </div>

      {error ? <p className="errortext" role="alert">{error}</p> : null}

      <button className="btn primary lg block" type="submit" disabled={busy}>
        {busy ? "Signing in" : "Sign in to " + WORKSPACES[workspace].name.toLowerCase()}
      </button>

      <div className="orline"><span>or</span></div>

      <button className="btn block" type="button" onClick={signInWithGoogle} disabled={google || busy}>
        <Icon name="mail" size={15} />
        <span>{google ? "Opening Google" : "Continue with Google"}</span>
      </button>

      <a className="hint" href="/forgot-password">Forgotten your password?</a>
      {allowSignup ? (
        <p className="auth-switch">
          New customer? <a href={`/signup?next=${encodeURIComponent(next)}`}>Create a customer account</a>
        </p>
      ) : null}
    </form>
  );
}
