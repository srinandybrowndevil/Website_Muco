import type { Metadata } from "next";
import { requireAccount } from "@muco/core/server";
import { count, formatDate, humanise } from "@muco/core";
import { EmptyState, Icon } from "@muco/ui";
import { LearningEditor } from "@/components/LearningEditor";
import { AssignMaterial } from "@/components/AssignMaterial";

export const metadata: Metadata = { title: "Learning" };

function one<T>(value: unknown): T | null {
  return ((Array.isArray(value) ? value[0] : value) ?? null) as T | null;
}

// What the studio gives interns to read, and who has it.
//
// The intern workspace shows assigned material and offers no library to
// browse, which is the specification's instruction and the right one — an
// intern on the design track has no business in the backend onboarding notes.
// The consequence is that material existing and material being assigned are
// two different facts, and this page is where both are made.
export default async function LearningPage() {
  const { supabase, organizationId, role } = await requireAccount("admin");

  const [materials, assignments, interns] = await Promise.all([
    supabase.from("learning_materials")
      .select("id,title,summary,url,track,minutes,created_at")
      .eq("organization_id", organizationId)
      .order("created_at", { ascending: false }),
    supabase.from("learning_assignments")
      .select("id,material_id,intern_id,assigned_at,completed_at")
      .eq("organization_id", organizationId),
    supabase.from("intern_profiles")
      .select("id,track,status,profiles!intern_profiles_user_id_fkey(full_name)")
      .eq("organization_id", organizationId)
      .in("status", ["active", "completed"])
      .order("starts_at", { ascending: false }),
  ]);

  const people = (interns.data ?? []).map(row => ({
    id: row.id as string,
    name: one<{ full_name: string }>(row.profiles)?.full_name ?? "Intern",
    track: row.track as string,
  }));
  const nameOf = new Map(people.map(person => [person.id, person.name]));

  const byMaterial = new Map<string, { id: string; internId: string; done: boolean }[]>();
  for (const row of assignments.data ?? []) {
    const list = byMaterial.get(row.material_id as string) ?? [];
    list.push({
      id: row.id as string,
      internId: row.intern_id as string,
      done: !!row.completed_at,
    });
    byMaterial.set(row.material_id as string, list);
  }

  return (
    <div className="page">
      <div className="page-head">
        <div className="split">
          <div className="stack-sm">
            <span className="eyebrow">What interns read</span>
            <h1>Learning</h1>
          </div>
          {role === "admin" ? (
            <LearningEditor organizationId={organizationId} interns={people} />
          ) : null}
        </div>
        <p className="lede">
          Material exists here; an intern sees it only once it is assigned to them. There is no
          library to browse on their side, which is deliberate — assigned work is the whole shape of
          an internship here.
        </p>
      </div>

      <section className="panel">
        <div className="panel-head">
          <h2>{count((materials.data ?? []).length, "item")}</h2>
          <span className="hint">{(assignments.data ?? []).length} assignments</span>
        </div>
        {(materials.data ?? []).length === 0 ? (
          <EmptyState icon="book" title="Nothing added yet">
            Start with the two or three things every intern on a track needs in their first week.
            Assigning as the work needs it beats handing over a reading list on day one.
          </EmptyState>
        ) : (
          <div className="list">
            {(materials.data ?? []).map(material => {
              const given = byMaterial.get(material.id as string) ?? [];
              const readCount = given.filter(row => row.done).length;
              return (
                <div className="item" key={material.id} style={{ alignItems: "flex-start" }}>
                  <span className="item-main">
                    <b>{material.title}</b>
                    {material.summary ? <small>{material.summary}</small> : null}
                    <span className="cluster" style={{ marginTop: "var(--s2)" }}>
                      {material.track ? (
                        <span className="badge">{humanise(material.track).replace("Intern ", "")}</span>
                      ) : (
                        <span className="badge">Any track</span>
                      )}
                      {material.minutes ? <span className="badge">{material.minutes} min</span> : null}
                      <span className="hint">added {formatDate(material.created_at)}</span>
                      {material.url ? (
                        <a className="btn sm quiet" href={material.url as string}
                          target="_blank" rel="noopener noreferrer">
                          <span>Open</span>
                          <Icon name="external" size={13} />
                        </a>
                      ) : null}
                    </span>
                    {given.length > 0 ? (
                      <small style={{ marginTop: "var(--s2)" }}>
                        Given to {given.map(row => nameOf.get(row.internId) ?? "someone").join(", ")}
                        {" · "}{readCount} of {given.length} marked read
                      </small>
                    ) : (
                      <small style={{ marginTop: "var(--s2)" }}>Not assigned to anybody yet.</small>
                    )}
                  </span>
                  {role === "admin" ? (
                    <AssignMaterial
                      materialId={material.id as string}
                      organizationId={organizationId}
                      interns={people}
                      alreadyGiven={given.map(row => row.internId)}
                    />
                  ) : null}
                </div>
              );
            })}
          </div>
        )}
      </section>

      <p className="notice">
        <Icon name="info" size={14} />
        <span>
          Marking something read is the intern&rsquo;s own bookkeeping. Nobody is scored on it and
          it does not affect a certificate.
        </span>
      </p>
    </div>
  );
}
