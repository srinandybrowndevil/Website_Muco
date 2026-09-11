import type { Metadata } from "next";
import { requireAccount } from "@muco/core/server";
import { formatDate, formatMoney, isPast, relativeDays } from "@muco/core";
import { Callout, EmptyState, Icon, StatusPill } from "@muco/ui";
import { loadCustomer } from "@/lib/project";

export const metadata: Metadata = { title: "Billing" };

// Money, stated plainly and without a sales voice.
//
// Three figures at the top because those are the three questions: what is
// outstanding, what is overdue, what has been paid. The table underneath is
// the evidence for them rather than a replacement for them.
export default async function BillingPage() {
  const { supabase, userId } = await requireAccount("client");
  const customer = await loadCustomer(supabase, userId);
  if (!customer) return <div className="page"><EmptyState icon="building" title="Your organisation is not linked yet" /></div>;

  const { data: invoices } = await supabase
    .from("invoices")
    .select("id,number,amount,status,issued_on,due_on,paid_at,project_id,projects(name)")
    .eq("customer_id", customer.id)
    .order("issued_on", { ascending: false });

  const rows = invoices ?? [];
  const sum = (list: typeof rows) => list.reduce((total, row) => total + Number(row.amount ?? 0), 0);
  const open = rows.filter(row => ["sent", "viewed", "overdue"].includes(row.status));
  const overdue = rows.filter(row => row.status === "overdue" || (row.status !== "paid" && row.status !== "void" && isPast(row.due_on)));
  const paid = rows.filter(row => row.status === "paid");

  return (
    <div className="page">
      <div className="page-head">
        <span className="eyebrow">What is owed, and what is settled</span>
        <h1>Billing</h1>
        <p className="lede">
          Work is quoted from a written scope and billed 50% on start and 50% on completion, as
          published. Nothing on this page is a new charge — every line here came from a quote you
          agreed.
        </p>
      </div>

      <section className="panel">
        <div className="paidstrip">
          <span className="figure">
            <b>{formatMoney(sum(open))}</b>
            <span>Outstanding</span>
          </span>
          <span className="figure">
            <b>{overdue.length === 0 ? formatMoney(0) : formatMoney(sum(overdue))}</b>
            <span>Overdue</span>
          </span>
          <span className="figure">
            <b>{formatMoney(sum(paid))}</b>
            <span>Paid to date</span>
          </span>
        </div>

        {rows.length === 0 ? (
          <EmptyState icon="receipt" title="No invoices yet">
            The first invoice is raised when a project starts, for the first half of the agreed fee.
          </EmptyState>
        ) : (
          <div className="tablewrap">
            <table>
              <caption className="sr-only">Your invoices</caption>
              <thead>
                <tr>
                  <th scope="col">Invoice</th>
                  <th scope="col">Project</th>
                  <th scope="col">Issued</th>
                  <th scope="col">Due</th>
                  <th scope="col">Status</th>
                  <th scope="col" className="num">Amount</th>
                </tr>
              </thead>
              <tbody>
                {rows.map(row => {
                  const project = Array.isArray(row.projects) ? row.projects[0] : row.projects;
                  return (
                    <tr key={row.id}>
                      <td className="mono">{row.number}</td>
                      <td>{(project as { name?: string } | null)?.name ?? "—"}</td>
                      <td>{formatDate(row.issued_on)}</td>
                      <td>
                        {row.due_on ? formatDate(row.due_on) : "—"}
                        {row.due_on && row.status !== "paid" && row.status !== "void" ? (
                          <small className="hint"> · {relativeDays(row.due_on)}</small>
                        ) : null}
                      </td>
                      <td><StatusPill value={row.status} /></td>
                      <td className="num tabular">{formatMoney(row.amount)}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {overdue.length > 0 ? (
        <Callout tone="warn" icon="alert" title="Something is past its due date">
          If it has already been paid, tell support with the reference and the studio will correct
          the record. If it has not, work usually continues while it is sorted — nobody switches a
          project off over a late invoice without speaking to you first.
        </Callout>
      ) : null}

      <p className="notice">
        <Icon name="info" size={14} />
        <span>
          Payment methods and bank details are not shown here on purpose. They are on the invoice
          itself, and an address on a web page is easier to tamper with than one on a document.
        </span>
      </p>
    </div>
  );
}
