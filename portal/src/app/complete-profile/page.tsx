"use client";

import { WorkspaceLink as Link } from "@/components/WorkspaceHost";
import { useRouter, useSearchParams } from "next/navigation";
import { workspaceDestination } from "@/lib/auth";
import { FormEvent, useCallback, useEffect, useState } from "react";
import { AuthShell, AuthStatus } from "@/components/auth/AuthShell";
import { createClient } from "@/lib/supabase/client";
import { isSupabaseConfigured } from "@/lib/supabase/config";

const ALLOWED_ORG_SLUG = "muco-labs";

type LoadingState = "idle" | "loading" | "done" | "error" | "unverified" | "demo";

export default function CompleteProfile() {
  const router = useRouter();
  const next = workspaceDestination("client", useSearchParams().get("next"));
  const [fullName, setFullName] = useState("");
  const [phone, setPhone] = useState("");
  const [company, setCompany] = useState("");
  const [location, setLocation] = useState("");
  const [state, setState] = useState<LoadingState>("loading");
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [userId, setUserId] = useState<string | null>(null);

  const completeOnboarding = useCallback(
    async (
      uid: string,
      name: string,
      phoneValue: string,
      companyValue: string,
      locationValue: string
    ) => {
      const supabase = createClient()!;
      setState("loading");

      const { data: existingCustomer, error: existingError } = await supabase
        .from("customers")
        .select("id")
        .eq("auth_user_id", uid)
        .maybeSingle();

      // A failed lookup used to read as "no customer yet", so a transient
      // error here sent someone through onboarding a second time. The database
      // now refuses a second record outright; this stops before that point and
      // says something true rather than relying on a constraint violation.
      if (existingError) {
        setState("error");
        setMessage("We could not check whether your account is already set up. Refresh and try again.");
        return;
      }

      if (existingCustomer) {
        setState("done");
        router.replace(next);
        return;
      }

      const { data: customerId, error } = await supabase.rpc("complete_customer_onboarding", {
        p_org_slug: ALLOWED_ORG_SLUG,
        p_full_name: name.trim(),
        p_phone: phoneValue.trim(),
        p_company: companyValue.trim(),
        p_location: locationValue.trim(),
      });

      if (error) {
        const text = typeof error.message === "string" ? error.message : "";
        if (text.toLowerCase().includes("email") && text.toLowerCase().includes("verified")) {
          setState("unverified");
        } else {
          setState("error");
          setMessage(text || "We could not complete your profile. Please try again.");
        }
        return;
      }

      if (!customerId) {
        setState("error");
        setMessage("Your profile was not created. Please contact support.");
        return;
      }

      setState("done");
      router.replace(next);
    },
    [router, next]
  );

  useEffect(() => {
    async function init() {
      if (!isSupabaseConfigured) {
        setState("demo");
        return;
      }
      const supabase = createClient()!;
      const {
        data: { user },
        error,
      } = await supabase.auth.getUser();

      if (error || !user) {
        setState("error");
        setMessage("Your session could not be verified. Please sign in again.");
        return;
      }

      setUserId(user.id);
      const meta = user.user_metadata ?? {};
      setFullName(meta.full_name ?? "");
      setPhone(meta.phone ?? "");
      setCompany(meta.company ?? "");
      setLocation(meta.location ?? "");

      if (meta.full_name && meta.phone && meta.company && meta.location) {
        await completeOnboarding(user.id, meta.full_name, meta.phone, meta.company, meta.location);
      } else {
        setState("idle");
      }
    }
    void init();
  }, [completeOnboarding]);

  async function submit(event: FormEvent) {
    event.preventDefault();
    if (!userId) return;
    const trimmedName = fullName.trim();
    const trimmedPhone = phone.trim();
    const trimmedCompany = company.trim();
    const trimmedLocation = location.trim();

    if (!trimmedName || !trimmedPhone || !trimmedCompany || !trimmedLocation) {
      setState("error");
      setMessage("Please fill in every field to finish your profile.");
      return;
    }

    setSubmitting(true);
    await completeOnboarding(userId, trimmedName, trimmedPhone, trimmedCompany, trimmedLocation);
    setSubmitting(false);
  }

  return (
    <AuthShell>
      <h2>Complete your profile.</h2>
      <p>Confirm a few details so MUCO LABS can route your requests correctly.</p>

      {state === "loading" && (
        <AuthStatus title="Setting up your workspace">Please wait while we finish onboarding.</AuthStatus>
      )}

      {state === "done" && (
        <AuthStatus title="Profile ready">Taking you to your requests…</AuthStatus>
      )}

      {state === "unverified" && (
        <AuthStatus tone="error" title="Email not verified">
          Please verify your email first. Check your inbox, then return here or{" "}
          <Link href="/verify-email" className="authback" style={{ display: "inline", margin: 0 }}>
            resend the verification email
          </Link>
          .
        </AuthStatus>
      )}

      {state === "error" && message && (
        <AuthStatus tone="error" title="Could not complete profile">
          {message}
        </AuthStatus>
      )}

      {state === "demo" && (
        <AuthStatus title="Preview mode">
          Supabase is not connected. This page would complete onboarding and redirect to{" "}
          <Link href="/portal/requests">/portal/requests</Link>.
        </AuthStatus>
      )}

      {(state === "idle" || state === "error") && (
        <form onSubmit={submit}>
          <label htmlFor="profile-name">
            Full name
            <input
              id="profile-name"
              type="text"
              required
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              placeholder="Arun Kumar"
            />
          </label>
          <label htmlFor="profile-phone">
            Phone
            <input
              id="profile-phone"
              type="tel"
              required
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="+91 98765 43210"
            />
          </label>
          <label htmlFor="profile-company">
            Company / business
            <input
              id="profile-company"
              type="text"
              required
              value={company}
              onChange={(e) => setCompany(e.target.value)}
              placeholder="Sri Sakthi Agencies"
            />
          </label>
          <label htmlFor="profile-location">
            City / location
            <input
              id="profile-location"
              type="text"
              required
              value={location}
              onChange={(e) => setLocation(e.target.value)}
              placeholder="Erode, Tamil Nadu"
            />
          </label>
          <button className="primary" disabled={submitting} type="submit">
            {submitting ? "Completing…" : "Complete profile"}
          </button>
        </form>
      )}

      <Link className="authback" href="/login">Return to sign in</Link>
    </AuthShell>
  );
}
