"use client";

import Link from "next/link";
import { FormEvent, useState } from "react";
import { AuthShell, AuthStatus } from "@/components/auth/AuthShell";
import { appOrigin, isStrongPassword, passwordRequirements } from "@/lib/auth";
import { createClient } from "@/lib/supabase/client";
import { isSupabaseConfigured } from "@/lib/supabase/config";

export default function Signup() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [phone, setPhone] = useState("");
  const [company, setCompany] = useState("");
  const [location, setLocation] = useState("");
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const [errors, setErrors] = useState<string[]>([]);

  const checks = passwordRequirements(password);

  function validate(): string[] {
    const list: string[] = [];
    const normalizedEmail = email.trim().toLowerCase();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalizedEmail)) {
      list.push("Enter a valid email address.");
    }
    if (!isStrongPassword(password)) {
      list.push("Password must be at least 10 characters with a letter, number and symbol.");
    }
    if (!fullName.trim()) list.push("Full name is required.");
    if (!/^\+?[\d\s-]{8,}$/.test(phone.trim())) list.push("Enter a valid phone number.");
    if (!company.trim()) list.push("Company or business name is required.");
    if (!location.trim()) list.push("City / location is required.");
    return list;
  }

  async function submit(event: FormEvent) {
    event.preventDefault();
    setErrors([]);
    const validation = validate();
    if (validation.length) {
      setErrors(validation);
      return;
    }
    setLoading(true);

    if (!isSupabaseConfigured) {
      setLoading(false);
      setSent(true);
      return;
    }

    const supabase = createClient()!;
    const { error } = await supabase.auth.signUp({
      email: email.trim().toLowerCase(),
      password,
      options: {
        emailRedirectTo: `${appOrigin()}/auth/callback?next=/complete-profile`,
        data: {
          full_name: fullName.trim(),
          phone: phone.trim(),
          company: company.trim(),
          location: location.trim(),
        },
      },
    });

    setLoading(false);
    if (error) {
      setErrors([error.message || "Could not create your account. Please try again."]);
      return;
    }
    setSent(true);
  }

  return (
    <AuthShell>
      {!isSupabaseConfigured && <span className="demo">Demo mode · No credentials required</span>}
      <h2>Create your customer account.</h2>
      <p>Send project requests, track progress and chat with the MUCO LABS team.</p>

      {sent && (
        <AuthStatus title="Check your inbox">
          {isSupabaseConfigured
            ? "A confirmation link has been sent to your email. Open it to finish setting up your profile."
            : "Demo mode: no email is sent. In production, a verification link would arrive now."}
        </AuthStatus>
      )}

      {!sent && (
        <form onSubmit={submit} noValidate>
          <label htmlFor="signup-email">
            Work email
            <input
              id="signup-email"
              type="email"
              autoComplete="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@company.com"
              aria-invalid={errors.length > 0}
            />
          </label>

          <label htmlFor="signup-password">
            Password
            <input
              id="signup-password"
              type="password"
              autoComplete="new-password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••••"
              aria-invalid={errors.length > 0}
            />
          </label>
          <ul className="requirements" aria-label="Password requirements">
            <li className={checks.length ? "met" : ""}>10 or more characters</li>
            <li className={checks.letter ? "met" : ""}>A letter</li>
            <li className={checks.number ? "met" : ""}>A number</li>
            <li className={checks.symbol ? "met" : ""}>A symbol</li>
          </ul>

          <label htmlFor="signup-name">
            Full name
            <input
              id="signup-name"
              type="text"
              autoComplete="name"
              required
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              placeholder="Arun Kumar"
            />
          </label>

          <label htmlFor="signup-phone">
            Phone
            <input
              id="signup-phone"
              type="tel"
              autoComplete="tel"
              required
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="+91 98765 43210"
            />
          </label>

          <label htmlFor="signup-company">
            Company / business
            <input
              id="signup-company"
              type="text"
              autoComplete="organization"
              required
              value={company}
              onChange={(e) => setCompany(e.target.value)}
              placeholder="Sri Sakthi Agencies"
            />
          </label>

          <label htmlFor="signup-location">
            City / location
            <input
              id="signup-location"
              type="text"
              required
              value={location}
              onChange={(e) => setLocation(e.target.value)}
              placeholder="Erode, Tamil Nadu"
            />
          </label>

          {errors.length > 0 && (
            <AuthStatus tone="error" title="Could not create account">
              <ul style={{ margin: 0, paddingLeft: 16 }}>
                {errors.map((err) => (
                  <li key={err}>{err}</li>
                ))}
              </ul>
            </AuthStatus>
          )}

          <button className="primary" disabled={loading} type="submit">
            {loading ? "Creating account…" : "Create customer account"}
          </button>
        </form>
      )}

      <small className="terms">
        Already have an account? <Link href="/login">Sign in</Link>
      </small>
    </AuthShell>
  );
}
