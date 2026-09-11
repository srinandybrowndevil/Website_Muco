"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { createClient } from "@muco/core/browser";
import { Icon } from "@muco/ui";

/**
 * A mentor recommending that an internship be certified.
 *
 * A recommendation is not an approval. Only the founder issues a certificate,
 * and this is the step before it — which is why the button says "recommend"
 * rather than "approve", and why the note is asked for rather than optional in
 * spirit: the founder is reading this to make a decision, not to rubber-stamp
 * one already made.
 *
 * guard_mentor_recommendation enforces that only the named mentor may write
 * these columns. This form is the convenient way to do it, not the only one
 * that works.
 */
export function RecommendMentee({
  internId,
  name,
  already,
}: {
  internId: string;
  name: string;
  already: boolean;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    setBusy(true);
    setError(null);
    const supabase = createClient();
    if (!supabase) {
      setBusy(false);
      setError("This workspace is not connected to its database.");
      return;
    }
    const { error: failure } = await supabase
      .from("intern_profiles")
      .update({ mentor_recommended_at: new Date().toISOString(), mentor_note: note.trim() || null })
      .eq("id", internId);
    setBusy(false);
    if (failure) {
      setError("That was refused: " + failure.message);
      return;
    }
    setOpen(false);
    router.refresh();
  }

  if (already) {
    return (
      <span className="pill ok" data-shape="filled">Recommended</span>
    );
  }

  if (!open) {
    return (
      <button className="btn sm primary" type="button" onClick={() => setOpen(true)}>
        <Icon name="checkCircle" size={14} />
        <span>Recommend</span>
      </button>
    );
  }

  return (
    <form className="stack-sm" onSubmit={submit} style={{ flexBasis: "100%" }}>
      <label className="label" htmlFor={"note-" + internId}>
        What should the founder know about {name}?
      </label>
      <textarea
        id={"note-" + internId}
        value={note}
        onChange={event => setNote(event.target.value)}
        placeholder="What they worked on, how they handled being stuck, whether you would take them again."
        style={{ minHeight: 84 }}
        required
      />
      {error ? <p className="errortext" role="alert">{error}</p> : null}
      <div className="cluster">
        <button className="btn sm primary" type="submit" disabled={busy || !note.trim()}>
          {busy ? "Saving" : "Send recommendation"}
        </button>
        <button className="btn sm quiet" type="button" onClick={() => setOpen(false)}>Cancel</button>
      </div>
    </form>
  );
}
