import type { Metadata } from "next";
import { requireAccount } from "@muco/core/server";
import { formatDate, humanise, stillLive } from "@muco/core";
import { EmptyState, Fact, Facts, Icon, StatusPill } from "@muco/ui";

export const metadata: Metadata = { title: "Project" };

// The slice of a project an intern has been granted, and nothing around it.
//
// Two things make that true rather than merely drawn. The rows come from
// granted_projects, a view that carries the room and not the money — budget,
// repository URL, customer and owner are absent by construction, so a direct
// API call returns the same columns this page shows. And the staging links are
// gated inside that view rather than here, so a tickets-only grant gets null
// rather than a link the interface simply chose not to draw.
export default async function ProjectPage() {
  const { supabase, userId } = await requireAccount("intern");

  const { data: grants } = await supabase
    .from("project_grants")
    .select("id,module,level,starts_at,ends_at,project_id")
    .eq("user_id", userId)
    .order("project_id", { ascending: true });

  const live = (grants ?? []).filter(
    grant => stillLive(grant.ends_at),
  );
  const projectIds = [...new Set(live.map(grant => grant.project_id))];

  const { data: projects } = projectIds.length
    ? await supabase
        .from("granted_projects")
        .select("id,name,description,status,kind,starts_on,due_on,preview_url,staging_url")
        .in("id", projectIds)
    : { data: [] };

  return (
    <div className="page">
      <div className="page-head">
        <span className="eyebrow">Assigned to you</span>
        <h1>Project</h1>
        <p className="lede">
          The project you were given access to, and the parts of it your grant covers. There is no
          switcher here: an internship is assigned to specific work, not to the studio.
        </p>
      </div>

      {(projects ?? []).length === 0 ? (
        <EmptyState icon="layers" title="No project has been assigned to you">
          Access to a project is granted per module and per level, with an end date. When your
          mentor grants one, it appears here with exactly what it covers.
        </EmptyState>
      ) : (
        (projects ?? []).map(project => {
          const mine = live.filter(grant => grant.project_id === project.id);
          return (
            <section className="panel" key={project.id}>
              <div className="panel-head">
                <h2>{project.name}</h2>
                <StatusPill value={project.status} />
              </div>
              <div className="panel-body stack">
                {project.description ? <p className="lede">{project.description}</p> : null}

                <Facts>
                  <Fact label="Kind">{humanise(project.kind)}</Fact>
                  <Fact label="Started">{formatDate(project.starts_on)}</Fact>
                  <Fact label="Due">{formatDate(project.due_on)}</Fact>
                </Facts>

                <div className="stack-sm">
                  <span className="label">What your grant covers</span>
                  <div className="cluster">
                    {mine.map(grant => (
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
                        <Icon name="eye" size={14} />
                        <span>Preview</span>
                      </a>
                    ) : null}
                    {project.staging_url ? (
                      <a className="btn sm" href={project.staging_url} target="_blank" rel="noopener noreferrer">
                        <Icon name="terminal" size={14} />
                        <span>Staging</span>
                      </a>
                    ) : null}
                  </div>
                ) : (
                  <p className="notice">
                    <Icon name="lock" size={14} />
                    <span>
                      Preview and staging links appear only with a staging grant. Yours does not
                      include one.
                    </span>
                  </p>
                )}
              </div>
            </section>
          );
        })
      )}

      <p className="notice">
        <Icon name="shield" size={14} />
        <span>
          Budgets, repository URLs and customer details are not part of this view for anybody on an
          internship — they are not hidden here, they are not returned at all.
        </span>
      </p>
    </div>
  );
}
