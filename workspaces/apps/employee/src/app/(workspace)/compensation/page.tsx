import type { Metadata } from "next";
import { requireAccount, recordAudit } from "@muco/core/server";
import { formatDate, formatMoney, humanise } from "@muco/core";
import { EmptyState, Fact, Facts, Icon, StatusPill } from "@muco/ui";

export const metadata: Metadata = { title: "My compensation" };

const ENGAGEMENT: Record<string, string> = {
  retainer_monthly: "Monthly retainer",
  project_fee: "Per-project fee",
};

// Your own row, and only your own.
//
// The filter below is not what makes that true. The policy on this table is
// user_id = auth.uid(), so removing the filter would change nothing about what
// comes back — which is the property worth having, because a page is not a
// boundary and this is the table where that matters most.
//
// Opening this page writes an audit line. The specification asks for
// compensation views to be audited, and the honest reading of that is every
// view including your own: a log that records only other people's access
// cannot show that nobody else looked.
export default async function CompensationPage() {
  const { supabase, userId, organizationId } = await requireAccount("employee");

  const { data: rows } = await supabase
    .from("compensation")
    .select("id,engagement,amount,currency,cycle_label,status,effective_from,effective_to")
    .eq("user_id", userId)
    .order("effective_from", { ascending: false });

  const current = (rows ?? []).find(row => row.status === "active") ?? (rows ?? [])[0] ?? null;

  const { data: payments } = current
    ? await supabase
        .from("compensation_payments")
        .select("id,amount,status,due_on,paid_on,reference")
        .eq("compensation_id", current.id)
        .order("due_on", { ascending: false })
        .limit(24)
    : { data: [] };

  await recordAudit(supabase, "compensation.view", "compensation", current?.id ?? null, {
    organization_id: organizationId,
  });

  return (
    <div className="page">
      <div className="page-head">
        <span className="eyebrow">Yours alone</span>
        <h1>My compensation</h1>
        <p className="lede">
          This page shows your compensation. Other people cannot see it, including other employees,
          and the studio records every time it is opened — including by you.
        </p>
      </div>

      {!current ? (
        <EmptyState icon="card" title="No compensation record yet">
          Your engagement and amount are set by the studio when your contract starts. If you have
          started and this is empty, say so — an unset record is a mistake, not a policy.
        </EmptyState>
      ) : (
        <>
          <section className="panel">
            <div className="payfigure">
              <span className="eyebrow">{ENGAGEMENT[current.engagement] ?? humanise(current.engagement)}</span>
              <span className="amount">{formatMoney(current.amount)}</span>
              <span className="cycle">
                {current.cycle_label ?? (current.engagement === "retainer_monthly" ? "per month" : "for the project")}
                {" · "}
                <StatusPill value={current.status} />
              </span>
            </div>
            <div className="panel-body">
              <Facts>
                <Fact label="Currency">{current.currency}</Fact>
                <Fact label="Effective from">{formatDate(current.effective_from)}</Fact>
                <Fact label="Effective to">
                  {current.effective_to ? formatDate(current.effective_to) : "Open-ended"}
                </Fact>
              </Facts>
            </div>
          </section>

          <section className="panel">
            <div className="panel-head">
              <h2>Payments</h2>
              <span className="hint">{(payments ?? []).length} recorded</span>
            </div>
            {(payments ?? []).length === 0 ? (
              <EmptyState icon="receipt" title="No payments recorded against this yet" />
            ) : (
              <div className="tablewrap">
                <table>
                  <caption className="sr-only">Payments against your compensation</caption>
                  <thead>
                    <tr>
                      <th scope="col">Due</th>
                      <th scope="col">Status</th>
                      <th scope="col">Paid</th>
                      <th scope="col">Reference</th>
                      <th scope="col" className="num">Amount</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(payments ?? []).map(payment => (
                      <tr key={payment.id}>
                        <td>{formatDate(payment.due_on)}</td>
                        <td><StatusPill value={payment.status} /></td>
                        <td>{payment.paid_on ? formatDate(payment.paid_on) : "—"}</td>
                        <td className="mono">{payment.reference ?? "—"}</td>
                        <td className="num tabular">{formatMoney(payment.amount)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>
        </>
      )}

      {(rows ?? []).length > 1 ? (
        <section className="panel">
          <div className="panel-head"><h2>Earlier records</h2></div>
          <div className="list">
            {(rows ?? []).filter(row => row.id !== current?.id).map(row => (
              <div className="item" key={row.id}>
                <span className="item-main">
                  <b>{formatMoney(row.amount)} · {ENGAGEMENT[row.engagement] ?? humanise(row.engagement)}</b>
                  <small>
                    {formatDate(row.effective_from)} to{" "}
                    {row.effective_to ? formatDate(row.effective_to) : "open"}
                  </small>
                </span>
                <StatusPill value={row.status} />
              </div>
            ))}
          </div>
        </section>
      ) : null}

      <p className="notice">
        <Icon name="shield" size={14} />
        <span>
          If a figure here is wrong, it is wrong in the studio&rsquo;s records too — this page shows
          the record rather than a copy of it. Raise it with the studio and it gets corrected at the
          source.
        </span>
      </p>
    </div>
  );
}
