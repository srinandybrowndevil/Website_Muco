import { requireStaff } from "@/lib/staff";
import { createClient } from "@/lib/supabase/server";
import { StaffShell } from "@/components/staff/StaffShell";
import { EmptyState } from "@/components/EmptyState";
import { RecommendMentee } from "@/components/staff/RecommendMentee";

// Checklist 4.8: the interns this person mentors, and nobody else's.
//
// No user filter in the query. The policy restricts these rows to internships
// whose mentor_id is the signed-in person, and filtering again here would hide
// a policy regression instead of letting it surface where a test can catch it.

export const metadata = { title: "Your mentees" };

const TRACK: Record<string, string> = {
  intern_frontend: "Frontend", intern_backend: "Backend", intern_mobile: "Mobile",
  intern_design: "Design", intern_qa: "QA", intern_seo: "SEO",
};

function formatDate(value: string | null) {
  if (!value) return "—";
  return new Date(`${value}T00:00:00`).toLocaleDateString("en-IN", {
    day: "numeric", month: "short", year: "numeric",
  });
}

export default async function MenteesPage() {
  const { userId } = await requireStaff();
  const client = await createClient();
  if (!client) throw new Error("Configure Supabase before opening your mentees.");

  const [staff, mentees] = await Promise.all([
    client.from("staff_profiles").select("is_mentor").eq("user_id", userId).maybeSingle(),
    client.from("intern_profiles")
      .select("id, track, tier, starts_at, ends_at, status, mentor_recommended_at, person:profiles!intern_profiles_user_id_fkey(full_name)")
      .order("ends_at", { ascending: true }),
  ]);

  // The mentor flag decides whether this page means anything, not whether the
  // data is safe: an employee who is not a mentor has no mentees to return.
  if (!staff.data?.is_mentor) {
    return (
      <StaffShell>
        <div className="pagehead">
          <div>
            <p className="eyebrow">Staff</p>
            <h1>Your mentees.</h1>
          </div>
        </div>
        <section className="panel">
          <EmptyState icon="users" title="You are not marked as a mentor"
            body="Mentoring is a flag on your staff record, set by the founder. Until it is on, no interns are pointed at you and this page stays empty."
            note="Being a mentor is separate from your engineering role. It is not a promotion or a different workspace." />
        </section>
      </StaffShell>
    );
  }

  const rows = mentees.data ?? [];

  return (
    <StaffShell>
      <div className="pagehead">
        <div>
          <p className="eyebrow">Staff</p>
          <h1>Your mentees.</h1>
          <p>The interns pointed at you. You can read their record and their work log, and recommend them for completion.</p>
        </div>
      </div>

      <section className="panel">
        {mentees.error && (
          <p className="error" role="alert">Your mentees could not be loaded. Refresh to try again.</p>
        )}
        {!mentees.error && rows.length === 0 && (
          <EmptyState compact icon="users" title="No interns assigned to you yet"
            body="An intern appears here once the founder names you as their mentor. Nothing is hidden from you that you have been given." />
        )}
        {rows.map(row => {
          const person = row.person as unknown as { full_name: string | null } | null;
          const name = person?.full_name || "Name not set";
          return (
            <article className="menteecard" key={row.id}>
              <div>
                <b>{name}</b>
                <small>
                  {TRACK[String(row.track)] ?? row.track} · {formatDate(row.starts_at)} to {formatDate(row.ends_at)} · {row.status}
                </small>
              </div>
              <RecommendMentee internId={row.id} name={name}
                recommendedAt={row.mentor_recommended_at ?? null} />
            </article>
          );
        })}
      </section>

      <p className="invoicedoc-note">
        You see these interns because you mentor them. You cannot change their dates, their
        track or their status — those belong to the founder, and a recommendation from you is
        a recommendation, not an issue.
      </p>
    </StaffShell>
  );
}
