"use client";
import Link from "next/link";
import { useCallback } from "react";
import { createClient } from "@/lib/supabase/client";
import { CrmRow, currency, label } from "@/lib/crm";
import { useLiveQuery } from "@/lib/use-live-query";
import { LiveFiles } from "./LiveFiles";

export function LiveCustomer({ organizationId }: { organizationId: string }) {
  const load = useCallback(async () => {
    const client = createClient()!;
    const results = await Promise.all(["projects", "proposals", "invoices"].map(table => client.from(table).select("*").eq("organization_id", organizationId).order("created_at", { ascending: false }).limit(100)));
    for (const result of results) if (result.error) throw new Error(result.error.message);
    return results.map(result => (result.data ?? []) as CrmRow[]);
  }, [organizationId]);
  const state = useLiveQuery("projects,proposals,invoices", load, organizationId);
  return <><div className="pagehead"><div><h1>Your project workspace.</h1><p>Delivery progress and documents shared with your account.</p></div><Link className="primary" href="/portal/requests/new">New request</Link></div>
    {state.error && <p className="error" role="alert">{state.error}</p>}{state.loading && <p role="status">Loading your projects…</p>}
    {state.data?.map((rows, index) => <section className="panel" key={index}><h2>{["Projects", "Proposals", "Invoices"][index]}</h2>{!rows.length && <p>Nothing shared yet.</p>}{rows.length === 100 && <p>Showing the latest 100 records.</p>}{rows.map(row => <article className="portalf" key={row.id}><div><b>{String(row.name ?? row.title ?? row.number)}</b><small>{label(row.status)}{index > 0 ? ` · ${currency(row.amount)}` : ` · ${Number(row.progress)}% complete`}</small>{index === 0 && <progress value={Number(row.progress)} max={100} aria-label={`${String(row.name)} progress`} />}</div></article>)}</section>)}
    <LiveFiles organizationId={organizationId} customer />
  </>;
}
