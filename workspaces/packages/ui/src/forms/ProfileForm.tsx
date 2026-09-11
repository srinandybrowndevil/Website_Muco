"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { createClient } from "@muco/core/browser";
import { Avatar, Icon } from "../primitives";

/**
 * The part of a person's record that belongs to the person.
 *
 * Shared across the three workspaces that have a profile page, because the
 * table and the policy are the same in each: a row in public.profiles that
 * only its owner may update. What differs between the workspaces is what sits
 * *beside* this — the intern's locked dates, the employee's roles, the
 * client's organisation — and that stays in each application.
 *
 * The email address is shown and not editable. It is the account identifier,
 * and changing it is an authentication flow with a confirmation step rather
 * than a text field.
 */
export function ProfileForm({
  userId,
  fullName,
  phone,
  email,
  avatarUrl,
}: {
  userId: string;
  fullName: string;
  phone: string;
  email: string;
  avatarUrl: string | null;
}) {
  const router = useRouter();
  const [name, setName] = useState(fullName);
  const [number, setNumber] = useState(phone);
  const [busy, setBusy] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const changed = name.trim() !== fullName || number.trim() !== phone;

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    if (!changed) return;
    setBusy(true);
    setError(null);
    setSaved(false);

    const supabase = createClient();
    if (!supabase) {
      setBusy(false);
      setError("This workspace is not connected to its database.");
      return;
    }

    const { error: failure } = await supabase
      .from("profiles")
      .update({ full_name: name.trim() || null, phone: number.trim() || null })
      .eq("id", userId);

    setBusy(false);
    if (failure) {
      setError(failure.message);
      return;
    }
    setSaved(true);
    router.refresh();
  }

  return (
    <form className="stack" onSubmit={submit}>
      <div className="cluster">
        <Avatar name={name || email} src={avatarUrl} size="lg" />
        <span className="hint">
          Your photo comes from the account you signed up with. There is no uploader here yet.
        </span>
      </div>

      <div className="grid-2">
        <div className="field">
          <label htmlFor="profile-name">Full name</label>
          <input
            id="profile-name"
            type="text"
            value={name}
            onChange={event => { setName(event.target.value); setSaved(false); }}
            autoComplete="name"
          />
          <span className="hint">This is the name that appears on anything the studio issues you.</span>
        </div>

        <div className="field">
          <label htmlFor="profile-phone">Phone</label>
          <input
            id="profile-phone"
            type="tel"
            value={number}
            onChange={event => { setNumber(event.target.value); setSaved(false); }}
            autoComplete="tel"
            placeholder="+91"
          />
        </div>
      </div>

      {error ? <p className="errortext" role="alert">{error}</p> : null}
      {saved ? (
        <p className="notice" role="status">
          <Icon name="checkCircle" size={14} />
          <span>Saved.</span>
        </p>
      ) : null}

      <div>
        <button className="btn primary" type="submit" disabled={busy || !changed}>
          {busy ? "Saving" : "Save changes"}
        </button>
      </div>
    </form>
  );
}
