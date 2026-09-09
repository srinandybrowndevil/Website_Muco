"use client";

import { FormEvent, useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { isSupabaseConfigured } from "@/lib/supabase/config";

export function CustomerProfile() {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [linkedin, setLinkedin] = useState("");
  const [instagram, setInstagram] = useState("");
  const [photo, setPhoto] = useState("");
  const [photoBusy, setPhotoBusy] = useState(false);
  const [company, setCompany] = useState("");
  const [location, setLocation] = useState("");
  const [loadFailed, setLoadFailed] = useState(false);
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
      const { data: profile, error: loadError } = await client.from("profiles").select("full_name,avatar_url").eq("id", user.id).maybeSingle();
      if (loadError) { setError("Your profile could not be loaded. Refresh before editing."); setLoadFailed(true); }
      const { data: customer, error: customerError } = await client.from("customers").select("phone,company,metadata").eq("auth_user_id", user.id).limit(1).maybeSingle();
      if (customerError) { setError("Your contact details could not be loaded. Refresh before editing."); setLoadFailed(true); }
      setName(profile?.full_name ?? user.user_metadata?.full_name ?? "");
      setPhone(customer?.phone ?? user.user_metadata?.phone ?? "");
      setCompany(customer?.company ?? user.user_metadata?.company ?? "");
      setLocation(customer?.metadata?.location ?? user.user_metadata?.location ?? "");
      setLinkedin(user.user_metadata?.linkedin ?? "");
      setInstagram(user.user_metadata?.instagram ?? "");
      setPhoto(profile?.avatar_url ?? "");
      setLoading(false);
    })().catch(() => { setError("Unable to load your profile. Refresh to try again."); setLoadFailed(true); setLoading(false); });
  }, []);

  async function choosePhoto(file?: File) {
    if (!file) return;
    setError(null);
    if (!["image/jpeg", "image/png", "image/webp"].includes(file.type) || file.size > 5 * 1024 * 1024) {
      setError("Choose a JPG, PNG or WebP image under 5 MB."); return;
    }
    setPhotoBusy(true);
    try {
      const bitmap = await createImageBitmap(file);
      const size = Math.min(bitmap.width, bitmap.height);
      const canvas = document.createElement("canvas");
      canvas.width = canvas.height = 256;
      canvas.getContext("2d")!.drawImage(bitmap, (bitmap.width-size)/2, (bitmap.height-size)/2, size, size, 0, 0, 256, 256);
      bitmap.close();
      setPhoto(canvas.toDataURL("image/jpeg", 0.8));
    } catch { setError("This image could not be opened. Choose a different photo."); }
    finally { setPhotoBusy(false); }
  }

  async function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const cleanName = name.trim();
    if (cleanName.length < 2) { setError("Enter your full name."); setMessage(null); return; }
    if (cleanName.length > 100) { setError("Keep your name within 100 characters."); return; }
    if (!/^\+?[\d\s()-]{7,25}$/.test(phone.trim())) { setError("Enter a valid contact number, including your country code."); return; }
    for (const [value, domain] of [[linkedin, "linkedin.com"], [instagram, "instagram.com"]]) {
      if (!value.trim()) continue;
      try { const url = new URL(value.trim()); if (url.protocol !== "https:" || ![domain, `www.${domain}`].includes(url.hostname) || url.username || url.password) throw new Error(); }
      catch { setError(`Use a full https://${domain}/ profile link.`); return; }
    }
    const client = createClient();
    if (!client || !isSupabaseConfigured) { setError("Profile editing is unavailable in preview mode."); return; }
    setSaving(true); setError(null); setMessage(null);
    try {
    const { data: { user } } = await client.auth.getUser();
    if (!user) { setError("Your session has expired. Sign in again."); setSaving(false); return; }
    const { error: syncError } = await client.rpc("complete_customer_onboarding", { p_org_slug: "muco-labs", p_full_name: cleanName, p_phone: phone.trim(), p_company: company.trim(), p_location: location.trim() });
    if (syncError) { setError("Your customer details could not be saved. Please retry."); setSaving(false); return; }
    const { data: saved, error: profileError } = await client.from("profiles").update({ full_name: cleanName, avatar_url: photo || null }).eq("id", user.id).select("id").single();
    if (profileError || !saved) { setError("Your profile could not be saved. Please retry."); setSaving(false); return; }
    const { error: authError } = await client.auth.updateUser({ data: { full_name: cleanName, phone: phone.trim(), linkedin: linkedin.trim(), instagram: instagram.trim() } });
    if (authError) { setError("Name and photo saved. Contact and social details were not saved; please retry."); }
    else { setMessage("Your profile was updated."); }
    window.dispatchEvent(new Event("muco-profile-updated"));
    } catch { setError("Could not finish saving. Check your connection and retry."); }
    finally { setSaving(false); }
  }

  if (loading) return <p className="loading" role="status">Loading your profile…</p>;
  return <div className="profilepage">
    <div className="pagehead"><div><p className="eyebrow">Customer portal / Profile</p><h1>Your profile.</h1><p>Keep the name MUCO LABS uses when we contact you.</p></div></div>
    <section className="panel profilecard">
      <div className="profileintro"><span className="avatar large">{name ? name.split(/\s+/).map(part => part[0]).join("").slice(0, 2).toUpperCase() : "CP"}</span><div><h2>Account details</h2><p>Your email is used for sign-in and cannot be changed here.</p></div></div>
      <form className="record-fields profileform" onSubmit={save}>
        <div className="profile-photo-field">
          {/* User-selected photos are already resized locally; no remote image optimizer is needed. */}
          {/* eslint-disable-next-line @next/next/no-img-element */}
          {photo && <img src={photo} alt="Your profile preview" width="96" height="96" className="profile-photo" />}
          <label>Profile picture<input type="file" accept="image/jpeg,image/png,image/webp" disabled={saving || photoBusy} onChange={event => void choosePhoto(event.target.files?.[0])} /></label>
          <p>1:1 square, displayed as a circle. Photos are centre-cropped to 256 × 256. JPG, PNG or WebP, up to 5 MB. Preview before saving.</p>
          {photo && <button type="button" className="secondary" onClick={() => setPhoto("")}>Remove photo</button>}
        </div>
        <label htmlFor="customer-profile-name">Full name<input id="customer-profile-name" value={name} onChange={event => setName(event.target.value)} autoComplete="name" required /></label>
        <label htmlFor="customer-profile-email">Sign-in email<input id="customer-profile-email" value={email} readOnly disabled /></label>
        <label>Contact number<input required type="tel" autoComplete="tel" maxLength={25} value={phone} onChange={event => setPhone(event.target.value)} placeholder="+91 …" /></label>
        <label>Company / business<input maxLength={120} value={company} onChange={event => setCompany(event.target.value)} autoComplete="organization" /></label>
        <label>City / location<input maxLength={120} value={location} onChange={event => setLocation(event.target.value)} autoComplete="address-level2" /></label>
        <label>LinkedIn profile (optional)<input type="url" maxLength={300} value={linkedin} onChange={event => setLinkedin(event.target.value)} placeholder="https://www.linkedin.com/in/…" /></label>
        <label>Instagram profile (optional)<input type="url" maxLength={300} value={instagram} onChange={event => setInstagram(event.target.value)} placeholder="https://www.instagram.com/…" /></label>
        {error && <p className="error" role="alert">{error}</p>}
        {message && <p className="success" role="status">{message}</p>}
        <div className="formactions"><button className="primary" type="submit" disabled={saving || photoBusy || loadFailed}>{saving ? "Saving…" : "Save profile"}</button></div>
      </form>
    </section>
  </div>;
}
