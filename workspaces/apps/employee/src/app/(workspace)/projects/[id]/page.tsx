import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { requireAccount } from "@muco/core/server";
import { formatDate, humanise } from "@muco/core";
import { EmptyState, Fact, Facts, Icon, StatusPill } from "@muco/ui";
import { TaskList, type TaskRow } from "@muco/ui/work";

export const metadata: Metadata = { title: "Project room" };

// Everything about one project that this person is allowed to have, on one
// page: what it is, what their grant covers, the milestones, their tasks, and
// the files their grant admits.
//
// notFound() rather than a refusal message when the project is not readable.
// "You do not have access to project 8f3a" confirms that 8f3a exists, which is
// more than somebody without a grant should learn from a URL.
export default async function ProjectRoom({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { supabase, userId } = await requireAccount("employee");

  const { data: project } = await supabase
    .from("granted_projects")
    .select("id,name,description,status,kind,starts_on,due_on,preview_url,staging_url")
    .eq("id", id)
    .maybeSingle();

  if (!project) notFound();

  const [grants, milestones, tasks, files] = await Promise.all([
    supabase.from("project_grants").select("id,module,level,starts_at,ends_at")
      .eq("user_id", userId).eq("project_id", id),
    supabase.from("project_milestones").select("id,title,detail,status,due_on,position")
      .eq("project_id", id).order("position", { ascending: true }),
    supabase.from("tasks").select("id,title,description,status,priority,due_at")
      .eq("project_id", id).eq("assignee_id", userId).neq("status", "cancelled")
      .order("due_at", { ascending: true, nullsFirst: false }),
    supabase.from("files").select("id,name,kind,size_bytes,created_at")
      .eq("project_id", id).order("created_at", { ascending: false }).limit(20),
  ]);

  const live = (grants.data ?? []).filter(
    grant => !grant.ends_at || Date.parse(grant.ends_at) >= Date.now() - 86_400_000,
  );

  const rows: TaskRow[] = (tasks.data ?? []).map(task => ({
    id: task.id,
    title: task.title,
    description: task.description,
    status: task.status,
    priority: task.priority,
    due_at: task.due_at,
    project: null,
  }));

  return (
    <div className="page">
      <div className="page-head">
        <Link className="hint" href="/projects">
          <Icon name="arrowLeft" size={13} /> All projects
        </Link>
        <div className="split">
          <h1>{project.name}</h1>
          <StatusPill value={project.status} />
        </div>
        {project.description ? <p className="lede">{project.description}</p> : null}
      </div>

      <section className="panel">
        <div className="roomhead">
          <Facts>
            <Fact label="Kind">{humanise(project.kind)}</Fact>
            <Fact label="Started">{formatDate(project.starts_on)}</Fact>
            <Fact label="Due">{formatDate(project.due_on)}</Fact>
          </Facts>
          <div className="stack-sm">
            <span className="label">What your grant covers</span>
            <div className="roomgrants">
              {live.length === 0 ? (
                <span className="hint">Your grant on this project has lapsed.</span>
              ) : live.map(grant => (
                <span className="badge accent" key={grant.id}>
                  {grant.module} · {grant.level}
                  {grant.ends_at ? " · until " + formatDate(grant.ends_at) : ""}
                </span>
              ))}
            </div>
          </div>
          {project.preview_url || project.staging_url ? (
            <div className="cluster">
              {project.preview_url ? (
                <a className="btn sm" href={project.preview_url} target="_blank" rel="noopener noreferrer">
                  <Icon name="eye" size={14} /><span>Preview</span>
                </a>
              ) : null}
              {project.staging_url ? (
                <a className="btn sm" href={project.staging_url} target="_blank" rel="noopener noreferrer">
                  <Icon name="terminal" size={14} /><span>Staging</span>
                </a>
              ) : null}
            </div>
          ) : (
            <p className="notice">
              <Icon name="lock" size={14} />
              <span>Preview and staging links need a staging grant. Yours does not include one.</span>
            </p>
          )}
        </div>
      </section>

      <section className="panel">
        <div className="panel-head"><h2>Milestones</h2></div>
        {(milestones.data ?? []).length === 0 ? (
          <EmptyState icon="target" title="No milestones set">
            Milestones are set by the studio as a project is planned.
          </EmptyState>
        ) : (
          <ol className="timeline">
            {(milestones.data ?? []).map(milestone => (
              <li key={milestone.id} data-done={milestone.status === "completed" ? "true" : "now"}>
                <b>{milestone.title}</b>
                {milestone.detail ? <small>{milestone.detail}</small> : null}
                <small>{milestone.due_on ? formatDate(milestone.due_on) : "No date"} · {humanise(milestone.status)}</small>
              </li>
            ))}
          </ol>
        )}
      </section>

      <section className="panel">
        <div className="panel-head"><h2>Your tasks on this project</h2></div>
        <TaskList tasks={rows} />
      </section>

      <section className="panel">
        <div className="panel-head">
          <h2>Files</h2>
          <span className="hint">{(files.data ?? []).length} shown</span>
        </div>
        {(files.data ?? []).length === 0 ? (
          <EmptyState icon="folder" title="No files you can open">
            Files are filtered by your grant, so an empty list here can mean there are none or that
            yours does not cover them.
          </EmptyState>
        ) : (
          <div className="list">
            {(files.data ?? []).map(file => (
              <div className="item" key={file.id}>
                <Icon name="file" size={16} />
                <span className="item-main">
                  <b className="truncate">{file.name}</b>
                  <small>{humanise(file.kind ?? "file")} · {formatDate(file.created_at)}</small>
                </span>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
