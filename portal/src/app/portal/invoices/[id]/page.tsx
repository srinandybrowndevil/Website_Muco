import { WorkspaceLink as Link } from "@/components/WorkspaceHost";
import { notFound } from "next/navigation";
import { CustomerShell } from "@/components/portal/CustomerShell";
import { PrintButton } from "@/components/portal/PrintButton";
import { createClient } from "@/lib/supabase/server";
import { requireWorkspace } from "@/lib/workspace";
import { currency } from "@/lib/crm";

// A customer needs a copy of what they owe that survives leaving the page.
//
// This is a payment record, not a GST tax invoice, and it says so. The database
// holds a number, an amount, dates and a status -- there is no GSTIN, no place
// of supply, no HSN or SAC code, no tax breakdown and no line items, so a
// document dressed up as a tax invoice would be a fiction. The workspace
// already takes that position where invoices are edited ("use your accounting
// system to issue tax invoices"); this page keeps to it.
//
// Saving happens through the browser's own print-to-PDF rather than a PDF
// library. It renders the same document the customer is looking at, needs no
// dependency, and works on a phone.

const STATUS_TEXT: Record<string, string> = {
  draft: "Draft",
  sent: "Sent",
  paid: "Paid",
  overdue: "Overdue",
  void: "Void",
};

function formatDate(value: string | null) {
  if (!value) return "—";
  return new Date(`${value}T00:00:00`).toLocaleDateString("en-IN", {
    day: "numeric", month: "long", year: "numeric",
  });
}

export default async function InvoicePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  await requireWorkspace(true);

  const supabase = await createClient();
  if (!supabase) throw new Error("Configure Supabase before opening an invoice.");

  // No customer filter here on purpose: row level security already limits this
  // to the signed-in customer's own invoices. Adding a second filter in the
  // query would hide a policy regression rather than surface it.
  const { data: invoice, error } = await supabase
    .from("invoices")
    .select("number, amount, status, issued_on, due_on, paid_at, customers(name, company, email, phone), projects(name)")
    .eq("id", id)
    .maybeSingle();

  if (error) throw new Error("This invoice could not be loaded. Refresh and try again.");
  if (!invoice) notFound();

  const customer = invoice.customers as unknown as
    { name: string | null; company: string | null; email: string | null; phone: string | null } | null;
  const project = invoice.projects as unknown as { name: string | null } | null;
  const status = STATUS_TEXT[String(invoice.status)] ?? String(invoice.status);

  return (
    <CustomerShell>
      <div className="pagehead invoice-actions">
        <div>
          <p className="eyebrow">Billing / {invoice.number}</p>
          <h1>Payment record</h1>
        </div>
        <PrintButton />
      </div>

      <article className="invoicedoc panel">
        <header>
          <div>
            <b>MUCO LABS</b>
            <span>Erode, Tamil Nadu, India</span>
            <span>founder@mucolabs.com · +91 6381809844</span>
          </div>
          <div className="invoicedoc-ref">
            <span className="eyebrow">Record</span>
            <b>{invoice.number}</b>
            <em className={`status ${invoice.status === "paid" ? "good" : invoice.status === "overdue" ? "bad" : ""}`}>{status}</em>
          </div>
        </header>

        <div className="invoicedoc-parties">
          <div>
            <span className="eyebrow">Billed to</span>
            <b>{customer?.company || customer?.name || "—"}</b>
            {customer?.company && customer?.name && <span>{customer.name}</span>}
            {customer?.email && <span>{customer.email}</span>}
            {customer?.phone && <span>{customer.phone}</span>}
          </div>
          <div>
            <span className="eyebrow">Dates</span>
            <span>Issued {formatDate(invoice.issued_on)}</span>
            <span>Due {formatDate(invoice.due_on)}</span>
            {invoice.paid_at && <span>Paid {new Date(invoice.paid_at).toLocaleDateString("en-IN", { day: "numeric", month: "long", year: "numeric" })}</span>}
          </div>
        </div>

        <table className="invoicedoc-lines">
          <caption className="visually-hidden">What this record covers</caption>
          <thead>
            <tr><th scope="col">Description</th><th scope="col" className="right">Amount</th></tr>
          </thead>
          <tbody>
            <tr>
              <td>{project?.name ? `Project — ${project.name}` : "Agreed project work"}</td>
              <td className="right">{currency(invoice.amount)}</td>
            </tr>
          </tbody>
          <tfoot>
            <tr><th scope="row">Total</th><td className="right"><b>{currency(invoice.amount)}</b></td></tr>
          </tfoot>
        </table>

        <footer>
          <p>
            Payment terms are as agreed in your written scope &mdash; normally 50% in advance
            and 50% on completion, or the milestone split named in your proposal.
          </p>
          <p className="invoicedoc-note">
            This is a payment record for your reference, not a GST tax invoice. Ask us if
            you need a tax invoice for accounting; it is issued separately.
          </p>
        </footer>
      </article>

      <p className="invoicedoc-back"><Link href="/portal">Back to your workspace</Link></p>
    </CustomerShell>
  );
}
