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

  const { data: requests, error } = await query;

  return (
    <div className="page">
      <div className="page-head">
        <span className="eyebrow">From customers</span>
        <h1>Requests</h1>
        <p className="lede">
          Project briefs and support requests from customers. Review a request, mark it accepted,
          then use Create the lead and project to open the work in one step.
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
        {error ? <p role="alert" className="panel-body errortext">Requests could not be loaded. Refresh to retry; your saved requests have not been removed.</p> : (requests ?? []).length === 0 ? (
          <EmptyState icon="fileText" title="Nothing here">
            {status === "new"
              ? "No unopened requests. Customers send project briefs from Start a project and questions from Support."
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
