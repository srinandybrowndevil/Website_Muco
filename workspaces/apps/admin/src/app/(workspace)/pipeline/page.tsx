import type { Metadata } from "next";
import Link from "next/link";
import { requireAccount } from "@muco/core/server";
import { formatMoney, humanise, relativeDays } from "@muco/core";
import { EmptyState, Icon, StatusPill } from "@muco/ui";

export const metadata: Metadata = { title: "Pipeline" };

const STAGES: [string, string][] = [
  ["new", "New"],
  ["qualified", "Qualified"],
  ["proposal", "Proposal sent"],
  ["negotiation", "Negotiating"],
  ["won", "Won"],
  ["lost", "Lost"],
];

// Leads, as a list rather than a board.
//
// A board is the obvious shape and the wrong one here. The studio has a
// handful of leads at a time, a board makes each one a card you have to open,
// and dragging is the one interaction that does not work on the phone this is
// most often read on. A list ordered by stage answers the same question in one
// screen.
export default async function PipelinePage({ searchParams }: { searchParams: Promise<{ page?: string }> }) {
  const { supabase, organizationId } = await requireAccount("admin");
  const requestedPage = Number((await searchParams).page);
  const page = Number.isSafeInteger(requestedPage) && requestedPage > 0 ? requestedPage : 1;
  const pageSize = 30;

  const { data: leads, error, count } = await supabase
    .from("leads")
    .select("id,name,company,email,source,stage,estimated_value,last_contact_at,created_at", { count: "exact" })
    .eq("organization_id", organizationId)
    .order("created_at", { ascending: false })
    .order("id", { ascending: false })
    .range((page - 1) * pageSize, page * pageSize - 1);

  if (error) return <div className="page"><h1>Pipeline</h1><p role="alert" className="callout warn">The pipeline could not be loaded. Refresh to retry; this does not mean your leads are empty.</p><Link href="/pipeline">Retry pipeline</Link></div>;

  const rows = leads ?? [];
  const open = rows.filter(row => !["won", "lost"].includes(row.stage as string));
  const value = open.reduce((total, row) => total + Number(row.estimated_value ?? 0), 0);
  const won = rows.filter(row => row.stage === "won");

  return (
    <div className="page">
      <div className="page-head">
        <span className="eyebrow">Work that might happen</span>
        <h1>Pipeline</h1>
        <p className="lede">
          Open a lead to record contact, update its stage and track an estimated value. Review new enquiries and customer briefs before moving them into the pipeline.
        </p>
      </div>
      <div className="cluster"><Link className="btn sm" href="/requests">Customer requests</Link><Link className="btn sm" href="/enquiries">Website enquiries</Link></div>
      <p className="hint">{count ?? 0} leads in total · Page {page}. Figures below describe the leads on this page.</p>

      <section className="grid">
        <div className="metric">
          <span className="k">Open leads</span>
          <span className="v">{open.length}</span>
        </div>
        <div className="metric">
          <span className="k">Estimated value, open</span>
          <span className="v">{formatMoney(value)}</span>
          <span className="n">An estimate, not a quote</span>
        </div>
        <div className="metric">
          <span className="k">Won</span>
          <span className="v">{won.length}</span>
        </div>
      </section>

      {STAGES.map(([stage, label]) => {
        const inStage = rows.filter(row => row.stage === stage);
        if (inStage.length === 0) return null;
        return (
          <section className="panel" key={stage}>
            <div className="panel-head">
              <h2>{label}</h2>
              <span className="hint">{inStage.length}</span>
            </div>
            <div className="list">
              {inStage.map(lead => (
                <Link className="item" key={lead.id} href={`/pipeline/${lead.id}`}>
                  <span className="item-main">
                    <b>{lead.company || lead.name}</b>
                    <small>
                      {lead.name}
                      {lead.email ? " · " + lead.email : ""}
                      {lead.source ? " · from " + lead.source : ""}
                    </small>
                  </span>
                  <span className="hint">
                    {lead.last_contact_at ? "Last contact " + relativeDays(lead.last_contact_at) : "No contact logged"}
                  </span>
                  {lead.estimated_value ? (
                    <span className="tabular">{formatMoney(lead.estimated_value)}</span>
                  ) : null}
                  <StatusPill value={lead.stage} label={humanise(lead.stage)} />
                </Link>
              ))}
            </div>
          </section>
        );
      })}

      {rows.length === 0 ? (
        <EmptyState icon="target" title={page > 1 ? "No leads on this page" : "No leads yet"}>
          A lead is created by converting an enquiry from the website or a request from a customer.
          Neither is created by hand, so this list is always traceable to something that arrived.
        </EmptyState>
      ) : null}
      <nav className="cluster" aria-label="Pipeline pages">
        {page > 1 ? <Link className="btn sm" href={`/pipeline?page=${page - 1}`}>Previous page</Link> : null}
        {page * pageSize < (count ?? 0) ? <Link className="btn sm" href={`/pipeline?page=${page + 1}`}>Next page</Link> : null}
      </nav>

      <p className="notice">
        <Icon name="info" size={14} />
        <span>
          Estimated value is a working figure, not a quote. Nothing a customer sees is derived from
          it, and no invoice is raised from it.
        </span>
      </p>
    </div>
  );
}
