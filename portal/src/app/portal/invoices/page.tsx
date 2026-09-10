import { requireWorkspace } from "@/lib/workspace";
import { createClient } from "@/lib/supabase/server";
import { CustomerShell } from "@/components/portal/CustomerShell";
import { EmptyState } from "@/components/EmptyState";
import { WorkspaceLink as Link } from "@/components/WorkspaceHost";

// Checklist 7.6. The invoice detail page has always existed at
// /portal/invoices/<id>, and invoices are listed on the dashboard -- but
// /portal/invoices itself was not a route, so the address a person would guess,
// or bookmark after visiting one invoice, returned a 404. A parent path that
// 404s while its children work reads as a broken product rather than a
// deliberate design.

export const metadata = { title: "Your invoices" };

const STATUS: Record<string, string> = {
  draft: "Draft", sent: "Sent", viewed: "Viewed",
  paid: "Paid", overdue: "Overdue", void: "Cancelled",
};

function money(amount: number) {
  return new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 })
    .format(amount);
}

function formatDate(value: string | null) {
  if (!value) return "—";
  return new Date(value + "T00:00:00").toLocaleDateString("en-IN", {
    day: "numeric", month: "short", year: "numeric",
  });
}

export default async function CustomerInvoicesPage() {
  const { organizationId } = await requireWorkspace(true);
  const client = await createClient();
  if (!client) throw new Error("Configure Supabase before opening invoices.");

  // No customer filter. The policy already limits invoices to the customer
  // record this account is attached to, and filtering again here would hide a
  // policy regression rather than let a test catch it.
  const { data, error } = await client.from("invoices")
    .select("id, number, amount, status, issued_on, due_on, paid_at")
    .eq("organization_id", organizationId)
    .order("issued_on", { ascending: false, nullsFirst: false })
    .limit(200);

  const rows = data ?? [];
  const outstanding = rows
    .filter(row => row.status === "sent" || row.status === "viewed" || row.status === "overdue")
    .reduce((total, row) => total + Number(row.amount), 0);

  return (
    <CustomerShell>
      <div className="pagehead">
        <div>
          <p className="eyebrow">Your account</p>
          <h1>Your invoices.</h1>
          <p>Everything raised against your work, with what has been paid and what has not.</p>
        </div>
      </div>

      {error && <p className="error" role="alert">Your invoices could not be loaded. Refresh to try again.</p>}

      {outstanding > 0 && (
        <div className="tally">
          <div><b>{money(outstanding)}</b><small>Outstanding</small></div>
          <div><b>{rows.length}</b><small>Invoices in total</small></div>
        </div>
      )}

      <section className="panel">
        {rows.length === 0 ? (
          <EmptyState icon="receipt" title="No invoices yet"
            body="Invoices are raised against accepted work. Every one you receive stays here with its payment status, and you can open any of them to save a copy." />
        ) : (
          <div className="tablewrap">
            <table>
              <caption className="visually-hidden">Your invoices</caption>
              <thead>
                <tr>
                  <th scope="col">Invoice</th><th scope="col">Amount</th>
                  <th scope="col">Issued</th><th scope="col">Due</th>
                  <th scope="col">Status</th><th scope="col">Copy</th>
                </tr>
              </thead>
              <tbody>
                {rows.map(row => (
                  <tr key={row.id}>
                    <td className="mono">{row.number}</td>
                    <td className="mono">{money(Number(row.amount))}</td>
                    <td>{formatDate(row.issued_on)}</td>
                    <td>{formatDate(row.due_on)}</td>
                    <td>{STATUS[String(row.status)] ?? row.status}</td>
                    <td>
                      <Link className="secondary compact" href={"/portal/invoices/" + row.id}>
                        Open
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </CustomerShell>
  );
}
