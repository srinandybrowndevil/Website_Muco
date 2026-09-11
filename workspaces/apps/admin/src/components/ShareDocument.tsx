"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { createClient } from "@muco/core/browser";
import { formatDate } from "@muco/core";
import { Icon } from "@muco/ui";

export type SharedFile = {
  id: string;
  name: string;
  kind: string | null;
  size_bytes: number | null;
  created_at: string;
};

function size(bytes: number | null) {
  if (!bytes) return "";
  return bytes > 1_000_000
    ? (bytes / 1_048_576).toFixed(1) + " MB"
    : Math.max(1, Math.round(bytes / 1024)) + " KB";
}

/**
 * Sharing a document with a customer.
 *
 * kind is the whole access story and is why this component exists rather than
 * a generic uploader. The client policy admits kind = 'document' and nothing
 * else, so a file marked 'internal' sits in the same bucket, attached to the
 * same project, and is not returned to that customer at all.
 *
 * The choice is therefore presented as what it means -- "they can open this"
 * against "only the studio" -- rather than as a field called kind. A person
 * choosing quickly should not have to know the schema to get it right, and
 * getting it wrong sends somebody else's working file to a client.
 */
export function ShareDocument({
  projectId,
  customerId,
  organizationId,
  files,
  canEdit,
}: {
  projectId: string;
  customerId: string | null;
  organizationId: string;
  files: SharedFile[];
  canEdit: boolean;
}) {
  const router = useRouter();
  const [file, setFile] = useState<File | null>(null);
  const [shared, setShared] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    if (!file) return;

    if (file.size > 25 * 1024 * 1024) {
      setError("That file is larger than 25 MB. Link to it instead of uploading it.");
      return;
    }

    setBusy(true);
    setError(null);

    const supabase = createClient();
    if (!supabase) {
      setBusy(false);
      setError("Not connected to the database.");
      return;
    }

    // The path decides authorisation, so it is built here rather than taken
    // from the file. A name somebody chose can carry a slash or a leading dot,
    // and either would put the object outside the folder the policy checks.
    const extension = (file.name.split(".").pop() ?? "bin").toLowerCase().replace(/[^a-z0-9]/g, "").slice(0, 8);
    const safe = Date.now() + "." + (extension || "bin");
    const folder = customerId ? "customers/" + customerId : "projects/" + projectId;
    const path = organizationId + "/" + folder + "/" + safe;

    const { error: uploadFailed } = await supabase.storage
      .from("crm-files")
      .upload(path, file, { contentType: file.type || "application/octet-stream", upsert: false });

    if (uploadFailed) {
      setBusy(false);
      setError("The upload was refused: " + uploadFailed.message);
      return;
    }

    const { error: recordFailed } = await supabase.from("files").insert({
      organization_id: organizationId,
      customer_id: customerId,
      project_id: projectId,
      bucket: "crm-files",
      path,
      // The original name is kept as the label, where it is displayed and
      // never used to address anything.
      name: file.name,
      mime_type: file.type || null,
      size_bytes: file.size,
      kind: shared ? "document" : "internal",
    });

    setBusy(false);
    if (recordFailed) {
      setError("The file uploaded but the record was refused: " + recordFailed.message);
      return;
    }
    setFile(null);
    router.refresh();
  }

  return (
    <>
      {files.length === 0 ? (
        <div className="empty">
          <span className="mark"><Icon name="folder" size={22} /></span>
          <b>No files on this project</b>
          <p>Anything marked as a document appears on the customer&rsquo;s Files page straight away.</p>
        </div>
      ) : (
        <div className="list">
          {files.map(row => (
            <div className="item" key={row.id}>
              <Icon name={row.kind === "document" ? "fileText" : "file"} size={16} />
              <span className="item-main">
                <b className="truncate">{row.name}</b>
                <small>
                  {formatDate(row.created_at)}
                  {row.size_bytes ? " · " + size(row.size_bytes) : ""}
                </small>
              </span>
              <span className={row.kind === "document" ? "pill ok" : "pill neutral"}
                data-shape={row.kind === "document" ? "filled" : "stopped"}>
                {row.kind === "document" ? "Customer can open" : "Studio only"}
              </span>
            </div>
          ))}
        </div>
      )}

      {canEdit ? (
        <div className="panel-body">
          <form className="stack" onSubmit={submit}>
            <div className="field">
              <label htmlFor="f-file">Add a file</label>
              <input id="f-file" type="file"
                onChange={event => { setFile(event.target.files?.[0] ?? null); setError(null); }} />
            </div>
            <label className="checkline">
              <input type="checkbox" checked={shared} onChange={event => setShared(event.target.checked)} />
              <span>
                The customer can open this. Leave it ticked for a proposal, a scope sheet or an
                export; untick it for working files, which then stay inside the studio.
              </span>
            </label>
            {error ? <p className="errortext" role="alert">{error}</p> : null}
            <div>
              <button className="btn sm primary" type="submit" disabled={busy || !file}>
                <Icon name="upload" size={14} />
                <span>{busy ? "Uploading" : "Upload"}</span>
              </button>
            </div>
          </form>
        </div>
      ) : null}
    </>
  );
}
