"use client";
import { FormEvent, useCallback, useRef, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { useLiveQuery } from "@/lib/use-live-query";
import { CrmRow } from "@/lib/crm";

export function LiveFiles({ organizationId, customer = false }: { organizationId: string; customer?: boolean }) {
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [page, setPage] = useState(0);
  const form = useRef<HTMLFormElement>(null);
  const load = useCallback(async () => {
    const client = createClient()!;
    const [files, customers] = await Promise.all([
      client.from("files").select("*", { count: "exact" }).eq("organization_id", organizationId).order("created_at", { ascending: false }).range(page * 25, page * 25 + 24),
      customer ? Promise.resolve({ data: [], error: null }) : client.from("customers").select("id,name").eq("organization_id", organizationId).order("name").limit(1000),
    ]);
    if (files.error) throw new Error(files.error.message);
    if (customers.error) throw new Error(customers.error.message);
    return { files: (files.data ?? []) as CrmRow[], count: files.count ?? 0, customers: (customers.data ?? []) as { id: string; name: string }[] };
  }, [organizationId, customer, page]);
  const state = useLiveQuery("files", load, organizationId);
  async function upload(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); setBusy(true); setError(null);
    const fields = new FormData(event.currentTarget);
    const file = fields.get("file") as File;
    try {
      if (!file?.size || file.size > 10 * 1024 * 1024) throw new Error("Choose a non-empty file of up to 10 MB.");
      const client = createClient()!;
      const { data: { user } } = await client.auth.getUser();
      if (!user) throw new Error("Sign in again before uploading.");
      const path = `${organizationId}/${crypto.randomUUID()}-${file.name.replace(/[^a-zA-Z0-9._-]/g, "_")}`;
      const result = await client.storage.from("crm-files").upload(path, file, { upsert: false, contentType: file.type });
      if (result.error) throw new Error(result.error.message);
      const saved = await client.from("files").insert({ organization_id: organizationId, customer_id: fields.get("customer") || null, uploader_id: user.id, bucket: "crm-files", path, name: file.name, mime_type: file.type, size_bytes: file.size });
      if (saved.error) {
        const cleanup = await client.storage.from("crm-files").remove([path]);
        throw new Error(`${saved.error.message}${cleanup.error ? " The unlinked upload needs removal from Storage by an admin." : ""}`);
      }
      form.current?.reset(); await state.refresh();
    } catch (err) { setError(err instanceof Error ? err.message : "Upload failed."); }
    finally { setBusy(false); }
  }
  async function download(file: CrmRow) {
    setError(null);
    try {
      const { data, error } = await createClient()!.storage.from(String(file.bucket)).createSignedUrl(String(file.path), 60, { download: String(file.name) });
      if (error || !data) throw new Error(error?.message ?? "Download unavailable.");
      // Same-tab navigation avoids popup blockers after the asynchronous check.
      const link = document.createElement("a"); link.href = data.signedUrl; link.rel = "noreferrer"; link.click();
    } catch (err) { setError(err instanceof Error ? err.message : "Download failed."); }
  }
  return <section id={customer ? "files" : undefined} className={customer ? "panel" : "page"}><div className="pagehead"><div><p className="eyebrow">{customer ? "Your deliverables" : "Workspace / Files"}</p><h1>Files</h1><p>{customer ? "Files shared with your customer account." : "Private deliverables, shared only with the selected customer."}</p></div></div>
    {!customer && <form className="panel record-fields" ref={form} onSubmit={upload}><label>File (up to 10 MB)<input name="file" type="file" accept=".pdf,.png,.jpg,.jpeg,.webp,.txt,.csv,.docx,.xlsx" required /></label><label>Share with customer<select name="customer"><option value="">Staff only</option>{state.data?.customers.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}</select></label><button className="primary" disabled={busy}>{busy ? "Uploading…" : "Upload file"}</button></form>}
    {(error || state.error) && <p role="alert" className="error">{error || state.error}</p>}{state.loading && <p role="status">Loading files…</p>}
    {state.data?.files.map(file => <div className="portalf" key={file.id}><span className="fileicon">FILE</span><span><b>{String(file.name)}</b><small>{Math.ceil(Number(file.size_bytes) / 1024)} KB</small></span><button className="secondary" onClick={() => void download(file)}>Download</button></div>)}
    {!state.loading && !state.error && !state.data?.files.length && <p>No files shared yet.</p>}
    <div className="live-tools"><button className="secondary" disabled={!page} onClick={() => setPage(p => p - 1)}>Previous</button><span>Page {page + 1}</span><button className="secondary" disabled={(page + 1) * 25 >= (state.data?.count ?? 0)} onClick={() => setPage(p => p + 1)}>Next</button></div>
  </section>;
}
