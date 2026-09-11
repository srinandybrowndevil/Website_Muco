import type { Metadata } from "next";
import { requireAdmin } from "@muco/core/server";
import { Callout } from "@muco/ui";
import { InviteClient } from "@/components/InviteClient";

export const metadata: Metadata = { title: "Invite a client" };

// Widened on purpose: the three tabs compare against each other, and a literal
// type makes TypeScript call two of the three comparisons unreachable.
const KIND: string = "client";

export default async function InviteClientPage() {
  const { supabase, organizationId } = await requireAdmin();

  const { data: customers } = await supabase
    .from("customers")
    .select("id,name,company,auth_user_id")
    .eq("organization_id", organizationId)
    .order("company", { ascending: true });

  const options = (customers ?? []).map(row => ({
    id: row.id as string,
    label: (row.company as string) || (row.name as string),
    hasOwner: !!row.auth_user_id,
  }));

  return (
    <div className="page">
      <div className="page-head">
        <span className="eyebrow">New person</span>
        <h1>Invite a client</h1>
        <p className="lede">
          A client account belongs to a company, so pick one or create it here. The first person to
          accept becomes the owner of that company and can add their own colleagues afterwards
          without coming back to you.
        </p>
      </div>

      <div className="tabs">
        <a href="/people/invite/intern" aria-current={KIND === "intern" ? "page" : undefined}>Intern</a>
        <a href="/people/invite/staff" aria-current={KIND === "staff" ? "page" : undefined}>Staff</a>
        <a href="/people/invite/client" aria-current={KIND === "client" ? "page" : undefined}>Client</a>
      </div>

      <section className="panel">
        <div className="panel-body">
          <InviteClient organizationId={organizationId} customers={options} />
        </div>
      </section>

      <Callout tone="info" icon="shield" title="What a client will and will not see">
        Their own project, scope, milestones, files marked as documents, previews and invoices.
        Not studio internals, not other clients, and not source code before handover.
      </Callout>
    </div>
  );
}
