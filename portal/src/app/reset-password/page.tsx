"use client";
import Link from "next/link";
import { FormEvent, useEffect, useState } from "react";
import { AuthShell, AuthStatus } from "@/components/auth/AuthShell";
import { isStrongPassword, passwordRequirements } from "@/lib/auth";
import { checkPasswordBreached, breachMessage } from "@/lib/breached-password";
import { createClient } from "@/lib/supabase/client";
import { isSupabaseConfigured } from "@/lib/supabase/config";

export default function ResetPassword(){const [password,setPassword]=useState("");const [confirm,setConfirm]=useState("");const [session,setSession]=useState(!isSupabaseConfigured);const [loading,setLoading]=useState(false);const [done,setDone]=useState(false);const [error,setError]=useState(false);const [breach,setBreach]=useState<string|null>(null);const checks=passwordRequirements(password);
useEffect(()=>{const client=createClient();if(!client)return;client.auth.getSession().then(({data})=>setSession(Boolean(data.session)));const {data}=client.auth.onAuthStateChange((_event,value)=>setSession(Boolean(value)));return()=>data.subscription.unsubscribe()},[]);
async function submit(e:FormEvent){e.preventDefault();setError(false);setBreach(null);if(!isStrongPassword(password)||password!==confirm){setError(true);return}
// Finding F-05: a recovered password gets the same breach check as a new one.
const breached=breachMessage(await checkPasswordBreached(password));if(breached){setBreach(breached);return}
if(!isSupabaseConfigured){setDone(true);return}setLoading(true);const {error:authError}=await createClient()!.auth.updateUser({password});setLoading(false);if(authError)setError(true);else setDone(true)}
return <AuthShell><h2>Choose a new password.</h2><p>Use a unique password you do not use elsewhere.</p>{done?<AuthStatus title="Password updated">Your password is ready. You can now continue to your workspace.</AuthStatus>:!session?<AuthStatus tone="error" title="Recovery link unavailable">This recovery session is invalid or expired. Request a new link to continue.</AuthStatus>:<form onSubmit={submit}><label>New password<input type="password" autoComplete="new-password" required value={password} onChange={e=>setPassword(e.target.value)} /></label><ul className="requirements"><li className={checks.length?"met":""}>10 or more characters</li><li className={checks.letter?"met":""}>A letter</li><li className={checks.number?"met":""}>A number</li><li className={checks.symbol?"met":""}>A symbol</li><li className={checks.uncommon?"met":""}>Not a common or guessable password</li></ul><label>Confirm password<input type="password" autoComplete="new-password" required value={confirm} onChange={e=>setConfirm(e.target.value)} /></label>{error&&<AuthStatus tone="error" title="Password not updated">Meet every requirement and ensure both passwords match.</AuthStatus>}{breach&&<AuthStatus tone="error" title="Choose a different password">{breach}</AuthStatus>}<button className="primary" disabled={loading}>{loading?"Updating…":"Update password"}</button></form>}<Link className="authback" href={done?"/":"/forgot-password"}>{done?"Continue to workspace":"Request another link"}</Link></AuthShell>}
