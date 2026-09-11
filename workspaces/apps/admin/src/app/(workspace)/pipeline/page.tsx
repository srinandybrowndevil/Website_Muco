import type { Metadata } from "next";
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
export default async function PipelinePage() {
  const { supabase, organizationId } = await requireAccount("admin");

  const { data: leads } = await supabase
    .from("leads")
    .select("id,name,company,email,source,stage,estimated_value,last_contact_at,created_at")
    .eq("organization_id", organizationId)
    .order("created_at", { ascending: false })
    .limit(150);

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
          Leads created from enquiries and customer requests. A list rather than a board: the studio
          has a handful at a time, and dragging cards is the one interaction that does not work on a
          phone.
        </p>
      </div>

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
                <div className="item" key={lead.id}>
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
                </div>
              ))}
            </div>
          </section>
        );
      })}

      {rows.length === 0 ? (
        <EmptyState icon="target" title="No leads yet">
          A lead is created by converting an enquiry from the website or a request from a customer.
          Neither is created by hand, so this list is always traceable to something that arrived.
        </EmptyState>
      ) : null}

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
