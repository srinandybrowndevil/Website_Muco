"use client";

import { FormEvent, useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { isSupabaseConfigured } from "@/lib/supabase/config";

export function CustomerProfile() {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(isSupabaseConfigured);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const client = createClient();
    if (!client) return;
    void (async () => {
      const { data: { user } } = await client.auth.getUser();
      if (!user) { setLoading(false); return; }
      setEmail(user.email ?? "");
      const { data: profile } = await client.from("profiles").select("full_name").eq("id", user.id).maybeSingle();
      setName(profile?.full_name ?? user.user_metadata?.full_name ?? "");
      setLoading(false);
    })();
  }, []);

  async function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const cleanName = name.trim();
    if (cleanName.length < 2) { setError("Enter your full name."); setMessage(null); return; }
    const client = createClient();
    if (!client || !isSupabaseConfigured) { setError("Profile editing is unavailable in preview mode."); return; }
    setSaving(true); setError(null); setMessage(null);
    const { data: { user } } = await client.auth.getUser();
    if (!user) { setError("Your session has expired. Sign in again."); setSaving(false); return; }
    const { error: profileError } = await client.from("profiles").update({ full_name: cleanName }).eq("id", user.id);
    if (profileError) { setError(profileError.message); setSaving(false); return; }
    const { error: authError } = await client.auth.updateUser({ data: { full_name: cleanName } });
    if (authError) { setError("Your profile was saved, but the welcome name could not be refreshed. Reload once."); }
    else { setMessage("Your name was updated."); }
    window.dispatchEvent(new Event("muco-profile-updated"));
    setSaving(false);
  }

  if (loading) return <p className="loading" role="status">Loading your profile…</p>;
  return <div className="profilepage">
    <div className="pagehead"><div><p className="eyebrow">Customer portal / Profile</p><h1>Your profile.</h1><p>Keep the name MUCO LABS uses when we contact you.</p></div></div>
    <section className="panel profilecard">
      <div className="profileintro"><span className="avatar large">{name ? name.split(/\s+/).map(part => part[0]).join("").slice(0, 2).toUpperCase() : "CP"}</span><div><h2>Account details</h2><p>Your email is used for sign-in and cannot be changed here.</p></div></div>
      <form className="record-fields profileform" onSubmit={save}>
        <label htmlFor="customer-profile-name">Full name<input id="customer-profile-name" value={name} onChange={event => setName(event.target.value)} autoComplete="name" required /></label>
        <label htmlFor="customer-profile-email">Sign-in email<input id="customer-profile-email" value={email} readOnly disabled /></label>
        {error && <p className="error" role="alert">{error}</p>}
        {message && <p className="success" role="status">{message}</p>}
        <div className="formactions"><button className="primary" type="submit" disabled={saving}>{saving ? "Saving…" : "Save profile"}</button></div>
      </form>
    </section>
  </div>;
}
