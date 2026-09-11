"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { createClient } from "@muco/core/browser";
import { Icon } from "@muco/ui";

const TRACKS: [string, string][] = [
  ["", "Everybody, whatever their track"],
  ["intern_frontend", "Frontend"],
  ["intern_backend", "Backend"],
  ["intern_mobile", "Mobile"],
  ["intern_design", "Design (UI/UX)"],
  ["intern_qa", "QA and testing"],
  ["intern_seo", "SEO and content"],
];

/**
 * Adding something for an intern to read, and giving it to them.
 *
 * Two steps rather than one, and deliberately so. The intern workspace shows
 * assigned material and has no library to browse, because the specification is
 * explicit about that — an intern on the design track should not be reading
 * the backend onboarding notes. Material existing and material being assigned
 * are therefore different facts, and this keeps them different.
 */
export function LearningEditor({
  organizationId,
  interns,
}: {
  organizationId: string;
  interns: { id: string; name: string; track: string }[];
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [summary, setSummary] = useState("");
  const [url, setUrl] = useState("");
  const [minutes, setMinutes] = useState("");
  const [track, setTrack] = useState("");
  const [assignTo, setAssignTo] = useState<string[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function toggle(id: string) {
    setAssignTo(current =>
      current.includes(id) ? current.filter(item => item !== id) : [...current, id]);
  }

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    setBusy(true);
    setError(null);

    const supabase = createClient();
    if (!supabase) {
      setBusy(false);
      setError("Not connected to the database.");
      return;
    }

    const { data: material, error: failure } = await supabase
      .from("learning_materials")
      .insert({
        organization_id: organizationId,
        title: title.trim(),
        summary: summary.trim() || null,
        url: url.trim() || null,
        minutes: minutes === "" ? null : Number(minutes),
        track: track || null,
      })
      .select("id")
      .single();

    if (failure || !material) {
      setBusy(false);
      setError(failure?.message ?? "The material could not be saved.");
      return;
    }

    if (assignTo.length > 0) {
      const { error: assignFailed } = await supabase.from("learning_assignments").insert(
        assignTo.map(internId => ({
          organization_id: organizationId,
          material_id: material.id,
          intern_id: internId,
        })),
      );
      if (assignFailed) {
        setBusy(false);
        // Said precisely, because the material did save. Telling somebody the
        // whole thing failed would have them add it a second time.
        setError("The material was saved but could not be assigned: " + assignFailed.message);
        router.refresh();
        return;
      }
    }

    setBusy(false);
    setTitle("");
    setSummary("");
    setUrl("");
    setMinutes("");
    setAssignTo([]);
    setOpen(false);
    router.refresh();
  }

  if (!open) {
    return (
      <button className="btn primary" type="button" onClick={() => setOpen(true)}>
        <Icon name="plus" size={15} />
        <span>Add material</span>
      </button>
    );
  }

  return (
    <form className="stack" onSubmit={submit}>
      <div className="field">
        <label htmlFor="l-title">Title</label>
        <input id="l-title" type="text" value={title} autoFocus
          onChange={event => setTitle(event.target.value)} required />
      </div>

      <div className="field">
        <label htmlFor="l-summary">Why it is worth their time</label>
        <input id="l-summary" type="text" value={summary}
          onChange={event => setSummary(event.target.value)}
          placeholder="One line. This is what they see before deciding to open it." />
      </div>

      <div className="grid-2">
        <div className="field">
          <label htmlFor="l-url">Link</label>
          <input id="l-url" type="url" value={url}
            onChange={event => setUrl(event.target.value)} placeholder="https://" />
        </div>
        <div className="field">
          <label htmlFor="l-minutes">Roughly how long (minutes)</label>
          <input id="l-minutes" type="number" min="1" max="600" value={minutes}
            onChange={event => setMinutes(event.target.value)} />
        </div>
      </div>

      <div className="field">
        <label htmlFor="l-track">Which track it suits</label>
        <select id="l-track" value={track} onChange={event => setTrack(event.target.value)}>
          {TRACKS.map(([value, label]) => <option key={value} value={value}>{label}</option>)}
        </select>
        <span className="hint">A label for you. What an intern sees is decided by the assignment below.</span>
      </div>

      <div className="field">
        <span className="label">Assign it now (optional)</span>
        {interns.length === 0 ? (
          <span className="hint">No active interns to assign it to yet.</span>
        ) : (
          <div className="cluster">
            {interns.map(intern => (
              <button
                key={intern.id}
                type="button"
                className="chip"
                aria-pressed={assignTo.includes(intern.id)}
                onClick={() => toggle(intern.id)}
              >
                {intern.name}
              </button>
            ))}
          </div>
        )}
      </div>

      {error ? <p className="errortext" role="alert">{error}</p> : null}

      <div className="cluster">
        <button className="btn primary" type="submit" disabled={busy || !title.trim()}>
          {busy ? "Saving" : "Save material"}
        </button>
        <button className="btn quiet" type="button" onClick={() => setOpen(false)}>Cancel</button>
      </div>
    </form>
  );
}
