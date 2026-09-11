import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { requireAccount } from "@muco/core/server";
import { formatDate, formatMoney, humanise, stillLive } from "@muco/core";
import { EmptyState, Fact, Facts, Icon, StatusPill } from "@muco/ui";
import { Milestones, type Milestone } from "@/components/Milestones";
import { Tasks, type ProjectTask } from "@/components/Tasks";
import { ShareDocument, type SharedFile } from "@/components/ShareDocument";
import { Invoices, type Invoice } from "@/components/Invoices";

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

  const [milestones, tasks, grants, invoices, files, lastInvoice] = await Promise.all([
    supabase.from("project_milestones").select("id,title,detail,status,due_on,position,completed_at")
      .eq("project_id", id).order("position", { ascending: true }),
    supabase.from("tasks").select("id,title,status,due_at,assignee_id,profiles(full_name)")
      .eq("project_id", id).neq("status", "cancelled")
      .order("due_at", { ascending: true, nullsFirst: false }),
    supabase.from("project_grants")
      .select("id,module,level,ends_at,user_id,profiles!project_grants_user_id_fkey(full_name)")
      .eq("project_id", id),
    supabase.from("invoices").select("id,number,amount,status,issued_on,due_on")
      .eq("project_id", id).order("issued_on", { ascending: false }),
    supabase.from("files").select("id,name,kind,size_bytes,created_at")
      .eq("project_id", id).order("created_at", { ascending: false }),
    // Only to propose the next number. The database has the final say on
    // whether it is allowed, and refuses a duplicate.
    supabase.from("invoices").select("number")
      .eq("organization_id", organizationId).order("number", { ascending: false }).limit(1),
  ]);

  const customer = one<{ id: string; company: string; name: string; email: string }>(project.customers);

  const rows: ProjectTask[] = (tasks.data ?? []).map(task => ({
    id: task.id as string,
    title: task.title as string,
    status: task.status as string,
    due_at: task.due_at as string | null,
    assignee_id: task.assignee_id as string | null,
    assignee: one<{ full_name: string }>(task.profiles)?.full_name ?? null,
  }));

  // Studio staff can always be assigned; everybody else needs a live grant on
  // this project, because the policy on projects admits them only through one.
  const granted = (grants.data ?? [])
    .filter(grant => stillLive(grant.ends_at as string))
    .map(grant => ({
      id: grant.user_id as string,
      name: one<{ full_name: string }>(grant.profiles)?.full_name ?? "Unnamed",
      note: (grant.module as string) + " at " + (grant.level as string),
    }));

  const assignable = [...new Map(granted.map(person => [person.id, person])).values()];

  const year = new Date().getFullYear();
  const previous = (lastInvoice.data ?? [])[0]?.number as string | undefined;
  const sequence = previous?.match(/(\d+)$/);
  const nextNumber = "MUCO-INV-" + year + "-" +
    String((sequence ? Number(sequence[1]) : 0) + 1).padStart(4, "0");

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
            <Milestones
              projectId={id}
              organizationId={organizationId}
              milestones={(milestones.data ?? []) as Milestone[]}
              canEdit={role === "admin"}
            />
          </section>

          <section className="panel">
            <div className="panel-head">
              <h2>Tasks</h2>
              <span className="hint">
                {(tasks.data ?? []).filter(t => t.status === "open").length} open
              </span>
            </div>
            <Tasks
              projectId={id}
              organizationId={organizationId}
              tasks={rows}
              assignable={assignable}
              canEdit={role === "admin"}
            />
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

          <section className="panel">
            <div className="panel-head">
              <h2>Files</h2>
              <span className="hint">{(files.data ?? []).length}</span>
            </div>
            <ShareDocument
              projectId={id}
              customerId={customer?.id ?? null}
              organizationId={organizationId}
              files={(files.data ?? []) as SharedFile[]}
              canEdit={role === "admin" || role === "member"}
            />
          </section>

          {role === "admin" ? (
            <section className="panel">
              <div className="panel-head"><h2>Invoices</h2></div>
              <Invoices
                projectId={id}
                customerId={customer?.id ?? null}
                organizationId={organizationId}
                invoices={(invoices.data ?? []) as Invoice[]}
                budget={project.budget as number | null}
                nextNumber={nextNumber}
                canEdit={role === "admin"}
              />
            </section>
          ) : null}
        </div>
      </section>
    </div>
  );
}
