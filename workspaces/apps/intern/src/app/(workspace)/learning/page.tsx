import type { Metadata } from "next";
import { requireAccount } from "@muco/core/server";
import { count, humanise } from "@muco/core";
import { EmptyState, Icon } from "@muco/ui";
import { MarkRead } from "@/components/MarkRead";

export const metadata: Metadata = { title: "Learning" };

export default async function LearningPage() {
  const { supabase, userId, organizationId } = await requireAccount("intern");

  const { data: internship } = await supabase
    .from("intern_profiles").select("id,track")
    .eq("user_id", userId).eq("organization_id", organizationId).maybeSingle();

  if (!internship) {
    return (
      <div className="page">
        <EmptyState icon="book" title="No internship record yet">
          Learning material is assigned to an internship, and yours has not been set up.
        </EmptyState>
      </div>
    );
  }

  // Assigned material only. There is no library to browse: the specification
  // is explicit that an intern sees what was given to them, and a browsable
  // catalogue is how an intern on the design track ends up reading the backend
  // onboarding notes.
  const { data: assignments } = await supabase
    .from("learning_assignments")
    .select("id,assigned_at,completed_at,learning_materials(id,title,summary,url,minutes,track)")
    .eq("intern_id", internship.id)
    .order("assigned_at", { ascending: false });

  const rows = (assignments ?? []).map(row => {
    const material = Array.isArray(row.learning_materials) ? row.learning_materials[0] : row.learning_materials;
    return { id: row.id, done: !!row.completed_at, material: material as {
      id: string; title: string; summary: string | null; url: string | null; minutes: number | null; track: string | null;
    } | null };
  }).filter(row => row.material);

  const unread = rows.filter(row => !row.done).length;

  return (
    <div className="page">
      <div className="page-head">
        <span className="eyebrow">{humanise(internship.track).replace("Intern ", "")} track</span>
        <h1>Learning</h1>
        <p className="lede">
          Material assigned to you by the studio. There is nothing else to browse — what is here is
          what your mentor thinks is worth your time this month.
        </p>
      </div>

      <section className="panel">
        <div className="panel-head">
          <h2>{unread === 0 ? "Everything marked read" : count(unread, "item") + " to read"}</h2>
          <span className="hint">{rows.length} assigned</span>
        </div>
        {rows.length === 0 ? (
          <EmptyState icon="book" title="Nothing assigned yet">
            Your mentor assigns reading as your work needs it, rather than all at once at the start.
          </EmptyState>
        ) : (
          <div className="list">
            {rows.map(row => (
              <div className="item" key={row.id} style={{ alignItems: "flex-start" }}>
                <span className="item-main">
                  <b>{row.material!.title}</b>
                  {row.material!.summary ? <small>{row.material!.summary}</small> : null}
                  <span className="cluster" style={{ marginTop: "var(--s2)" }}>
                    {row.material!.minutes ? <span className="badge">{row.material!.minutes} min</span> : null}
                    {row.material!.url ? (
                      <a
                        className="btn sm quiet"
                        href={row.material!.url}
                        target="_blank"
                        rel="noopener noreferrer"
                      >
                        <span>Open</span>
                        <Icon name="external" size={13} />
                      </a>
                    ) : null}
                  </span>
                </span>
                <MarkRead id={row.id} done={row.done} />
              </div>
            ))}
          </div>
        )}
      </section>

      <p className="notice">
        <Icon name="info" size={14} />
        <span>
          Marking something read is for you to keep your place. Nobody is scored on it, and you can
          untick it.
        </span>
      </p>
    </div>
  );
}
