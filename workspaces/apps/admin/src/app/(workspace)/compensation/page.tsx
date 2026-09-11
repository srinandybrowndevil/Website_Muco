import Link from "next/link";
import { redirect } from "next/navigation";
import type { Metadata } from "next";
import { recordAudit, requireAccount } from "@muco/core/server";
import { formatDate, formatMoney, humanise } from "@muco/core";
import { EmptyState, Icon, StatusPill } from "@muco/ui";

export const metadata: Metadata = { title: "Compensation" };

function one<T>(value: unknown): T | null {
  return ((Array.isArray(value) ? value[0] : value) ?? null) as T | null;
}

// What the studio pays, for staff only.
//
// A member runs the studio and does not see this. The database agrees — the
// policy admits an administrator or the person the row belongs to — so the
// redirect here decides what is drawn rather than what is permitted, and a
// member who guesses the URL is sent home rather than shown an empty table
// they will assume is a bug.
//
// Opening this writes an audit line naming who looked. Section 13 asks for
// compensation views to be audited, and this is the page where "a view" means
// everybody's at once.
export default async function CompensationPage() {
  const account = await requireAccount("admin");
  if (account.role !== "admin") redirect("/?denied=admin-only");

  const { supabase, organizationId } = account;

  const [rows, payments] = await Promise.all([
    supabase.from("compensation")
      .select("id,user_id,engagement,amount,currency,cycle_label,status,effective_from,effective_to,profiles(full_name)")
      .eq("organization_id", organizationId)
      .order("status", { ascending: true })
      .order("effective_from", { ascending: false }),
    supabase.from("compensation_payments")
      .select("id,compensation_id,amount,status,due_on,paid_on")
      .eq("organization_id", organizationId)
      .order("due_on", { ascending: false })
      .limit(60),
  ]);

  await recordAudit(supabase, "compensation.view_all", "organization", organizationId, {
    rows: (rows.data ?? []).length,
  });

  const active = (rows.data ?? []).filter(row => row.status === "active");
  const monthly = active
    .filter(row => row.engagement === "retainer_monthly")
    .reduce((total, row) => total + Number(row.amount ?? 0), 0);
  const projectFees = active
    .filter(row => row.engagement === "project_fee")
    .reduce((total, row) => total + Number(row.amount ?? 0), 0);

  const due = (payments.data ?? []).filter(payment => payment.status !== "paid");

  return (
    <div className="page">
      <div className="page-head">
        <span className="eyebrow">Administrators only</span>
        <h1>Compensation</h1>
        <p className="lede">
          What the studio pays, and when. Each person sees only their own row in their own
          workspace; this is the only page where they sit together, and opening it is recorded.
        </p>
      </div>

      <section className="grid">
        <div className="metric">
          <span className="k">Monthly retainers</span>
          <span className="v">{formatMoney(monthly)}</span>
          <span className="n">{active.filter(r => r.engagement === "retainer_monthly").length} people</span>
        </div>
        <div className="metric">
          <span className="k">Project fees, active</span>
          <span className="v">{formatMoney(projectFees)}</span>
          <span className="n">{active.filter(r => r.engagement === "project_fee").length} engagements</span>
        </div>
        <div className="metric" >
          <span className="k">Payments not yet paid</span>
          <span className="v">{due.length}</span>
          <span className="n">{formatMoney(due.reduce((t, p) => t + Number(p.amount ?? 0), 0))}</span>
        </div>
      </section>

      <section className="panel">
        <div className="panel-head">
          <h2>Records</h2>
          <span className="hint">{(rows.data ?? []).length}</span>
        </div>
        {(rows.data ?? []).length === 0 ? (
          <EmptyState icon="card" title="No compensation recorded">
            A record is created when a staff invitation carrying an engagement is accepted, or it
            can be added afterwards against the person.
          </EmptyState>
        ) : (
          <div className="tablewrap">
            <table>
              <caption className="sr-only">Compensation records</caption>
              <thead>
                <tr>
                  <th scope="col">Person</th>
                  <th scope="col">Engagement</th>
                  <th scope="col">From</th>
                  <th scope="col">To</th>
                  <th scope="col">Status</th>
                  <th scope="col" className="num">Amount</th>
                </tr>
              </thead>
              <tbody>
                {(rows.data ?? []).map(row => (
                  <tr key={row.id}>
                    <td>
                      <Link href={"/people/" + row.user_id}>
                        {one<{ full_name: string }>(row.profiles)?.full_name ?? "Unnamed"}
                      </Link>
                    </td>
                    <td>{humanise(row.engagement)}</td>
                    <td>{formatDate(row.effective_from)}</td>
                    <td>{row.effective_to ? formatDate(row.effective_to) : "Open"}</td>
                    <td><StatusPill value={row.status} /></td>
                    <td className="num tabular">{formatMoney(row.amount)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <p className="notice">
        <Icon name="shield" size={14} />
        <span>
          Interns do not appear here. Whether an internship carries a stipend is an open question in
          the specification, and inventing a studio policy for it is not this page&rsquo;s job.
        </span>
      </p>
    </div>
  );
}
