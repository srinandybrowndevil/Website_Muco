"use client";
import Link from "next/link";
import { FormEvent, useState } from "react";
import { AuthShell, AuthStatus } from "@/components/auth/AuthShell";
import { appOrigin } from "@/lib/auth";
import { createClient } from "@/lib/supabase/client";
import { isSupabaseConfigured } from "@/lib/supabase/config";

export default function ForgotPassword() {
  const [email,setEmail]=useState(""); const [loading,setLoading]=useState(false); const [sent,setSent]=useState(false);
  async function submit(e:FormEvent){e.preventDefault();setLoading(true);if(isSupabaseConfigured) await createClient()!.auth.resetPasswordForEmail(email.trim(),{redirectTo:`${appOrigin()}/auth/callback?next=/reset-password`});setLoading(false);setSent(true)}
  return <AuthShell><h2>Reset your password.</h2><p>We’ll send a secure recovery link to your work email.</p>{sent?<AuthStatus title="Check your inbox">If an eligible account exists, password recovery instructions are on their way.</AuthStatus>:<form onSubmit={submit}><label htmlFor="email">Work email<input id="email" type="email" required autoComplete="email" value={email} onChange={e=>setEmail(e.target.value)} placeholder="you@company.com" /></label><button className="primary" disabled={loading}>{loading?"Sending…":"Send recovery link"}</button></form>}<Link className="authback" href="/login">Back to sign in</Link></AuthShell>;
}
