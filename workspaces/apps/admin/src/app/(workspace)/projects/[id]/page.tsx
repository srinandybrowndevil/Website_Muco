import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { requireAccount } from "@muco/core/server";
import { formatDate, formatMoney, humanise } from "@muco/core";
import { EmptyState, Fact, Facts, Icon, StatusPill } from "@muco/ui";

export const metadata: Metadata = { title: "Project" };

function one<T>(value: unknown): T | null {
  return ((Array.isArray(value) ? value[0] : value) ?? null) as T | null;
}

export default async function ProjectPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { supabase, organizationId, role } = await requireAccount("admin");

  const { data: project } = await supabase
    .from("projects")
    .select("id,name,description,status,kind,budget,progress,starts_on,due_on,repo_url,preview_url,staging_url,customers(id,company,name,email)")
    .eq("organization_id", organizationId)
    .eq("id", id)
    .maybeSingle();

  if (!project) notFound();

  const [milestones, tasks, grants, invoices] = await Promise.all([
    supabase.from("project_milestones").select("id,title,detail,status,due_on,position,completed_at")
      .eq("project_id", id).order("position", { ascending: true }),
    supabase.from("tasks").select("id,title,status,due_at,assignee_id,profiles(full_name)")
      .eq("project_id", id).neq("status", "cancelled")
      .order("due_at", { ascending: true, nullsFirst: false }),
    supabase.from("project_grants")
      .select("id,module,level,ends_at,user_id,profiles!project_grants_user_id_fkey(full_name)")
      .eq("project_id", id),
    supabase.from("invoices").select("id,number,amount,status,due_on")
      .eq("project_id", id).order("issued_on", { ascending: false }),
  ]);

  const customer = one<{ id: string; company: string; name: string; email: string }>(project.customers);

  return (
    <div className="page">
      <div className="page-head">
        <Link className="hint" href="/projects"><Icon name="arrowLeft" size={13} /> All projects</Link>
        <div className="split">
          <h1>{project.name}</h1>
          <div className="cluster">
            <span className="badge">{humanise(project.kind)}</span>
            <StatusPill value={project.status} />
          </div>
        </div>
        {project.description ? <p className="lede">{project.description}</p> : null}
      </div>

      <section className="panel">
        <div className="panel-body">
          <Facts>
            <Fact label="For">{customer?.company || customer?.name || "The studio"}</Fact>
            <Fact label="Started">{formatDate(project.starts_on)}</Fact>
            <Fact label="Due">{formatDate(project.due_on)}</Fact>
            {role === "admin" ? (
              <Fact label="Budget">{project.budget ? formatMoney(project.budget) : "Not set"}</Fact>
            ) : null}
            <Fact label="Repository" mono>{project.repo_url ?? "Not linked"}</Fact>
            <Fact label="Preview" mono>{project.preview_url ?? "None"}</Fact>
            <Fact label="Staging" mono>{project.staging_url ?? "None"}</Fact>
          </Facts>
        </div>
      </section>

      <section className="grid-main">
        <div className="stack">
          <section className="panel">
            <div className="panel-head">
              <h2>Milestones</h2>
              <span className="hint">
                {(milestones.data ?? []).filter(m => m.status === "completed").length} of{" "}
                {(milestones.data ?? []).length} complete
              </span>
            </div>
            {(milestones.data ?? []).length === 0 ? (
              <EmptyState icon="target" title="No milestones set">
                The client workspace shows these, so a project with none tells a customer nothing
                about when anything lands.
              </EmptyState>
            ) : (
              <div className="list">
                {(milestones.data ?? []).map(milestone => (
                  <div className="item" key={milestone.id}>
                    <span className="item-main">
                      <b>{milestone.title}</b>
                      <small>{milestone.detail ?? "No detail"}</small>
                    </span>
                    <span className="hint">
                      {milestone.status === "completed"
                        ? "Done " + formatDate(milestone.completed_at)
                        : formatDate(milestone.due_on)}
                    </span>
                    <StatusPill value={milestone.status} />
                  </div>
                ))}
              </div>
            )}
          </section>

          <section className="panel">
            <div className="panel-head">
              <h2>Tasks</h2>
              <span className="hint">
                {(tasks.data ?? []).filter(t => t.status === "open").length} open
              </span>
            </div>
            {(tasks.data ?? []).length === 0 ? (
              <EmptyState icon="list" title="No tasks on this project" />
            ) : (
              <div className="list">
                {(tasks.data ?? []).map(task => (
                  <div className="item" key={task.id}>
                    <span className="item-main">
                      <b>{task.title}</b>
                      <small>
                        {one<{ full_name: string }>(task.profiles)?.full_name ?? "Unassigned"}
                        {task.due_at ? " · due " + formatDate(task.due_at) : ""}
                      </small>
                    </span>
                    <StatusPill value={task.status} />
                  </div>
                ))}
              </div>
            )}
          </section>
        </div>

        <div className="stack">
          <section className="panel">
            <div className="panel-head">
              <h2>Who can open it</h2>
              <Link className="btn sm quiet" href="/grants">Manage</Link>
            </div>
            {(grants.data ?? []).length === 0 ? (
              <EmptyState icon="key" title="Studio staff only">
                Nobody outside the studio holds a grant on this project.
              </EmptyState>
            ) : (
              <div className="list">
                {(grants.data ?? []).map(grant => (
                  <Link className="item" href={"/people/" + grant.user_id} key={grant.id}>
                    <span className="item-main">
                      <b>{one<{ full_name: string }>(grant.profiles)?.full_name ?? "Unnamed"}</b>
                      <small>{grant.module} at {grant.level}</small>
                    </span>
                    <span className="hint">{grant.ends_at ? formatDate(grant.ends_at) : "No end"}</span>
                  </Link>
                ))}
              </div>
            )}
          </section>

          {role === "admin" ? (
            <section className="panel">
              <div className="panel-head"><h2>Invoices</h2></div>
              {(invoices.data ?? []).length === 0 ? (
                <EmptyState icon="receipt" title="None raised" />
              ) : (
                <div className="list">
                  {(invoices.data ?? []).map(invoice => (
                    <div className="item" key={invoice.id}>
                      <span className="item-main">
                        <b className="mono">{invoice.number}</b>
                        <small>{invoice.due_on ? "Due " + formatDate(invoice.due_on) : "No due date"}</small>
                      </span>
                      <span className="tabular">{formatMoney(invoice.amount)}</span>
                      <StatusPill value={invoice.status} />
                    </div>
                  ))}
                </div>
              )}
            </section>
          ) : null}
        </div>
      </section>
    </div>
  );
}
