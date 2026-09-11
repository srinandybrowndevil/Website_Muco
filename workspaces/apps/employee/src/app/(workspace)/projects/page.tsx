import Link from "next/link";
import type { Metadata } from "next";
import { requireAccount } from "@muco/core/server";
import { formatDate, humanise } from "@muco/core";
import { EmptyState, Icon, StatusPill } from "@muco/ui";

export const metadata: Metadata = { title: "Projects" };

export default async function ProjectsPage() {
  const { supabase, userId } = await requireAccount("employee");

  const [projects, grants] = await Promise.all([
    // granted_projects, not projects. The view returns the room and not the
    // money: budget, repo_url, customer_id and owner_id are absent by
    // construction, so this page shows exactly what a direct API call to the
    // same account would return.
    supabase.from("granted_projects")
      .select("id,name,description,status,kind,starts_on,due_on")
      .order("status", { ascending: true })
      .order("due_on", { ascending: true, nullsFirst: false }),
    supabase.from("project_grants")
      .select("project_id,module,level,ends_at")
      .eq("user_id", userId),
  ]);

  const byProject = new Map<string, { module: string; level: string; ends_at: string | null }[]>();
  for (const grant of grants.data ?? []) {
    const live = !grant.ends_at || Date.parse(grant.ends_at) >= Date.now() - 86_400_000;
    if (!live) continue;
    const list = byProject.get(grant.project_id) ?? [];
    list.push(grant);
    byProject.set(grant.project_id, list);
  }

  return (
    <div className="page">
      <div className="page-head">
        <span className="eyebrow">Granted to you</span>
        <h1>Projects</h1>
        <p className="lede">
          You can see only the projects assigned to you, and within each one only the modules your
          grant covers. A grant has an end date; when it passes, the project stops appearing here.
        </p>
      </div>

      {(projects.data ?? []).length === 0 ? (
        <EmptyState icon="briefcase" title="No project has been granted to you yet">
          Access is granted per project, per module and per level. Ask the studio which project you
          are joining — the grant is what makes it appear.
        </EmptyState>
      ) : (
        <div className="grid-2">
          {(projects.data ?? []).map(project => {
            const mine = byProject.get(project.id) ?? [];
            return (
              <Link className="panel linkcard" href={"/projects/" + project.id} key={project.id}>
                <div className="panel-body stack-sm">
                  <div className="split">
                    <b>{project.name}</b>
                    <span className="linkcard-go"><Icon name="arrowRight" size={16} /></span>
                  </div>
                  {project.description ? <p className="hint">{project.description}</p> : null}
                  <div className="cluster">
                    <StatusPill value={project.status} />
                    <span className="badge">{humanise(project.kind)}</span>
                    {project.due_on ? <span className="hint">Due {formatDate(project.due_on)}</span> : null}
                  </div>
                  <div className="cluster">
                    {mine.map(grant => (
                      <span className="badge accent" key={grant.module + grant.level}>
                        {grant.module} · {grant.level}
                      </span>
                    ))}
                  </div>
                </div>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
