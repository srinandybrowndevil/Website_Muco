import Link from "next/link";
import type { Metadata } from "next";
import { requireAccount } from "@muco/core/server";
import { relativeDays } from "@muco/core";
import { EmptyState, Icon, StatusPill } from "@muco/ui";

export const metadata: Metadata = { title: "Requests" };

function one<T>(value: unknown): T | null {
  return ((Array.isArray(value) ? value[0] : value) ?? null) as T | null;
}

const FILTERS: [string, string][] = [
  ["new", "New"],
  ["reviewing", "Reviewing"],
  ["needs_info", "Needs information"],
  ["accepted", "Accepted"],
  ["declined", "Declined"],
  ["", "Everything"],
];

// What existing customers asked for from their own workspace.
//
// Different from an enquiry: the person is already a customer, so the request
// arrives attached to a company and a history rather than to a form.
export default async function RequestsPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string }>;
}) {
  const { status = "new" } = await searchParams;
  const { supabase, organizationId } = await requireAccount("admin");

  let query = supabase
    .from("project_requests")
    .select("id,title,service,status,timeline,created_at,converted_at,customers(company,name)")
    .eq("organization_id", organizationId)
    .order("created_at", { ascending: false })
    .limit(100);

  if (status) query = query.eq("status", status);

  const { data: requests } = await query;

  return (
    <div className="page">
      <div className="page-head">
        <span className="eyebrow">From customers</span>
        <h1>Requests</h1>
        <p className="lede">
          What customers asked for from their own workspace. Accepting one turns it into a lead and
          a project in a single transaction, so a converted request never leaves a half-made record.
        </p>
      </div>

      <div className="cluster">
        {FILTERS.map(([value, label]) => (
          <Link
            className="chip"
            key={value || "all"}
            href={value ? "/requests?status=" + value : "/requests?status="}
            aria-current={status === value ? "true" : undefined}
          >
            {label}
          </Link>
        ))}
      </div>

      <section className="panel">
        <div className="panel-head"><h2>{(requests ?? []).length} shown</h2></div>
        {(requests ?? []).length === 0 ? (
          <EmptyState icon="fileText" title="Nothing here">
            {status === "new"
              ? "No unopened requests. Customers write these from the support page in their workspace."
              : "Nothing with that status."}
          </EmptyState>
        ) : (
          <div className="list">
            {(requests ?? []).map(request => (
              <Link className="item" href={"/requests/" + request.id} key={request.id}>
                <span className="item-main">
                  <b>{request.title}</b>
                  <small>
                    {one<{ company: string; name: string }>(request.customers)?.company ??
                      one<{ company: string; name: string }>(request.customers)?.name ??
                      "Unknown customer"}
                    {" · "}{request.service}
                    {" · "}{relativeDays(request.created_at)}
                  </small>
                </span>
                <StatusPill value={request.status} />
                <Icon name="chevronRight" size={15} />
              </Link>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
