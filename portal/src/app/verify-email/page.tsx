"use client";
import Link from "next/link";
import { useState } from "react";
import { AuthShell, AuthStatus } from "@/components/auth/AuthShell";
import { appOrigin } from "@/lib/auth";
import { createClient } from "@/lib/supabase/client";
import { isSupabaseConfigured } from "@/lib/supabase/config";

export default function VerifyEmail(){const [email,setEmail]=useState("");const [sent,setSent]=useState(false);const [loading,setLoading]=useState(false);async function resend(){if(!/^\S+@\S+\.\S+$/.test(email))return;setLoading(true);if(isSupabaseConfigured)await createClient()!.auth.resend({type:"signup",email:email.trim(),options:{emailRedirectTo:`${appOrigin()}/auth/callback`}});setLoading(false);setSent(true)}return <AuthShell><h2>Verify your email.</h2><p>Open the verification message from MUCO to finish securing your account.</p>{sent&&<AuthStatus title="Check your inbox">If verification is available for this account, a new email is on its way.</AuthStatus>}<form onSubmit={e=>{e.preventDefault();void resend()}}><label>Work email<input required type="email" autoComplete="email" value={email} onChange={e=>setEmail(e.target.value)} /></label><button className="secondary" disabled={loading}>{loading?"Sending…":"Resend verification email"}</button></form><Link className="authback" href="/login">Return to sign in</Link></AuthShell>}
