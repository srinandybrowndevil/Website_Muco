"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

// The two fields anybody may change about themselves: what they are called and
// how to reach them.
//
// Written once and used by the intern and the staff profile, because an intern
// changing their phone number and an employee changing theirs is the same act
// against the same table. Everything a person must not change about themselves
// -- dates, track, role, compensation -- is shown next to this form as text,
// not left out: seeing that your end date is 30 November and cannot be edited
// here is more useful than not seeing it at all.

export function PersonalDetails({ fullName, phone }: { fullName: string | null; phone: string | null }) {
  const router = useRouter();
  const [name, setName] = useState(fullName ?? "");
  const [number, setNumber] = useState(phone ?? "");
  const [busy, setBusy] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit(event: FormEvent) {
    event.preventDefault();
    setError(null);
    setSaved(false);

    const client = createClient();
    if (!client) { setError("This workspace is not configured for sign-in."); return; }

    const { data: { user } } = await client.auth.getUser();
    if (!user) { setError("Your session has ended. Sign in again."); return; }

    setBusy(true);
    const { error: failed } = await client.from("profiles")
      .update({ full_name: name.trim() || null, phone: number.trim() || null })
      .eq("id", user.id);
    setBusy(false);

    if (failed) { setError(failed.message); return; }
    setSaved(true);
    router.refresh();
  }

  return (
    <form onSubmit={submit} className="account-form">
      <label htmlFor="full-name">Your name</label>
      <input id="full-name" value={name} disabled={busy} autoComplete="name"
        onChange={event => setName(event.target.value)} placeholder="As you want it written" />

      <label htmlFor="phone">Phone</label>
      <input id="phone" value={number} disabled={busy} autoComplete="tel" inputMode="tel"
        onChange={event => setNumber(event.target.value)} placeholder="+91 90000 00000" />

      {error && <p className="error" role="alert">{error}</p>}
      {saved && <p className="account-saved" role="status">Saved.</p>}

      <button className="primary" disabled={busy}>{busy ? "Saving…" : "Save changes"}</button>

      <p className="account-hint">
        Your name here is the name printed on anything this workspace issues you, so write it
        the way it should appear.
      </p>
    </form>
  );
}
