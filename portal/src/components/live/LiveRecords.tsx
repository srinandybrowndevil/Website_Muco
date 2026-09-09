"use client";

import { FormEvent, useCallback, useEffect, useRef, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { crmSections, CrmRow, currency, label, recordPayload } from "@/lib/crm";
import { useLiveQuery } from "@/lib/use-live-query";
import { EmptyState } from "../EmptyState";

export function LiveRecords({ section, organizationId }: { section: string; organizationId: string }) {
  const config = crmSections[section];
  const [page, setPage] = useState(0);
  const [search, setSearch] = useState("");
  const [query, setQuery] = useState("");
  const [editing, setEditing] = useState<CrmRow | null>(null);
  const [values, setValues] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [notice, setNotice] = useState("");
  const dialog = useRef<HTMLDialogElement>(null);
  useEffect(() => { const timer = setTimeout(() => { setQuery(search.trim()); setPage(0); }, 300); return () => clearTimeout(timer); }, [search]);
  const load = useCallback(async () => {
    const client = createClient()!;
    let request = client.from(section).select("*", { count: "exact" }).eq("organization_id", organizationId)
      .order("created_at", { ascending: false }).order("id").range(page * 25, page * 25 + 24);
    if (query) request = request.ilike(config.primary, `%${query.replace(/[%_\\]/g, "\\$&")}%`);
    const [records, customers] = await Promise.all([
      request,
      config.fields.some(f => f.type === "customer") ? client.from("customers").select("id,name").eq("organization_id", organizationId).order("name").limit(1000) : Promise.resolve({ data: [], error: null }),
    ]);
    if (records.error) throw new Error(records.error.message);
    if (customers.error) throw new Error(customers.error.message);
    return { rows: (records.data ?? []) as CrmRow[], count: records.count ?? 0, customers: (customers.data ?? []) as { id: string; name: string }[] };
  }, [section, organizationId, page, query, config]);
  const state = useLiveQuery(`${section},customers`, load, organizationId);
  function open(row?: CrmRow) {
    const next: Record<string, string> = {};
    for (const field of config.fields) {
      const raw = row?.[field.key];
      next[field.key] = raw == null ? (field.options?.[0] ?? (field.type === "number" && field.required ? String(field.min ?? 0) : "")) : String(raw);
      if (field.type === "datetime-local" && raw) {
        const d = new Date(String(raw));
        next[field.key] = new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().slice(0, 16);
      }
    }
    setEditing(row ?? null); setValues(next); setSaveError(null); dialog.current?.showModal();
  }
  async function save(event: FormEvent) {
    event.preventDefault(); setBusy(true); setSaveError(null);
    try {
      const payload = recordPayload(section, values);
      const client = createClient()!;
      const result = editing
        ? await client.from(section).update(payload).eq("id", editing.id).eq("organization_id", organizationId).select("id").single()
        : await client.from(section).insert({ ...payload, organization_id: organizationId }).select("id").single();
      if (result.error) throw new Error(result.error.message);
      dialog.current?.close(); setNotice(`${label(config.singular)} saved.`); await state.refresh();
    } catch (error) { setSaveError(error instanceof Error ? error.message : "Could not save. Please retry."); }
    finally { setBusy(false); }
  }
  const columns = config.fields.filter(f => f.type !== "textarea").slice(0, 6);
  return <div className="page live-records">
    <div className="pagehead"><div><p className="eyebrow">Workspace / {section}</p><h1>{config.title}</h1><p>Saved records from your workspace.</p></div><button className="primary record-add" onClick={() => open()}>+ New {config.singular}</button></div>
    <div className="live-tools"><label className="searchbox"><span className="visually-hidden">Search by {config.primary}</span><input type="search" placeholder={`Search by ${config.primary}…`} value={search} onChange={e => setSearch(e.target.value)} /></label><span className="demo">{state.connected ? "Live updates" : "Auto-refresh every 30s"}</span><button className="secondary" onClick={() => void state.refresh()}>Refresh</button></div>
    {notice && <p role="status">{notice}</p>}
    {state.error && <div className="panel error" role="alert">{state.error}</div>}
    {state.loading && <p role="status">Loading records…</p>}
    {!state.loading && !state.error && !state.data?.count && <div className="panel">{query
      ? <EmptyState compact icon="search" title="No matching records" body={`Nothing in ${section} matches “${query}”. Search runs on ${config.primary} only, so try a shorter term or clear it to see everything.`} action={{ label: "Clear search", onClick: () => setSearch("") }} />
      : <EmptyState icon={config.icon} title={`No ${section} yet`} body={config.emptyBody} action={{ label: `Add the first ${config.singular}`, onClick: () => open() }} />}</div>}
    {!!state.data?.rows.length && <div className="tablewrap"><table><caption className="visually-hidden">{config.title}</caption><thead><tr>{columns.map(f => <th key={f.key}>{f.label}</th>)}<th>Action</th></tr></thead><tbody>{state.data.rows.map(row => <tr key={row.id}>{columns.map(f => <td key={f.key}>{f.type === "customer" ? state.data?.customers.find(c => c.id === row[f.key])?.name ?? "—" : /amount|budget|value/.test(f.key) ? currency(row[f.key]) : label(row[f.key])}</td>)}<td><button className="secondary compact" onClick={() => open(row)} aria-label={`Edit ${label(row[config.primary])}`}>Edit</button></td></tr>)}</tbody></table></div>}
    <div className="live-tools"><span>{state.data?.count ?? 0} records · Page {page + 1}</span><button className="secondary" disabled={!page} onClick={() => setPage(p => p - 1)}>Previous</button><button className="secondary" disabled={(page + 1) * 25 >= (state.data?.count ?? 0)} onClick={() => setPage(p => p + 1)}>Next</button></div>
    <dialog ref={dialog} className="record-dialog" onCancel={event => { if (busy) event.preventDefault(); }}><form onSubmit={save}><div className="panelhead"><h2>{editing ? "Edit" : "New"} {config.singular}</h2><button type="button" className="secondary" disabled={busy} onClick={() => dialog.current?.close()}>Close</button></div>
      <div className="record-fields">{config.fields.map(field => <label key={field.key}>{field.label}{field.required ? " *" : ""}
        {field.options || field.type === "customer" ? <select required={field.required} value={values[field.key] ?? ""} onChange={e => setValues(v => ({ ...v, [field.key]: e.target.value }))}>{field.type === "customer" ? <><option value="">Choose customer</option>{state.data?.customers.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}</> : field.options?.map(value => <option key={value} value={value}>{label(value)}</option>)}</select>
          : field.type === "textarea" ? <textarea value={values[field.key] ?? ""} onChange={e => setValues(v => ({ ...v, [field.key]: e.target.value }))} />
            : <input type={field.type ?? "text"} required={field.required} min={field.min} max={field.max} step={field.type === "number" && !["priority", "progress"].includes(field.key) ? "0.01" : undefined} maxLength={field.type === "number" ? undefined : 1000} value={values[field.key] ?? ""} onChange={e => setValues(v => ({ ...v, [field.key]: e.target.value }))} />}
      </label>)}</div>{section === "invoices" && <p>Records track payment status. Use your accounting system to issue tax invoices.</p>}{section === "proposals" && <p>Saving a status does not send a proposal email.</p>}{saveError && <p role="alert" className="error">{saveError}</p>}<button className="primary" disabled={busy}>{busy ? "Saving…" : "Save record"}</button>
    </form></dialog>
  </div>;
}
