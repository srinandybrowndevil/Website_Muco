import { redirect } from "next/navigation";
import { AppShell } from "@/components/AppShell";
import { EmptyState } from "@/components/EmptyState";
import { requireWorkspace } from "@/lib/workspace";
import { createClient } from "@/lib/supabase/server";
import { recordView } from "@/lib/audit";
import { homeForRole } from "@/lib/auth";

// Checklist 6.10 and 6.18: what the studio pays, in one place, for the founder
// only.
//
// This is the one screen in the product that shows other people money, so two
// things are deliberate. It is administrator-only, not staff-only: a member is
// a weaker admin seat and 6.18 says a member does not see every salary unless
// the founder enabled it, which has not been enabled. And opening it is
// recorded, the same as reading your own -- an audit trail that exempts the
// person most able to read everything is not a trail.

export const metadata = { title: "Compensation" };

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
  return new Date(value + "T00:00:00").toLocaleDateString("en-IN", {
    day: "numeric", month: "short", year: "numeric",
  });
}

export default async function AdminCompensationPage() {
  const { organizationId, role } = await requireWorkspace();
  if (role !== "admin") redirect(homeForRole(role));
  await recordView("compensation.view", "compensation", null, { scope: "all staff" });

  const client = await createClient();
  if (!client) throw new Error("Configure Supabase before opening compensation.");

  const [rows, memberships] = await Promise.all([
    client.from("compensation")
      .select("id, user_id, engagement, amount, currency, cycle_label, status, effective_from, effective_to, compensation_payments(id, amount, status, due_on, paid_on)")
      .eq("organization_id", organizationId)
      .order("effective_from", { ascending: false }),
    client.from("memberships").select("user_id, profiles(full_name)")
      .eq("organization_id", organizationId),
  ]);

  const nameOf = new Map((memberships.data ?? []).map(row => [
    row.user_id as string,
    (row.profiles as unknown as { full_name: string | null } | null)?.full_name || "Name not set",
  ]));

  const active = (rows.data ?? []).filter(row => row.status === "active");
  const monthly = active
    .filter(row => row.engagement === "retainer_monthly")
    .reduce((total, row) => total + Number(row.amount), 0);

  const outstanding = (rows.data ?? []).flatMap(row =>
    ((row.compensation_payments ?? []) as unknown as
      { id: string; amount: number; status: string; due_on: string | null }[])
      .filter(payment => payment.status !== "paid")
      .map(payment => ({ ...payment, who: nameOf.get(row.user_id as string) ?? "Unknown" })));

  return (
    <AppShell>
      <div className="page">
        <div className="pagehead">
          <div>
            <p className="eyebrow">Workspace / Compensation</p>
            <h1>What the studio pays.</h1>
            <p>Everyone engaged, what they are on, and what is still owed. Opening this page is recorded.</p>
          </div>
        </div>

        {rows.error && (
          <div className="panel error" role="alert">
            Compensation could not be loaded. Refresh to try again.
          </div>
        )}

        <div className="tally">
          <div><b>{active.length}</b><small>Active engagements</small></div>
          <div><b>{monthly ? money(monthly, "INR") : "—"}</b><small>Monthly retainers</small></div>
          <div><b>{outstanding.length}</b><small>Payments not yet paid</small></div>
        </div>

        <section className="panel">
          <h2>Engagements</h2>
          {(rows.data ?? []).length === 0 ? (
            <EmptyState compact icon="receipt" title="Nothing recorded yet"
              body="An engagement appears here once you record one for somebody. Recording it is also what makes their own compensation page stop being empty." />
          ) : (
            <div className="tablewrap">
              <table>
                <caption className="visually-hidden">Compensation across the studio</caption>
                <thead>
                  <tr>
                    <th scope="col">Person</th><th scope="col">Engagement</th>
                    <th scope="col">Amount</th><th scope="col">Period</th>
                    <th scope="col">Status</th><th scope="col">From</th>
                  </tr>
                </thead>
                <tbody>
                  {(rows.data ?? []).map(row => (
                    <tr key={row.id}>
                      <td>{nameOf.get(row.user_id as string) ?? "Not in this workspace"}</td>
                      <td>{ENGAGEMENT[String(row.engagement)] ?? row.engagement}</td>
                      <td className="mono">{money(Number(row.amount), String(row.currency))}</td>
                      <td>{row.cycle_label || "—"}</td>
                      <td>{row.status}</td>
                      <td>{formatDate(row.effective_from as string)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>

        {outstanding.length > 0 && (
          <section className="panel">
            <h2>Owed</h2>
            <p className="muted">
              Every payment recorded against an engagement that has not been marked paid,
              soonest first. This is what somebody is waiting on.
            </p>
            <div className="tablewrap">
              <table>
                <caption className="visually-hidden">Payments not yet paid</caption>
                <thead>
                  <tr>
                    <th scope="col">Person</th><th scope="col">Amount</th>
                    <th scope="col">Due</th><th scope="col">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {outstanding
                    .sort((a, b) => String(a.due_on ?? "9999").localeCompare(String(b.due_on ?? "9999")))
                    .map(payment => (
                      <tr key={payment.id}>
                        <td>{payment.who}</td>
                        <td className="mono">{money(Number(payment.amount), "INR")}</td>
                        <td>{formatDate(payment.due_on)}</td>
                        <td>{payment.status}</td>
                      </tr>
                    ))}
                </tbody>
              </table>
            </div>
          </section>
        )}

        <p className="invoicedoc-note">
          Staff see their own engagement and nothing else. This page is the only place the
          amounts sit side by side, which is why reaching it is written to the audit log.
        </p>
      </div>
    </AppShell>
  );
}
