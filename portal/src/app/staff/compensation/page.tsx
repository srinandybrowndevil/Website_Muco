import { requireStaff } from "@/lib/staff";
import { createClient } from "@/lib/supabase/server";
import { StaffShell } from "@/components/staff/StaffShell";
import { EmptyState } from "@/components/EmptyState";

const ENGAGEMENT: Record<string, string> = {
  retainer_monthly: "Monthly retainer",
  project_fee: "Project fee",
};

function money(amount: number, currency: string) {
  return new Intl.NumberFormat("en-IN", { style: "currency", currency, maximumFractionDigits: 0 })
    .format(amount);
}

function formatDate(value: string | null) {
  if (!value) return "—";
  return new Date(`${value}T00:00:00`).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });
}

export default async function CompensationPage() {
  await requireStaff();
  const client = await createClient();
  if (!client) throw new Error("Configure Supabase before opening compensation.");

  // Own rows only, enforced by policy rather than by this query. Specification
  // 13 asks for exactly that, and a filter here would mask the policy failing.
  const { data: rows, error } = await client.from("compensation")
    .select("id, engagement, amount, currency, cycle_label, status, effective_from, compensation_payments(id, amount, status, due_on, paid_on)")
    .order("effective_from", { ascending: false });

  return (
    <StaffShell>
      <div className="pagehead">
        <div>
          <p className="eyebrow">Staff</p>
          <h1>Your compensation.</h1>
          <p>This page shows your compensation. Other people cannot see it, and you cannot see theirs.</p>
        </div>
      </div>

      {error && <p className="error" role="alert">This could not be loaded. Refresh to try again.</p>}

      {!error && !rows?.length && (
        <section className="panel">
          <EmptyState icon="receipt" title="Nothing recorded yet"
            body="Your engagement and what you are paid for it appear here once the founder records them. If you have agreed terms and this stays empty, ask — it means the record has not been entered, not that the agreement is in doubt." />
        </section>
      )}

      {rows?.map(row => {
        const payments = (row.compensation_payments ?? []) as unknown as
          { id: string; amount: number; status: string; due_on: string | null; paid_on: string | null }[];
        return (
          <section className="panel" key={row.id}>
            <div className="panelhead">
              <h2>{ENGAGEMENT[row.engagement] ?? row.engagement}</h2>
              <span>{row.cycle_label ?? ""}</span>
            </div>
            <p className="compamount">{money(Number(row.amount), row.currency)}</p>
            <p>Effective from {formatDate(row.effective_from)} · {row.status}</p>

            {payments.length > 0 && (
              <div className="tablewrap">
                <table>
                  <caption className="visually-hidden">Payments against this engagement</caption>
                  <thead><tr><th scope="col">Amount</th><th scope="col">Due</th><th scope="col">Paid</th><th scope="col">Status</th></tr></thead>
                  <tbody>
                    {payments.map(payment => (
                      <tr key={payment.id}>
                        <td>{money(Number(payment.amount), row.currency)}</td>
                        <td>{formatDate(payment.due_on)}</td>
                        <td>{formatDate(payment.paid_on)}</td>
                        <td>{payment.status}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>
        );
      })}
    </StaffShell>
  );
}
