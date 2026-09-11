import Link from "next/link";
import type { Metadata } from "next";
import { requireAccount } from "@muco/core/server";
import { formatDate, isPast, relativeDays, today } from "@muco/core";
import { EmptyState, Icon, StatusPill } from "@muco/ui";

export const metadata: Metadata = { title: "Home" };

function one<T>(value: unknown): T | null {
  return ((Array.isArray(value) ? value[0] : value) ?? null) as T | null;
}

// Assigned projects, open tasks, next milestone. Three answers to one
// question — what is on me this week — rather than a dashboard of numbers
// somebody has to interpret.
export default async function EmployeeHome() {
  const { supabase, userId, fullName } = await requireAccount("employee");
  const todayISO = today();

  const [projects, tasks] = await Promise.all([
    supabase.from("granted_projects")
      .select("id,name,status,kind,due_on")
      .order("due_on", { ascending: true, nullsFirst: false })
      .limit(6),
    supabase.from("tasks")
      .select("id,title,status,due_at,projects(name)")
      .eq("assignee_id", userId).eq("status", "open")
      .order("due_at", { ascending: true, nullsFirst: false })
      .limit(6),
  ]);

  const projectIds = (projects.data ?? []).map(project => project.id);
  const { data: milestones } = projectIds.length
    ? await supabase.from("project_milestones")
        .select("id,title,due_on,status,project_id,projects(name)")
        .in("project_id", projectIds)
        .neq("status", "completed")
        .gte("due_on", todayISO)
        .order("due_on", { ascending: true })
        .limit(3)
    : { data: [] };

  const firstName = (fullName ?? "").split(" ")[0];
  const overdue = (tasks.data ?? []).filter(
    task => isPast(task.due_at),
  ).length;

  return (
    <div className="page">
      <div className="page-head">
        <span className="eyebrow">Your week</span>
        <h1>{firstName ? "Hello, " + firstName : "Your work"}</h1>
        <p className="lede">
          You can see only the projects assigned to you. Everything on this page is scoped to your
          own grants and your own tasks.
        </p>
      </div>

      {overdue > 0 ? (
        <div className="callout warn" role="status">
          <Icon name="alert" size={18} />
          <div>
            <b>{overdue === 1 ? "One task is past its due date" : overdue + " tasks are past their due date"}</b>
            <p>A date that has slipped is worth saying out loud rather than quietly moving.</p>
          </div>
        </div>
      ) : null}

      <section className="grid-main">
        <div className="stack">
          <section className="panel">
            <div className="panel-head">
              <h2>Open tasks</h2>
              <Link className="btn sm quiet" href="/tasks">
                <span>All tasks</span>
                <Icon name="arrowRight" size={14} />
              </Link>
            </div>
            {(tasks.data ?? []).length === 0 ? (
              <EmptyState icon="checkCircle" title="Nothing open">
                Tasks reach you by being assigned. If you are between pieces of work, that is worth
                saying rather than waiting for this page to change.
              </EmptyState>
            ) : (
              <div className="list">
                {(tasks.data ?? []).map(task => (
                  <Link className="item" href="/tasks" key={task.id}>
                    <span className="item-main">
                      <b>{task.title}</b>
                      <small>
                        {one<{ name: string }>(task.projects)?.name ?? "No project"}
                        {task.due_at ? " · " + relativeDays(task.due_at) : ""}
                      </small>
                    </span>
                    <Icon name="chevronRight" size={15} />
                  </Link>
                ))}
              </div>
            )}
          </section>

          <section className="panel">
            <div className="panel-head">
              <h2>Your projects</h2>
              <Link className="btn sm quiet" href="/projects">
                <span>All projects</span>
                <Icon name="arrowRight" size={14} />
              </Link>
            </div>
            {(projects.data ?? []).length === 0 ? (
              <EmptyState icon="briefcase" title="No project has been granted to you yet">
                Access is granted per project, per module and per level, with an end date. When one
                is granted it appears here.
              </EmptyState>
            ) : (
              <div className="list">
                {(projects.data ?? []).map(project => (
                  <Link className="item" href={"/projects/" + project.id} key={project.id}>
                    <span className="item-main">
                      <b>{project.name}</b>
                      <small>{project.due_on ? "Due " + formatDate(project.due_on) : "No due date"}</small>
                    </span>
                    <StatusPill value={project.status} />
                    <Icon name="chevronRight" size={15} />
                  </Link>
                ))}
              </div>
            )}
          </section>
        </div>

        <section className="panel">
          <div className="panel-head"><h2>Next milestones</h2></div>
          {(milestones ?? []).length === 0 ? (
            <EmptyState icon="target" title="Nothing dated ahead">
              Milestones are set on a project as it is planned.
            </EmptyState>
          ) : (
            <ol className="timeline">
              {(milestones ?? []).map(milestone => (
                <li key={milestone.id} data-done={milestone.status === "completed" ? "true" : "now"}>
                  <b>{milestone.title}</b>
                  <small>
                    {one<{ name: string }>(milestone.projects)?.name ?? "Project"} ·{" "}
                    {formatDate(milestone.due_on)}
                  </small>
                </li>
              ))}
            </ol>
          )}
        </section>
      </section>
    </div>
  );
}
