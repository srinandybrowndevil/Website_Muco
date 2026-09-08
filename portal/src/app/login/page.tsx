"use client";

import Link from "next/link";
import { FormEvent, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { AuthShell, AuthStatus } from "@/components/auth/AuthShell";
import { appOrigin, safeInternalPath } from "@/lib/auth";
import { createClient } from "@/lib/supabase/client";
import { isSupabaseConfigured } from "@/lib/supabase/config";

export default function Login() {
  const router = useRouter();
  const params = useSearchParams();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState<"password" | "magic" | null>(null);
  const [message, setMessage] = useState<"magic" | "error" | null>(null);
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
    if (membershipError || !membership) {
      await supabase.auth.signOut();
      setLoading(null);
      router.replace("/auth/error?reason=unauthorized");
      return;
    }
    let destination = next;
    if (membership.role === "client") {
      destination = "/portal";
    } else if (destination === "/portal") {
      destination = "/";
    }
    setLoading(null);
    router.replace(destination); router.refresh();
  }

  async function magicLink() {
    setMessage(null);
    if (!/^\S+@\S+\.\S+$/.test(email)) { setMessage("error"); return; }
    if (!isSupabaseConfigured) { setMessage("magic"); return; }
    setLoading("magic");
    await createClient()!.auth.signInWithOtp({ email: email.trim(), options: { emailRedirectTo: `${appOrigin()}/auth/callback?next=${encodeURIComponent(next)}`, shouldCreateUser: false } });
    setLoading(null); setMessage("magic");
  }

  return <AuthShell>
    {!isSupabaseConfigured && <span className="demo">Demo mode · No credentials required</span>}
    <h2>Welcome back.</h2><p>Enter your details to access your workspace.</p>
    {message === "magic" && <AuthStatus title="Check your inbox">If an eligible account exists, a secure sign-in link is on its way.</AuthStatus>}
    {message === "error" && <AuthStatus tone="error" title="Unable to sign in">Check your details and try again, or request a secure sign-in link.</AuthStatus>}
    <form onSubmit={signIn}>
      <label htmlFor="email">Work email<input id="email" required type="email" autoComplete="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="you@company.com" /></label>
      <label htmlFor="password">Password<span><input id="password" required minLength={6} type="password" autoComplete="current-password" value={password} onChange={e => setPassword(e.target.value)} placeholder="••••••••" /><Link className="forgot" href="/forgot-password">Forgot?</Link></span></label>
      <button className="primary" disabled={Boolean(loading)} type="submit">{loading === "password" ? "Signing in…" : isSupabaseConfigured ? "Sign in" : "Enter demo workspace"}</button>
      <div className="or">OR</div>
      <button className="secondary" disabled={Boolean(loading)} type="button" onClick={magicLink}>{loading === "magic" ? "Sending…" : "Continue with magic link"}</button>
    </form>
    <small className="terms">
      Access for team members is invitation-only. New customer? <Link href="/signup">Create a customer account</Link>
    </small>
  </AuthShell>;
}
