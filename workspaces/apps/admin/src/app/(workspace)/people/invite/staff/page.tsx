import Link from "next/link";
import type { Metadata } from "next";
import { requireAdmin } from "@muco/core/server";
import { Callout } from "@muco/ui";
import { InviteStaff } from "@/components/InviteStaff";

export const metadata: Metadata = { title: "Invite staff" };

// Widened on purpose: the three tabs compare against each other, and a literal
// type makes TypeScript call two of the three comparisons unreachable.
const KIND: string = "staff";

export default async function InviteStaffPage() {
  const { organizationId } = await requireAdmin();

  return (
    <div className="page">
      <div className="page-head">
        <span className="eyebrow">New person</span>
        <h1>Invite staff</h1>
        <p className="lede">
          Employees and contracted builders. The roles decide what they can be assigned;
          compensation is optional here and can be set later, but recording it now means it exists
          from their first day rather than from the first time somebody asks.
        </p>
      </div>

      <div className="tabs">
        <Link href="/people/invite/intern" aria-current={KIND === "intern" ? "page" : undefined}>Intern</Link>
        <Link href="/people/invite/staff" aria-current={KIND === "staff" ? "page" : undefined}>Staff</Link>
        <Link href="/people/invite/client" aria-current={KIND === "client" ? "page" : undefined}>Client</Link>
      </div>

      <section className="panel">
        <div className="panel-body">
          <InviteStaff organizationId={organizationId} />
        </div>
      </section>

      <Callout tone="info" icon="lock" title="Compensation is private from the moment it exists">
        Each person sees their own and nobody else&rsquo;s, including other employees. The policy on
        table is user_id = auth.uid(), and every view of it is written to the audit log.
      </Callout>
    </div>
  );
}
