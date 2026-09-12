import { redirect } from "next/navigation";
import type { Metadata } from "next";
import { requireAccount } from "@muco/core/server";
import { daysUntil, formatDate, humanise } from "@muco/core";
import { Avatar, Bar, EmptyState, Icon, StatusPill } from "@muco/ui";
import { RecommendMentee } from "@/components/RecommendMentee";

export const metadata: Metadata = { title: "Mentoring" };

function one<T>(value: unknown): T | null {
  return ((Array.isArray(value) ? value[0] : value) ?? null) as T | null;
}

// The interns assigned to this person, and the one decision a mentor makes.
//
// Not every employee mentors, so somebody who does not is sent home rather than
// shown an empty page — an empty page implies they should have mentees and do
// not, which is a different and worrying message.
export default async function MentoringPage() {
  const { supabase, userId, organizationId } = await requireAccount("employee");

  const { data: staff } = await supabase
    .from("staff_profiles").select("is_mentor")
    .eq("user_id", userId).eq("organization_id", organizationId).maybeSingle();

  if (!staff?.is_mentor) redirect("/");

  const { data: mentees } = await supabase
    .from("intern_profiles")
    .select("id,track,tier,starts_at,ends_at,status,mentor_recommended_at,profiles!intern_profiles_user_id_fkey(full_name)")
    .eq("mentor_id", userId)
    .order("ends_at", { ascending: true });

  // Attendance is per intern and comes from a function that checks the caller
  // is the mentor, the intern, or the studio. Asking for all of them in
  // parallel is fine; asking for somebody else's would be refused.
  const attendance = await Promise.all(
    (mentees ?? []).map(async mentee => {
      const { data } = await supabase.rpc("intern_attendance", { p_intern: mentee.id });
      return one<{ days_logged: number; working_days: number; percent: number }>(data);
    }),
  );

  const menteeRows = mentees ?? [];
  const activeCount = menteeRows.filter(mentee => mentee.status === "active").length;
  const readyCount = menteeRows.filter(
    mentee => mentee.status === "completed" && !mentee.mentor_recommended_at,
  ).length;
  const attendanceRows = attendance.filter(
    (days): days is { days_logged: number; working_days: number; percent: number } => days !== null,
  );
  const averageAttendance = attendanceRows.length
    ? Math.round(attendanceRows.reduce((total, days) => total + days.percent, 0) / attendanceRows.length)
    : null;

  return (
    <div className="page">
      <div className="page-head mentor-page-head">
        <div className="mentor-page-head-row">
          <div className="stack-sm">
            <span className="eyebrow">Your mentees</span>
            <h1>Mentoring</h1>
          </div>
          <span className="mentor-scope"><Icon name="shield" size={14} /> Private mentor view</span>
        </div>
        <p className="lede">
          The interns assigned to you. You can see their dates, their attendance and their work log,
          and you can recommend their completion — the founder issues the certificate.
        </p>
      </div>

      {menteeRows.length === 0 ? (
        <EmptyState icon="users" title="Nobody is assigned to you right now">
          Interns are assigned a mentor when their internship is created.
        </EmptyState>
      ) : (
        <>
          <div className="mentor-stats" aria-label="Mentoring summary">
            <div className="mentor-stat">
              <span className="mentor-stat-label">Mentees</span>
              <strong className="mentor-stat-value">{menteeRows.length}</strong>
              <span className="mentor-stat-note">Assigned to you</span>
            </div>
            <div className="mentor-stat">
              <span className="mentor-stat-label">In progress</span>
              <strong className="mentor-stat-value">{activeCount}</strong>
              <span className="mentor-stat-note">Active internships</span>
            </div>
            <div className={"mentor-stat" + (readyCount > 0 ? " attention" : "")}>
              <span className="mentor-stat-label">Ready to recommend</span>
              <strong className="mentor-stat-value">{readyCount}</strong>
              <span className="mentor-stat-note">Completed, awaiting your note</span>
            </div>
            <div className="mentor-stat">
              <span className="mentor-stat-label">Average attendance</span>
              <strong className="mentor-stat-value">{averageAttendance === null ? "—" : `${averageAttendance}%`}</strong>
              <span className="mentor-stat-note">Across available logs</span>
            </div>
          </div>

          <div className="mentee-grid" role="list" aria-label="Assigned mentees">
          {menteeRows.map((mentee, index) => {
            const days = attendance[index];
            const left = daysUntil(mentee.ends_at);
            const name = one<{ full_name: string }>(mentee.profiles)?.full_name ?? "Intern";
            const finished = mentee.status === "completed";
            return (
              <section className="panel mentee-card" key={mentee.id} role="listitem" aria-labelledby={`mentee-${mentee.id}`}>
                <div className="panel-head mentee-card-head">
                  <div className="mentee-identity">
                    <Avatar name={name} size="md" />
                    <div className="stack-sm">
                      <h2 id={`mentee-${mentee.id}`}>{name}</h2>
                      <span className="hint">
                      {humanise(mentee.track).replace("Intern ", "")} ·{" "}
                      {formatDate(mentee.starts_at)} to {formatDate(mentee.ends_at)}
                      {left !== null && left > 0 ? " · " + left + " days left" : ""}
                      </span>
                    </div>
                  </div>
                  <StatusPill value={mentee.status} />
                </div>
                <div className="panel-body mentee-card-body">
                  <div className="mentee-progress stack-sm">
                    <div className="split">
                      <div className="stack-sm">
                        <span className="eyebrow">Attendance</span>
                        <strong className="mentee-percent tabular">{days?.percent ?? 0}%</strong>
                      </div>
                      <span className="hint">
                        {days
                          ? days.days_logged + " of " + days.working_days + " working days logged"
                          : "No attendance logged yet"}
                      </span>
                    </div>
                    <Bar
                      value={days?.percent ?? 0}
                      tone={(days?.percent ?? 0) >= 80 ? "ok" : (days?.percent ?? 0) >= 65 ? "warn" : "bad"}
                      label={"Attendance for " + name}
                    />
                  </div>

                  <div className="mentee-next">
                    <div className="mentee-next-copy">
                      <span className="eyebrow">{mentee.mentor_recommended_at ? "Recommendation sent" : finished ? "Next step" : "Keep going"}</span>
                      <p>
                        {mentee.mentor_recommended_at
                          ? `Sent on ${formatDate(mentee.mentor_recommended_at)}. The founder reviews and issues the certificate.`
                          : finished
                          ? "Share a short note with the founder so they can review the completion."
                          : "A recommendation unlocks when the internship is marked complete."}
                      </p>
                    </div>
                    {finished ? (
                      <RecommendMentee
                        internId={mentee.id}
                        name={name.split(" ")[0]}
                        already={!!mentee.mentor_recommended_at}
                      />
                    ) : (
                      <span className="mentor-state"><Icon name="clock" size={14} /> In progress</span>
                    )}
                  </div>
                </div>
              </section>
            );
          })}
          </div>
        </>
      )}

      <p className="notice">
        <Icon name="shield" size={14} />
        <span>
          You can read the work log of somebody you mentor. You cannot read anybody else&rsquo;s,
          and no intern can read another&rsquo;s.
        </span>
      </p>
    </div>
  );
}
