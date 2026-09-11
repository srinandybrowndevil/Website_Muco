import { requireIntern } from "@/lib/intern";
import { createClient } from "@/lib/supabase/server";
import { InternShell } from "@/components/intern/InternShell";
import { EmptyState } from "@/components/EmptyState";
import { MarkRead } from "@/components/intern/MarkRead";

// Specification 11.3 item 5: "assigned material only".
//
// Deliberately not a library with a filter. An intern sees a material because
// a row points it at them, and a material nobody assigned them does not
// appear here at all -- the policy makes that true, not this query.

export const metadata = { title: "Your learning" };

type Row = {
  id: string;
  completed_at: string | null;
  material: { title: string; summary: string | null; url: string | null; minutes: number | null } | null;
};

export default async function InternLearningPage() {
  const { readOnly } = await requireIntern();
  const client = await createClient();
  if (!client) throw new Error("Configure Supabase before opening your learning.");

  const { data, error } = await client.from("learning_assignments")
    .select("id, completed_at, material:learning_materials(title, summary, url, minutes)")
    .order("assigned_at", { ascending: true });

  const rows = (data ?? []) as unknown as Row[];
  const done = rows.filter(row => row.completed_at).length;

  return (
    <InternShell readOnly={readOnly}>
      <div className="pagehead">
        <div>
          <p className="eyebrow">Internship</p>
          <h1>Your learning.</h1>
          <p>
            {rows.length > 0
              ? done + " of " + rows.length + " marked read. Nobody is checking this but you."
              : "What your mentor has asked you to read."}
          </p>
        </div>
      </div>

      {error && <p className="error" role="alert">Your learning could not be loaded. Refresh to try again.</p>}

      <section className="panel">
        {rows.length === 0 ? (
          <EmptyState icon="file" title="Nothing assigned yet"
            body="Your mentor assigns reading here. An empty list means none has been set, not that something is broken."
            note="You will only ever see material assigned to you, not a general library." />
        ) : rows.map(row => (
          <article className={row.completed_at ? "learnrow done" : "learnrow"} key={row.id}>
            <div>
              <b>{row.material?.title ?? "Material removed"}</b>
              <small>{[row.material?.minutes ? row.material.minutes + " min" : null].filter(Boolean).join(" · ")}</small>
              {row.material?.summary && <p className="taskdetail">{row.material.summary}</p>}
              {row.material?.url && (
                <p><a href={row.material.url} target="_blank" rel="noreferrer noopener">Open the material</a></p>
              )}
            </div>
            <MarkRead assignmentId={row.id} completedAt={row.completed_at} />
          </article>
        ))}
      </section>
    </InternShell>
  );
}
