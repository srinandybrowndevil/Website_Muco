"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useState } from "react";
import { createClient } from "@muco/core/browser";
import { isStrongPassword, safeInternalPath } from "@muco/core";
import { Icon } from "../Icon";
import { PasswordField } from "./PasswordField";

function onboardingPath(next: string): string {
  return `/onboarding?next=${encodeURIComponent(next)}`;
}

/** Self-service customer registration. Team workspaces remain invite-only. */
export function SignUpForm() {
  const router = useRouter();
  const params = useSearchParams();
  const next = safeInternalPath(params.get("next"), "/");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [phone, setPhone] = useState("");
  const [company, setCompany] = useState("");
  const [location, setLocation] = useState("");
  const [busy, setBusy] = useState<"form" | "google" | null>(null);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [breached, setBreached] = useState(false);

  const onboarding = onboardingPath(next);

  function validate(): string | null {
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) return "Enter a valid email address.";
    if (!isStrongPassword(password) || breached) return "Choose a password that meets every requirement.";
    if (fullName.trim().length < 2) return "Enter your full name.";
    if (!/^\+?[\d\s()-]{7,25}$/.test(phone.trim())) return "Enter a valid contact number, including country code.";
    if (!company.trim()) return "Enter your company or business name.";
    if (!location.trim()) return "Enter your city or location.";
    return null;
  }

  async function finishOnboarding(supabase: NonNullable<ReturnType<typeof createClient>>) {
    const { error: onboardingError } = await supabase.rpc("complete_customer_onboarding", {
      p_org_slug: "muco-labs",
      p_full_name: fullName.trim(),
      p_phone: phone.trim(),
      p_company: company.trim(),
      p_location: location.trim(),
    });
    if (onboardingError) throw new Error(onboardingError.message);
    router.replace(next);
    router.refresh();
  }

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    setError(null);
    const validation = validate();
    if (validation) { setError(validation); return; }
    const supabase = createClient();
    if (!supabase) { setError("This workspace is not connected to its database."); return; }

    setBusy("form");
    const { data, error: signUpError } = await supabase.auth.signUp({
      email: email.trim().toLowerCase(),
      password,
      options: {
        emailRedirectTo: `${window.location.origin}/auth/callback?next=${encodeURIComponent(onboarding)}`,
        data: {
          full_name: fullName.trim(),
          phone: phone.trim(),
          company: company.trim(),
          location: location.trim(),
        },
      },
    });
    if (signUpError) {
      setBusy(null);
      setError(signUpError.message.toLowerCase().includes("already")
        ? "An account already exists for this address. Sign in or use the recovery link."
        : signUpError.message);
      return;
    }

    if (data.session) {
      try {
        await finishOnboarding(supabase);
      } catch (failure) {
        setBusy(null);
        setError(failure instanceof Error ? failure.message : "Your account was created, but setup needs one more try.");
      }
      return;
    }

    setBusy(null);
    setSent(true);
  }

  async function signUpWithGoogle() {
    const supabase = createClient();
    if (!supabase) { setError("This workspace is not connected to its database."); return; }
    setError(null);
    setBusy("google");
    const { error: googleError } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: `${window.location.origin}/auth/callback?next=${encodeURIComponent(onboarding)}`,
      },
    });
    if (googleError) {
      setBusy(null);
      setError(googleError.message.toLowerCase().includes("provider")
        ? "Google sign-up is not enabled yet. Use the email form or ask the studio to finish Google setup."
        : googleError.message);
    }
  }

  if (sent) {
    return (
      <div className="callout ok" role="status">
        <Icon name="mail" size={18} />
        <div>
          <b>Check your email.</b>
          <p>Open the confirmation link to finish your customer profile. Your request will return to this workspace afterwards.</p>
          <Link className="btn sm" href={`/login?next=${encodeURIComponent(onboarding)}`}>Continue after confirmation</Link>
        </div>
      </div>
    );
  }

  return (
    <div className="stack">
      <button className="btn block" type="button" onClick={signUpWithGoogle} disabled={busy !== null}>
        <Icon name="mail" size={15} />
        <span>{busy === "google" ? "Opening Google" : "Sign up with Google"}</span>
      </button>
      <div className="orline"><span>or use email</span></div>

      <form className="stack" onSubmit={submit} noValidate>
        <div className="field">
          <label htmlFor="signup-email">Work email</label>
          <input id="signup-email" type="email" value={email} onChange={event => setEmail(event.target.value)} autoComplete="email" placeholder="you@company.com" required />
        </div>
        <PasswordField id="signup-password" label="Password" value={password} onChange={setPassword} onVerdict={setBreached} />
        <div className="grid-2">
          <div className="field">
            <label htmlFor="signup-name">Full name</label>
            <input id="signup-name" type="text" value={fullName} onChange={event => setFullName(event.target.value)} autoComplete="name" required />
          </div>
          <div className="field">
            <label htmlFor="signup-phone">Contact number</label>
            <input id="signup-phone" type="tel" value={phone} onChange={event => setPhone(event.target.value)} autoComplete="tel" placeholder="+91 98765 43210" required />
          </div>
        </div>
        <div className="grid-2">
          <div className="field">
            <label htmlFor="signup-company">Company / business</label>
            <input id="signup-company" type="text" value={company} onChange={event => setCompany(event.target.value)} autoComplete="organization" required />
          </div>
          <div className="field">
            <label htmlFor="signup-location">City / location</label>
            <input id="signup-location" type="text" value={location} onChange={event => setLocation(event.target.value)} autoComplete="address-level2" required />
          </div>
        </div>
        {error ? <p className="errortext" role="alert">{error}</p> : null}
        <button className="btn primary lg block" type="submit" disabled={busy !== null}>
          {busy === "form" ? "Creating account" : "Create customer account"}
        </button>
      </form>

      <p className="auth-switch">Already have an account? <Link href={`/login?next=${encodeURIComponent(next)}`}>Sign in</Link></p>
      <p className="hint">By continuing, you agree that MUCO LABS may use these details to reply to your project request.</p>
    </div>
  );
}
