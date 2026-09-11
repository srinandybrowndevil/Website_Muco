import Link from "next/link";
import type { Metadata } from "next";
import { requireAccount } from "@muco/core/server";
import { formatDate, formatMoney, relativeDays } from "@muco/core";
import { Callout, EmptyState, Icon, StatusPill } from "@muco/ui";
import { loadCustomer, loadProjects, statusDetail, statusSentence } from "@/lib/project";

export const metadata: Metadata = { title: "Overview" };

// One screen that answers "how is my project going", in a sentence rather than
// a percentage. The specification asks for status to stay honest and not show
// a fake completion figure, and a bar sitting at eighty per cent is a promise
// nobody at the studio made.
export default async function ClientHome() {
  const { supabase, userId } = await requireAccount("client");
  const customer = await loadCustomer(supabase, userId);

  if (!customer) {
    return (
      <div className="page">
        <EmptyState icon="building" title="Your organisation is not linked yet">
          Your account exists but is not attached to a customer record, so there is nothing to show.
          Tell the studio and it takes a minute to fix.
        </EmptyState>
      </div>
    );
  }

  const projects = await loadProjects(supabase, customer.id);
  const project = projects.find(row => row.status === "active") ?? projects[0] ?? null;

  const [milestones, invoices] = await Promise.all([
    project
      ? supabase.from("project_milestones")
          .select("id,title,detail,status,due_on,position")
          .eq("project_id", project.id)
          .order("position", { ascending: true })
      : Promise.resolve({ data: [] }),
    supabase.from("invoices")
      .select("id,number,amount,status,issued_on,due_on")
      .eq("customer_id", customer.id)
      .order("issued_on", { ascending: false })
      .limit(6),
  ]);

  const next = (milestones.data ?? []).find(milestone => milestone.status !== "completed") ?? null;
  const outstanding = (invoices.data ?? []).filter(
    invoice => invoice.status === "sent" || invoice.status === "viewed" || invoice.status === "overdue",
  );
  const owed = outstanding.reduce((total, invoice) => total + Number(invoice.amount ?? 0), 0);

  if (!project) {
    return (
      <div className="page">
        <EmptyState icon="briefcase" title="No project yet">
          When the studio opens a project for {customer.company || customer.name}, its status,
          milestones and files appear here.
        </EmptyState>
      </div>
    );
  }

  return (
    <div className="page">
      <section className="panel">
        <div className="statement">
          <span className="eyebrow">{customer.company || customer.name}</span>
          <h2>{statusSentence(project.status, project.name)}</h2>
          <p>{statusDetail(project.status)}</p>
        </div>

        <div className="panel-body">
          <div className="cluster">
            <StatusPill value={project.status} />
            {project.due_on ? (
              <span className="hint">Due {formatDate(project.due_on)} · {relativeDays(project.due_on)}</span>
            ) : (
              <span className="hint">No completion date agreed yet</span>
            )}
            {project.preview_url ? (
              <Link className="btn sm" href="/previews">
                <Icon name="eye" size={14} />
                <span>See the preview</span>
              </Link>
            ) : null}
          </div>
        </div>
      </section>

      {outstanding.length > 0 ? (
        <Callout tone={outstanding.some(i => i.status === "overdue") ? "warn" : "info"} icon="receipt"
          title={formatMoney(owed) + " outstanding"}>
          {outstanding.length === 1 ? "One invoice is" : outstanding.length + " invoices are"} open.{" "}
          <Link href="/billing">Open billing</Link> for the numbers and the dates. Work is quoted
          from a written scope and billed 50% on start and 50% on completion, as published.
        </Callout>
      ) : null}

      <section className="grid-main">
        <section className="panel">
          <div className="panel-head">
            <h2>Where we are</h2>
            <Link className="btn sm quiet" href="/milestones">
              <span>All milestones</span>
              <Icon name="arrowRight" size={14} />
            </Link>
          </div>
          {(milestones.data ?? []).length === 0 ? (
            <EmptyState icon="target" title="Milestones are not set yet">
              They are agreed as part of the scope, before build work starts.
            </EmptyState>
          ) : (
            <ol className="milestones">
              {(milestones.data ?? []).slice(0, 5).map(milestone => (
                <li
                  key={milestone.id}
                  data-state={
                    milestone.status === "completed" ? "completed"
                    : milestone.id === next?.id ? "active"
                    : "waiting"
                  }
                >
                  <span className="body">
                    <b>{milestone.title}</b>
                    {milestone.detail ? <p>{milestone.detail}</p> : null}
                  </span>
                  <span className="when">
                    {milestone.status === "completed" ? "Done" : formatDate(milestone.due_on)}
                  </span>
                </li>
              ))}
            </ol>
          )}
        </section>

        <section className="panel">
          <div className="panel-head"><h2>What happens next</h2></div>
          <div className="panel-body stack-sm">
            {next ? (
              <>
                <b>{next.title}</b>
                {next.detail ? <p className="hint">{next.detail}</p> : null}
                <p className="hint">
                  {next.due_on ? "Expected " + formatDate(next.due_on) + "." : "No date set for this one yet."}
                </p>
              </>
            ) : (
              <p className="hint">Every milestone on this project is complete.</p>
            )}
            <hr />
            <p className="hint">
              If something here does not match what you were told, say so on the support page rather
              than waiting for the next update. It is nearly always a record that needs correcting.
            </p>
            <div>
              <Link className="btn sm" href="/support">Ask the studio</Link>
            </div>
          </div>
        </section>
      </section>

      {projects.length > 1 ? (
        <section className="panel">
          <div className="panel-head"><h2>Your other projects</h2></div>
          <div className="list">
            {projects.filter(row => row.id !== project.id).map(row => (
              <div className="item" key={row.id}>
                <span className="item-main">
                  <b>{row.name}</b>
                  <small>{row.due_on ? "Due " + formatDate(row.due_on) : "No due date"}</small>
                </span>
                <StatusPill value={row.status} />
              </div>
            ))}
          </div>
        </section>
      ) : null}
    </div>
  );
}
