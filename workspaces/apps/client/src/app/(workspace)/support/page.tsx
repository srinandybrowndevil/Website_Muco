import type { Metadata } from "next";
import { requireAccount } from "@muco/core/server";
import { formatDateTime, humanise } from "@muco/core";
import { EmptyState, Fact, Facts, Icon, StatusPill } from "@muco/ui";
import { loadCustomer } from "@/lib/project";
import { RequestForm } from "@/components/RequestForm";

export const metadata: Metadata = { title: "Support" };

export default async function SupportPage() {
  const { supabase, userId, organizationId } = await requireAccount("client");
  const customer = await loadCustomer(supabase, userId);
  if (!customer) return <div className="page"><EmptyState icon="building" title="Your organisation is not linked yet" /></div>;

  const [requests, settings] = await Promise.all([
    supabase.from("project_requests")
      .select("id,title,service,status,problem,timeline,created_at")
      .eq("customer_id", customer.id)
      .order("created_at", { ascending: false })
      .limit(30),
    supabase.from("organization_settings")
      .select("support_email").eq("organization_id", organizationId).maybeSingle(),
  ]);

  const support = settings.data?.support_email ?? "founder@mucolabs.com";

  return (
    <div className="page">
      <div className="page-head">
        <span className="eyebrow">Ask the studio</span>
        <h1>Support</h1>
        <p className="lede">
          Anything about your project — a question, something that looks wrong, or a new piece of
          work. Writing it here keeps it attached to your project instead of buried in an inbox.
        </p>
      </div>

      <section className="grid-main">
        <section className="panel">
          <div className="panel-head"><h2>Write to the studio</h2></div>
          <div className="panel-body">
            <RequestForm organizationId={organizationId} customerId={customer.id} />
          </div>
        </section>

        <section className="panel">
          <div className="panel-head"><h2>Other ways to reach us</h2></div>
          <div className="panel-body stack">
            <Facts>
              <Fact label="Email" mono>{support}</Fact>
              <Fact label="Phone" mono>+91 6381809844</Fact>
              <Fact label="Hours">Monday to Saturday, 9am to 7pm</Fact>
              <Fact label="Languages">English and Tamil</Fact>
            </Facts>
            <p className="hint">
              Use the form for anything you want a record of. Use the phone for anything urgent —
              a site that is down is a phone call, not a form.
            </p>
          </div>
        </section>
      </section>

      <section className="panel">
        <div className="panel-head">
          <h2>What you have sent</h2>
          <span className="hint">{(requests.data ?? []).length}</span>
        </div>
        {(requests.data ?? []).length === 0 ? (
          <EmptyState icon="message" title="Nothing sent yet">
            Everything you send from this page stays here with its status, so you can see what has
            been picked up without asking.
          </EmptyState>
        ) : (
          <div className="list">
            {(requests.data ?? []).map(request => (
              <div className="item" key={request.id} style={{ alignItems: "flex-start" }}>
                <span className="item-main">
                  <b>{request.title}</b>
                  <small>
                    {request.service} · sent {formatDateTime(request.created_at)}
                  </small>
                  {request.problem ? (
                    <small style={{ color: "var(--text-2)", whiteSpace: "pre-wrap" }}>
                      {request.problem.slice(0, 220)}
                      {request.problem.length > 220 ? "…" : ""}
                    </small>
                  ) : null}
                </span>
                <StatusPill value={request.status} label={humanise(request.status)} />
              </div>
            ))}
          </div>
        )}
      </section>

      <p className="notice">
        <Icon name="info" size={14} />
        <span>
          A request marked accepted becomes a project or a piece of work on an existing one. It does
          not start until you have a written scope and a price.
        </span>
      </p>
    </div>
  );
}
