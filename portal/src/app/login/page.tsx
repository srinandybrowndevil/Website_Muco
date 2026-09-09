"use client";

import Link from "next/link";
import { FormEvent, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { AuthShell, AuthStatus } from "@/components/auth/AuthShell";
import { appOrigin, safeInternalPath, workspaceDestination, onboardingDestination } from "@/lib/auth";
import { createClient } from "@/lib/supabase/client";
import { isSupabaseConfigured } from "@/lib/supabase/config";

function withTimeout<T>(promise: Promise<T>, milliseconds: number): Promise<T> {
  return Promise.race([
    promise,
    new Promise<T>((_, reject) => setTimeout(() => reject(new Error("Google sign-in is taking too long. Check the portal authentication settings and try again.")), milliseconds)),
  ]);
}

export default function Login() {
  const router = useRouter();
  const params = useSearchParams();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState<"password" | "google" | null>(null);
  const [message, setMessage] = useState<"google" | "error" | null>(null);
  const next = safeInternalPath(params.get("next"));

  async function signIn(event: FormEvent) {
    event.preventDefault(); setMessage(null);
    if (!/^\S+@\S+\.\S+$/.test(email) || password.length < 6) { setMessage("error"); return; }
    if (!isSupabaseConfigured) { router.push(next); return; }
    setLoading("password");
    const supabase = createClient()!;
    const { error } = await supabase.auth.signInWithPassword({ email: email.trim(), password });
    if (error) { setLoading(null); setMessage("error"); return; }
    const { data: userData, error: userError } = await supabase.auth.getUser();
    if (userError || !userData.user) { setLoading(null); setMessage("error"); return; }
    const { data: membership, error: membershipError } = await supabase
      .from("memberships")
      .select("role")
      .eq("user_id", userData.user.id)
      .limit(1)
      .maybeSingle();
    if (membershipError) {
      setLoading(null);
      setMessage("error");
      return;
    }
    const destination = membership ? workspaceDestination(membership.role, next) : onboardingDestination(next);
    setLoading(null);
    router.replace(destination); router.refresh();
  }

  async function signInWithGoogle() {
    setMessage(null);
    if (!isSupabaseConfigured) { setMessage("google"); return; }
    setLoading("google");
    try {
      const { error } = await withTimeout(createClient()!.auth.signInWithOAuth({
        provider: "google",
        options: { redirectTo: `${appOrigin()}/auth/callback?next=${encodeURIComponent(next)}` },
      }), 10000);
      if (error) throw error;
    } catch {
      setLoading(null);
      setMessage("error");
    }
  }

  return <AuthShell>
    {!isSupabaseConfigured && <span className="demo">Demo mode · No credentials required</span>}
    <h2>Welcome back.</h2><p>Enter your details to access your workspace.</p>
    {message === "google" && <AuthStatus title="Google sign-in is not configured">Ask the portal administrator to enable Google in Supabase Auth.</AuthStatus>}
    {message === "error" && <AuthStatus tone="error" title="Unable to sign in">Check your details and try again, or continue with Google.</AuthStatus>}
    <form onSubmit={signIn}>
      <label htmlFor="email">Work email<input id="email" required type="email" autoComplete="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="you@company.com" /></label>
      <label htmlFor="password">Password<span><input id="password" required minLength={6} type="password" autoComplete="current-password" value={password} onChange={e => setPassword(e.target.value)} placeholder="••••••••" /><Link className="forgot" href="/forgot-password">Forgot?</Link></span></label>
      <button className="primary" disabled={Boolean(loading)} type="submit">{loading === "password" ? "Signing in…" : isSupabaseConfigured ? "Sign in" : "Enter demo workspace"}</button>
      <div className="or">OR</div>
      <button className="secondary" disabled={Boolean(loading)} type="button" onClick={signInWithGoogle}>{loading === "google" ? "Opening Google…" : "Continue with Google"}</button>
    </form>
    <small className="terms">
      Access for team members is invitation-only. New customer? <Link href={`/signup?next=${encodeURIComponent(next)}`}>Create a customer account</Link>
    </small>
  </AuthShell>;
}
