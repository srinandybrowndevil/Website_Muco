"use client";
import Link from "next/link";
import { useCallback } from "react";
import { createClient } from "@/lib/supabase/client";
import { CrmRow, currency, label } from "@/lib/crm";
import { useLiveQuery } from "@/lib/use-live-query";
import { EmptyState } from "../EmptyState";
import { LiveFiles } from "./LiveFiles";

const SECTIONS = [
  {
    heading: "Projects",
    icon: "briefcase",
    title: "No project running yet",
    body: "Once we accept a request and start building, the project appears here with its progress so you can see where it stands without asking.",
  },
  {
    heading: "Proposals",
    icon: "file",
    title: "No proposal yet",
    body: "After we understand your scope we send a written proposal with what is included and what it costs. It lands here for you to read and keep.",
  },
  {
    heading: "Invoices",
    icon: "receipt",
    title: "No invoice yet",
    body: "Invoices are raised against accepted work. Every one you receive stays here with its payment status.",
  },
];

export function LiveCustomer({ organizationId }: { organizationId: string }) {
  const load = useCallback(async () => {
    const client = createClient()!;
    const results = await Promise.all(["projects", "proposals", "invoices"].map(table => client.from(table).select("*").eq("organization_id", organizationId).order("created_at", { ascending: false }).limit(100)));
    for (const result of results) if (result.error) throw new Error(result.error.message);
    return results.map(result => (result.data ?? []) as CrmRow[]);
  }, [organizationId]);
  const state = useLiveQuery("projects,proposals,invoices", load, organizationId);

  // A brand new account has all three sections empty. Repeating "nothing here"
  // three times says nothing useful; one welcome that explains how the whole
  // thing starts, and points at the single action that starts it, does.
  const brandNew = state.data?.every(rows => rows.length === 0) ?? false;

  return <><div className="pagehead"><div><h1>Your project workspace.</h1><p>Delivery progress and documents shared with your account.</p></div><Link className="primary" href="/portal/requests/new">New request</Link></div>
    {state.error && <p className="error" role="alert">{state.error}</p>}{state.loading && <p role="status">Loading your projects…</p>}

    {state.data && brandNew && (
      <section className="panel">
        <EmptyState
          icon="bolt"
          title="Everything starts with one request."
          body="Tell us what you want to build. We read it ourselves, come back with questions and a written scope, and from then on your project, proposal, invoices and files all live on this page."
          action={{ label: "Submit your first request", href: "/portal/requests/new" }}
          secondary={{ label: "Talk to us first", href: "/portal/contact" }}
          note="No obligation. If we are not the right people for it, we will tell you that instead of taking the project."
        />
      </section>
    )}

    {state.data && !brandNew && state.data.map((rows, index) => <section className="panel" id={index === 0 ? "projects" : undefined} key={index}><h2>{SECTIONS[index].heading}</h2>{!rows.length && <EmptyState compact icon={SECTIONS[index].icon} title={SECTIONS[index].title} body={SECTIONS[index].body} />}{rows.length === 100 && <p>Showing the latest 100 records.</p>}{rows.map(row => <article className="portalf" key={row.id}><div><b>{String(row.name ?? row.title ?? row.number)}</b><small>{label(row.status)}{index > 0 ? ` · ${currency(row.amount)}` : ` · ${Number(row.progress)}% complete`}</small>{index === 0 && <progress value={Number(row.progress)} max={100} aria-label={`${String(row.name)} progress`} />}</div></article>)}</section>)}

    <LiveFiles organizationId={organizationId} customer />
  </>;
}
