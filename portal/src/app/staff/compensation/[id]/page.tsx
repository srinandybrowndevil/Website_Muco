import { notFound } from "next/navigation";
import { requireStaff } from "@/lib/staff";
import { recordView } from "@/lib/audit";
import { createClient } from "@/lib/supabase/server";
import { readSettings } from "@/lib/settings";
import { PrintButton } from "@/components/portal/PrintButton";

// Checklist 4.4: a payment advice you can keep.
//
// Not called a payslip. A payslip implies employment, deductions and a payroll
// this studio does not run, and most of the people paid through here are on a
// project fee rather than a salary. What this is, honestly, is a record of one
// payment against one engagement -- which is the thing somebody actually needs
// when a landlord or a bank asks.
//
// Rendered as a page and printed, the same way invoices and certificates work
// here, so there is one way to produce a document rather than three.

export const metadata = { title: "Payment advice" };

const ENGAGEMENT: Record<string, string> = {
  retainer_monthly: "Monthly retainer",
  project_fee: "Project fee",
};

function money(amount: number, currency: string) {
  return new Intl.NumberFormat("en-IN", { style: "currency", currency, maximumFractionDigits: 2 })
    .format(amount);
}

function formatDate(value: string | null) {
  if (!value) return "—";
  return new Date(`${value}T00:00:00`).toLocaleDateString("en-IN", {
    day: "numeric", month: "long", year: "numeric",
  });
}

export default async function PaymentAdvicePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { userId, organizationId } = await requireStaff();
  await recordView("compensation.view", "compensation_payment", id);

  const client = await createClient();
  if (!client) throw new Error("Configure Supabase before opening a payment advice.");

  // No user filter: the payments policy already restricts these rows to
  // engagements belonging to the signed-in person. Somebody else's payment id
  // returns nothing and this page becomes a 404, which is the right answer --
  // a refusal message would confirm the payment exists.
  const [payment, me, org, settings] = await Promise.all([
    client.from("compensation_payments")
      .select("id, amount, status, due_on, paid_on, reference, compensation(engagement, currency, cycle_label)")
      .eq("id", id).maybeSingle(),
    client.from("profiles").select("full_name").eq("id", userId).maybeSingle(),
    client.from("organizations").select("name").eq("id", organizationId).maybeSingle(),
    readSettings(organizationId),
  ]);

  if (!payment.data) notFound();
  const engagement = payment.data.compensation as unknown as
    { engagement: string; currency: string; cycle_label: string | null } | null;
  const currency = engagement?.currency ?? "INR";

  return (
    <main className="invoicedoc">
      <div className="invoicedoc-actions">
        <PrintButton />
      </div>

      <article className="invoicedoc-sheet">
        <header>
          <p className="eyebrow">Payment advice</p>
          <h1>{org.data?.name ?? "MUCO LABS"}</h1>
        </header>

        <dl className="detaillist">
          <div><dt>Paid to</dt><dd>{me.data?.full_name || "Name not set"}</dd></div>
          <div><dt>Engagement</dt><dd>{ENGAGEMENT[String(engagement?.engagement)] ?? engagement?.engagement ?? "—"}</dd></div>
          {engagement?.cycle_label && <div><dt>Period</dt><dd>{engagement.cycle_label}</dd></div>}
          <div><dt>Amount</dt><dd>{money(Number(payment.data.amount), currency)}</dd></div>
          <div><dt>Status</dt><dd>{payment.data.status}</dd></div>
          <div><dt>Due</dt><dd>{formatDate(payment.data.due_on)}</dd></div>
          <div><dt>Paid</dt><dd>{formatDate(payment.data.paid_on)}</dd></div>
          {payment.data.reference && <div><dt>Reference</dt><dd>{payment.data.reference}</dd></div>}
        </dl>

        <p className="invoicedoc-note">
          This is a record of one payment against one engagement. It is not a payslip: no
          statutory deductions are made or implied, and it does not by itself establish
          employment.
        </p>

        {settings.supportEmail && (
          <p className="invoicedoc-note">
            Something wrong here? Write to {settings.supportEmail} rather than assuming it
            corrects itself.
          </p>
        )}
      </article>
    </main>
  );
}
