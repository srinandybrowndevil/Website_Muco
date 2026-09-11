import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { requireAccount } from "@muco/core/server";
import { formatDateTime } from "@muco/core";
import { Callout, Fact, Facts, Icon, StatusPill } from "@muco/ui";
import { Convert } from "@/components/Convert";
import { RequestStatus } from "@/components/RequestStatus";

export const metadata: Metadata = { title: "Request" };

function one<T>(value: unknown): T | null {
  return ((Array.isArray(value) ? value[0] : value) ?? null) as T | null;
}

export default async function RequestPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { supabase, organizationId, role } = await requireAccount("admin");

  const { data: request } = await supabase
    .from("project_requests")
    .select("id,title,service,status,problem,requirements,budget_range,timeline,website,reference,contact_preference,created_at,converted_at,converted_project_id,customer_id,customers(id,company,name,email,phone)")
    .eq("organization_id", organizationId)
    .eq("id", id)
    .maybeSingle();

  if (!request) notFound();

  const customer = one<{ id: string; company: string; name: string; email: string; phone: string }>(
    request.customers,
  );

  return (
    <div className="page">
      <div className="page-head">
        <Link className="hint" href="/requests"><Icon name="arrowLeft" size={13} /> All requests</Link>
        <div className="split">
          <h1>{request.title}</h1>
          <StatusPill value={request.status} />
        </div>
        <p className="lede">
          From {customer?.company || customer?.name || "a customer"}, {formatDateTime(request.created_at)}.
        </p>
      </div>

      <section className="panel">
        <div className="panel-head"><h2>What they asked for</h2></div>
        <div className="panel-body stack">
          <p className="prose" style={{ whiteSpace: "pre-wrap" }}>{request.problem || "No detail given."}</p>
          {request.requirements ? (
            <>
              <span className="label">Requirements</span>
              <p className="prose" style={{ whiteSpace: "pre-wrap" }}>{request.requirements}</p>
            </>
          ) : null}
          <Facts>
            <Fact label="Service">{request.service}</Fact>
            <Fact label="Budget">{request.budget_range ?? "Not given"}</Fact>
            <Fact label="Timeline">{request.timeline ?? "Not given"}</Fact>
            <Fact label="Reference" mono>{request.reference ?? "None"}</Fact>
            <Fact label="Their website" mono>{request.website ?? "None"}</Fact>
            <Fact label="Prefers">{request.contact_preference ?? "Not stated"}</Fact>
          </Facts>
        </div>
      </section>

      <section className="panel">
        <div className="panel-head"><h2>The customer</h2></div>
        <div className="panel-body stack">
          <Facts>
            <Fact label="Company">{customer?.company || customer?.name || "Unknown"}</Fact>
            <Fact label="Email" mono>{customer?.email ?? "Not recorded"}</Fact>
            <Fact label="Phone" mono>{customer?.phone ?? "Not recorded"}</Fact>
          </Facts>
        </div>
      </section>

      <section className="panel">
        <div className="panel-head"><h2>Decide</h2></div>
        <div className="panel-body stack">
          {request.converted_project_id ? (
            <Callout tone="ok" icon="checkCircle" title="Already converted">
              A lead and a project were created {formatDateTime(request.converted_at)}.{" "}
              <Link href={"/projects/" + request.converted_project_id}>Open the project</Link>.
            </Callout>
          ) : (
            <>
              <div className="cluster">
                <RequestStatus id={request.id} status={request.status} />
                {request.status === "accepted" && role === "admin" ? (
                  <Convert rpc="convert_request" id={request.id}
                    label="Create the lead and project" what="a request" />
                ) : null}
              </div>
              {request.status !== "accepted" ? (
                <p className="notice">
                  <Icon name="info" size={14} />
                  <span>
                    Mark it accepted first. Accepting is the decision; creating the project is what
                    follows it, and the database refuses the second without the first.
                  </span>
                </p>
              ) : null}
            </>
          )}
        </div>
      </section>
    </div>
  );
}
