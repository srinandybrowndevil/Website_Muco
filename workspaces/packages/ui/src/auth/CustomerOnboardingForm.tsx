"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";
import { createClient } from "@muco/core/browser";
import { safeInternalPath } from "@muco/core";
import { Icon } from "../Icon";

/** Finish a verified customer account and attach it to the client workspace. */
export function CustomerOnboardingForm() {
  const router = useRouter();
  const params = useSearchParams();
  const next = safeInternalPath(params.get("next"), "/");
  const [fullName, setFullName] = useState("");
  const [phone, setPhone] = useState("");
  const [company, setCompany] = useState("");
  const [location, setLocation] = useState("");
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const supabase = createClient();
    if (!supabase) { setLoading(false); setError("This workspace is not connected to its database."); return; }
    void supabase.auth.getUser().then(({ data, error: authError }) => {
      if (authError || !data.user) {
        setError("Your confirmation session has expired. Sign in again to finish setup.");
      } else {
        const meta = data.user.user_metadata ?? {};
        setFullName(typeof meta.full_name === "string" ? meta.full_name : "");
        setPhone(typeof meta.phone === "string" ? meta.phone : "");
        setCompany(typeof meta.company === "string" ? meta.company : "");
        setLocation(typeof meta.location === "string" ? meta.location : "");
      }
      setLoading(false);
    });
  }, []);

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    if (fullName.trim().length < 2) { setError("Enter your full name."); return; }
    if (!/^\+?[\d\s()-]{7,25}$/.test(phone.trim())) { setError("Enter a valid contact number, including country code."); return; }
    if (!company.trim()) { setError("Enter your company or business name."); return; }
    if (!location.trim()) { setError("Enter your city or location."); return; }
    const supabase = createClient();
    if (!supabase) { setError("This workspace is not connected to its database."); return; }
    setBusy(true);
    setError(null);
    const { error: onboardingError } = await supabase.rpc("complete_customer_onboarding", {
      p_org_slug: "muco-labs",
      p_full_name: fullName.trim(),
      p_phone: phone.trim(),
      p_company: company.trim(),
      p_location: location.trim(),
    });
    setBusy(false);
    if (onboardingError) {
      const message = onboardingError.message.toLowerCase();
      setError(message.includes("verified")
        ? "Verify your email first, then return to this page."
        : onboardingError.message);
      return;
    }
    router.replace(next);
    router.refresh();
  }

  if (loading) return <p className="hint" role="status">Checking your confirmation…</p>;

  return (
    <form className="stack" onSubmit={submit} noValidate>
      <p className="notice"><Icon name="info" size={14} /><span>These details help us route your project request and keep replies together.</span></p>
      <div className="grid-2">
        <div className="field">
          <label htmlFor="onboarding-name">Full name</label>
          <input id="onboarding-name" type="text" value={fullName} maxLength={100} onChange={event => setFullName(event.target.value)} autoComplete="name" required />
        </div>
        <div className="field">
          <label htmlFor="onboarding-phone">Contact number</label>
          <input id="onboarding-phone" type="tel" value={phone} maxLength={25} onChange={event => setPhone(event.target.value)} autoComplete="tel" required />
        </div>
      </div>
      <div className="grid-2">
        <div className="field">
          <label htmlFor="onboarding-company">Company / business</label>
          <input id="onboarding-company" type="text" value={company} maxLength={120} onChange={event => setCompany(event.target.value)} autoComplete="organization" required />
        </div>
        <div className="field">
          <label htmlFor="onboarding-location">City / location</label>
          <input id="onboarding-location" type="text" value={location} maxLength={120} onChange={event => setLocation(event.target.value)} autoComplete="address-level2" required />
        </div>
      </div>
      {error ? (
        <div className="callout warn" role="alert">
          <Icon name="alert" size={18} />
          <div><b>Setup needs your attention.</b><p>{error}</p><Link href={`/login?next=${encodeURIComponent(`/onboarding?next=${encodeURIComponent(next)}`)}`}>Return to sign in</Link></div>
        </div>
      ) : null}
      <button className="btn primary lg block" type="submit" disabled={busy || Boolean(error && error.includes("session"))}>
        {busy ? "Setting up" : "Finish customer setup"}
      </button>
    </form>
  );
}
