"use client";
import Link from "next/link";
import { useCallback } from "react";
import { createClient } from "@/lib/supabase/client";
import { currency, label } from "@/lib/crm";
import { useLiveQuery } from "@/lib/use-live-query";

type Summary = { pipeline_value: number; active_projects: number; outstanding: number; open_tasks: number; customers: number; enquiries: number; stages: { stage: string; count: number; value: number }[] };
export function LiveOverview({ organizationId, reports = false }: { organizationId: string; reports?: boolean }) {
  const load = useCallback(async () => {
    const { data, error } = await createClient()!.rpc("crm_overview", { org: organizationId });
    if (error) throw new Error(error.message);
    return data as Summary;
  }, [organizationId]);
  const state = useLiveQuery("leads,projects,invoices,tasks,customers,website_enquiries", load, organizationId);
  return <div className="page"><div className="pagehead"><div><p className="eyebrow">Workspace / {reports ? "Reports" : "Overview"}</p><h1>{reports ? "Your business, by the numbers." : "Studio overview."}</h1><p>Current totals from your saved workspace records.</p></div><Link className="primary" href="/leads">Open pipeline →</Link></div>
    <div className="live-tools"><span className="demo">{state.connected ? "Live updates" : "Auto-refresh every 30s"}</span><button className="secondary" onClick={() => void state.refresh()}>Refresh</button></div>
    {state.error && <div className="panel error" role="alert">Could not load the overview. Apply all database migrations and retry. <small>{state.error}</small></div>}
    {state.loading && <p role="status">Loading overview…</p>}
    {state.data && <><section className="metrics" aria-label="Workspace totals">{[["Open pipeline", currency(state.data.pipeline_value)], ["Active projects", state.data.active_projects], ["Unpaid invoices", currency(state.data.outstanding)], ["Open follow-ups", state.data.open_tasks]].map(([title, value]) => <article key={title}><span>{title}</span><b>{value}</b><small>Current saved records</small></article>)}</section>
      <section className="panel"><div className="panelhead"><h2>Pipeline by stage</h2><span>{state.data.customers} customers · {state.data.enquiries} new enquiries</span></div><div className="tablewrap"><table><thead><tr><th>Stage</th><th>Leads</th><th>Estimated value</th></tr></thead><tbody>{state.data.stages.map(stage => <tr key={stage.stage}><td>{label(stage.stage)}</td><td>{stage.count}</td><td>{currency(stage.value)}</td></tr>)}</tbody></table></div><p>Pipeline excludes won/lost leads. Unpaid invoices include sent, viewed and overdue records; drafts and void records are excluded.</p></section></>}
    <div className="live-tools"><Link className="secondary" href="/enquiries">Website enquiries</Link><Link className="secondary" href="/requests">Customer requests</Link><Link className="secondary" href="/analytics">Website analytics</Link></div>
  </div>;
}
