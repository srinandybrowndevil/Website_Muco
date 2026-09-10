"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

// Checklist 4.13: a mentor recommends, only the founder issues.
//
// Those are two different acts and this writes only the first. The
// recommendation lands in two columns on the internship record; the
// certificate itself is created by issue_certificate, which refuses anybody
// who is not an administrator. A mentor pressing this button is saying "as far
// as I am concerned this person is done", which is exactly the weight it
// should carry -- no more.

export function RecommendMentee({
  internId, name, recommendedAt,
}: { internId: string; name: string; recommendedAt: string | null }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function recommend() {
    setError(null);
    const client = createClient();
    if (!client) { setError("This workspace is not configured for sign-in."); return; }

    setBusy(true);
    const { error: failed } = await client.from("intern_profiles")
      .update({ mentor_recommended_at: new Date().toISOString(), mentor_note: note.trim() || null })
      .eq("id", internId);
    setBusy(false);

    if (failed) { setError(failed.message); return; }
    setOpen(false);
    router.refresh();
  }

  if (recommendedAt) {
    return (
      <p className="recommended" role="status">
        You recommended {name} on{" "}
        {new Date(recommendedAt).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}.
        The founder issues the certificate.
      </p>
    );
  }

  if (!open) {
    return (
      <button type="button" className="secondary compact" onClick={() => setOpen(true)}>
        Recommend for completion
      </button>
    );
  }

  return (
    <div className="accessconfirm">
      <label htmlFor={`note-${internId}`}>What should the founder know about {name}?</label>
      <input id={`note-${internId}`} value={note} disabled={busy}
        placeholder="Finished the brief, worked well unsupervised…"
        onChange={event => setNote(event.target.value)} />
      <div className="accessbuttons">
        <button type="button" className="primary compact" disabled={busy} onClick={recommend}>
          {busy ? "Recording…" : "Recommend"}
        </button>
        <button type="button" className="secondary compact" disabled={busy}
          onClick={() => { setOpen(false); setError(null); }}>
          Cancel
        </button>
      </div>
      {error && <p className="error" role="alert">{error}</p>}
      <p className="muted">
        This records your recommendation. It does not issue a certificate — only the founder
        does that, and they will see this note when they do.
      </p>
    </div>
  );
}
