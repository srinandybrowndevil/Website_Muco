"use client";

import Link from "next/link";
import { FormEvent, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { AuthShell, AuthStatus } from "@/components/auth/AuthShell";
import { appOrigin } from "@/lib/auth";
import { createClient } from "@/lib/supabase/client";
import { isSupabaseConfigured } from "@/lib/supabase/config";

type Invite = {
  organization_name: string;
  invited_email: string;
  invited_role: "admin" | "member" | "client";
  expires_at: string;
  available: boolean;
};

type State = "loading" | "invalid" | "ready" | "signed-out" | "error" | "done";
type OtpState = "idle" | "sending" | "sent";

function inviteNextPath(token: string) {
  return `/accept-invite?token=${encodeURIComponent(token)}`;
}

export default function AcceptInvite() {
  const params = useSearchParams();
  const router = useRouter();
  const token = params.get("token") ?? "";
  const [invite, setInvite] = useState<Invite | null>(null);
  const [state, setState] = useState<State>("loading");
  const [email, setEmail] = useState("");
  const [otpState, setOtpState] = useState<OtpState>("idle");
  const [emailError, setEmailError] = useState(false);

  useEffect(() => {
    async function load() {
      if (!token) {
        setState("invalid");
        return;
      }
      if (!isSupabaseConfigured) {
        setState("ready");
        return;
      }
      const client = createClient()!;
      const { data, error } = await client.rpc("get_invitation", { invite_token: token });
      const found = Array.isArray(data) ? data[0] : null;
      if (error || !found?.available) {
        setState("invalid");
        return;
      }
      setInvite(found as Invite);
      const { data: { user } } = await client.auth.getUser();
      setState(user ? "ready" : "signed-out");
    }
    void load();
  }, [token]);

  async function requestLink(event: FormEvent) {
    event.preventDefault();
    if (!isSupabaseConfigured || !token) return;
    if (!/^\S+@\S+\.\S+$/.test(email)) {
      setEmailError(true);
      return;
    }
    setEmailError(false);
    setOtpState("sending");
    const client = createClient()!;
    const normalized = email.trim().toLowerCase();
    const nextPath = inviteNextPath(token);
    try {
      await client.auth.signInWithOtp({
        email: normalized,
        options: {
          emailRedirectTo: `${appOrigin()}/auth/callback?next=${encodeURIComponent(nextPath)}`,
          shouldCreateUser: true,
        },
      });
    } catch {
      // Ignore: the generic response below prevents email disclosure either way.
    }
    setOtpState("sent");
  }

  async function accept() {
    if (!isSupabaseConfigured) {
      setState("done");
      return;
    }
    setState("loading");
    const { data, error } = await createClient()!.rpc("accept_invitation", { invite_token: token });
    if (error) {
      setState("error");
      return;
    }
    setState("done");
    router.replace(data === "client" ? "/portal" : "/");
    router.refresh();
  }

  const showInviteCard = state === "ready" || state === "signed-out" || otpState === "sent";

  return (
    <AuthShell>
      <h2>You’re invited.</h2>
      <p>Join a considered workspace built for focused client work.</p>
      {state === "loading" && (
        <AuthStatus title="Checking invitation">Please wait while we securely validate this invitation.</AuthStatus>
      )}
      {state === "invalid" && (
        <AuthStatus tone="error" title="Invitation unavailable">
          This invitation is invalid, expired, or has already been accepted.
        </AuthStatus>
      )}
      {showInviteCard && (
        <div className="invitecard">
          <span>WORKSPACE</span>
          <h3>{invite?.organization_name ?? "MUCO demo workspace"}</h3>
          <p>
            Invited as <b>{invite?.invited_role ?? "member"}</b>
            {invite?.invited_email ? ` · ${invite.invited_email}` : ""}
          </p>
          {state === "signed-out" && isSupabaseConfigured && otpState !== "sent" && (
            <>
              <p className="invitedesc">
                Enter the exact email address this invitation was sent to. We’ll send a secure one-time link
                that creates your account and returns you here to finish accepting the invitation.
              </p>
              <form onSubmit={requestLink}>
                <label htmlFor="invite-email">
                  Invited email
                  <input
                    id="invite-email"
                    required
                    type="email"
                    autoComplete="email"
                    value={email}
                    onChange={(e) => { setEmail(e.target.value); setEmailError(false); }}
                    placeholder="you@company.com"
                  />
                </label>
                <button className="primary" disabled={otpState === "sending"} type="submit">
                  {otpState === "sending" ? "Sending secure link…" : "Send secure sign-in link"}
                </button>
              </form>
              {emailError && (
                <AuthStatus tone="error" title="Invalid email">
                  Please enter the exact email address this invitation was sent to.
                </AuthStatus>
              )}
            </>
          )}
          {state === "signed-out" && !isSupabaseConfigured && (
            <Link className="primary" href={`/login?next=${encodeURIComponent(inviteNextPath(token))}`}>
              Sign in to accept
            </Link>
          )}
          {otpState === "sent" && (
            <AuthStatus title="Check your inbox">
              If this invitation matches the email you entered, a secure sign-in link is on its way.
              The link will return you to this page to complete acceptance.
            </AuthStatus>
          )}
          {state === "ready" && (
            <button className="primary" onClick={accept}>Accept invitation</button>
          )}
        </div>
      )}
      {state === "error" && (
        <AuthStatus tone="error" title="Couldn’t accept invitation">
          Sign in with the exact email address that received this invitation, then try again.
        </AuthStatus>
      )}
      {state === "done" && <AuthStatus title="Invitation accepted">Your workspace membership is ready.</AuthStatus>}
      <Link className="authback" href="/login">Return to sign in</Link>
    </AuthShell>
  );
}
