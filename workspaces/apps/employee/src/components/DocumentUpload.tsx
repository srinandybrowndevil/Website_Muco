"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { createClient } from "@muco/core/browser";
import { Icon } from "@muco/ui";

const KINDS: [string, string][] = [
  ["identity", "Identity document"],
  ["address", "Address proof"],
  ["bank", "Bank details"],
  ["education", "Education certificate"],
  ["other", "Something else"],
];

/**
 * Uploading a document about yourself.
 *
 * The path is <organisation>/people/<your user id>/<file>, and the storage
 * policy compares that third segment against auth.uid(). So the path is not a
 * convention this component follows politely — choosing somebody else's folder
 * fails the check rather than passing it quietly.
 *
 * The file name is rewritten before upload. A name a person chose can carry a
 * slash, a leading dot, or three hundred characters of Unicode, and the path is
 * the thing authorisation is decided on: it is not a place for user-supplied
 * structure.
 */
export function DocumentUpload({
  userId,
  organizationId,
}: {
  userId: string;
  organizationId: string;
}) {
  const router = useRouter();
  const [kind, setKind] = useState("identity");
  const [label, setLabel] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    if (!file) return;

    // Ten megabytes. Refusing here is a courtesy — the bucket refuses too, but
    // after the whole file has gone up, which on a phone connection is a long
    // wait for a no.
    if (file.size > 10 * 1024 * 1024) {
      setError("That file is larger than 10 MB. A photograph of a document is usually under 2 MB.");
      return;
    }

    setBusy(true);
    setError(null);

    const supabase = createClient();
    if (!supabase) {
      setBusy(false);
      setError("This workspace is not connected to its database.");
      return;
    }

    const extension = (file.name.split(".").pop() ?? "bin").toLowerCase().replace(/[^a-z0-9]/g, "").slice(0, 8);
    const safeName = kind + "-" + Date.now() + "." + (extension || "bin");
    const path = organizationId + "/people/" + userId + "/" + safeName;

    const { error: uploadFailed } = await supabase.storage
      .from("crm-files")
      .upload(path, file, { contentType: file.type || "application/octet-stream", upsert: false });

    if (uploadFailed) {
      setBusy(false);
      setError("The upload was refused: " + uploadFailed.message);
      return;
    }

    const { error: recordFailed } = await supabase.from("person_documents").insert({
      organization_id: organizationId,
      user_id: userId,
      kind,
      label: label.trim() || file.name,
      bucket: "crm-files",
      path,
      mime_type: file.type || null,
      size_bytes: file.size,
    });

    setBusy(false);
    if (recordFailed) {
      setError("The file uploaded but the record was refused: " + recordFailed.message);
      return;
    }

    setFile(null);
    setLabel("");
    router.refresh();
  }

  return (
    <form className="stack" onSubmit={submit}>
      <div className="grid-2">
        <div className="field">
          <label htmlFor="doc-kind">What is it</label>
          <select id="doc-kind" value={kind} onChange={event => setKind(event.target.value)}>
            {KINDS.map(([value, text]) => (
              <option value={value} key={value}>{text}</option>
            ))}
          </select>
        </div>
        <div className="field">
          <label htmlFor="doc-label">Label (optional)</label>
          <input
            id="doc-label"
            type="text"
            value={label}
            onChange={event => setLabel(event.target.value)}
            placeholder="Aadhaar front"
          />
        </div>
      </div>

      <div className="field">
        <label htmlFor="doc-file">File</label>
        <input
          id="doc-file"
          type="file"
          accept="image/*,application/pdf"
          onChange={event => { setFile(event.target.files?.[0] ?? null); setError(null); }}
          required
        />
        <span className="hint">An image or a PDF, up to 10 MB.</span>
      </div>

      {error ? <p className="errortext" role="alert">{error}</p> : null}

      <div>
        <button className="btn primary" type="submit" disabled={busy || !file}>
          <Icon name="upload" size={15} />
          <span>{busy ? "Uploading" : "Upload"}</span>
        </button>
      </div>
    </form>
  );
}
