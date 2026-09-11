import type { Metadata } from "next";
import { requireAccount } from "@muco/core/server";
import { formatDate, relativeDays } from "@muco/core";
import { EmptyState, Icon, StatusPill } from "@muco/ui";
import { loadCustomer, loadProjects } from "@/lib/project";

export const metadata: Metadata = { title: "Milestones" };

export default async function MilestonesPage() {
  const { supabase, userId } = await requireAccount("client");
  const customer = await loadCustomer(supabase, userId);
  if (!customer) return <div className="page"><EmptyState icon="building" title="Your organisation is not linked yet" /></div>;

  const projects = await loadProjects(supabase, customer.id);
  const ids = projects.map(project => project.id);

  const { data: milestones } = ids.length
    ? await supabase.from("project_milestones")
        .select("id,project_id,title,detail,status,due_on,position,completed_at")
        .in("project_id", ids)
        .order("position", { ascending: true })
    : { data: [] };

  return (
    <div className="page">
      <div className="page-head">
        <span className="eyebrow">When things land</span>
        <h1>Milestones</h1>
        <p className="lede">
          What is finished, what is next, and what is dated. A milestone is marked complete when it
          is accepted, not when the studio thinks it is close.
        </p>
      </div>

      {projects.map(project => {
        const rows = (milestones ?? []).filter(milestone => milestone.project_id === project.id);
        const next = rows.find(milestone => milestone.status !== "completed");
        const done = rows.filter(milestone => milestone.status === "completed").length;
        return (
          <section className="panel" key={project.id}>
            <div className="panel-head">
              <h2>{project.name}</h2>
              <span className="hint">
                {rows.length === 0 ? "No milestones" : done + " of " + rows.length + " complete"}
              </span>
            </div>
            {rows.length === 0 ? (
              <EmptyState icon="target" title="Not set yet">
                Milestones are agreed as part of the scope, before build work starts.
              </EmptyState>
            ) : (
              <ol className="milestones">
                {rows.map(milestone => (
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
                      <span className="cluster" style={{ marginTop: "var(--s2)" }}>
                        <StatusPill value={milestone.status} />
                        {milestone.id === next?.id ? <span className="badge accent">Next</span> : null}
                      </span>
                    </span>
                    <span className="when">
                      {milestone.status === "completed"
                        ? milestone.completed_at ? formatDate(milestone.completed_at) : "Done"
                        : milestone.due_on
                          ? formatDate(milestone.due_on) + " · " + relativeDays(milestone.due_on)
                          : "No date"}
                    </span>
                  </li>
                ))}
              </ol>
            )}
          </section>
        );
      })}

      <p className="notice">
        <Icon name="info" size={14} />
        <span>
          Dates move sometimes, usually because something is waiting on a decision. When one moves
          the studio changes it here rather than leaving a date that has quietly stopped being true.
        </span>
      </p>
    </div>
  );
}
