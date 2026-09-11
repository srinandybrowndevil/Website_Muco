import { redirect } from "next/navigation";
import type { Metadata } from "next";
import { requireAccount } from "@muco/core/server";
import { daysUntil, formatDate, humanise } from "@muco/core";
import { Bar, EmptyState, Icon, StatusPill } from "@muco/ui";
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

  return (
    <div className="page">
      <div className="page-head">
        <span className="eyebrow">Your mentees</span>
        <h1>Mentoring</h1>
        <p className="lede">
          The interns assigned to you. You can see their dates, their attendance and their work log,
          and you can recommend their completion — the founder issues the certificate.
        </p>
      </div>

      {(mentees ?? []).length === 0 ? (
        <EmptyState icon="users" title="Nobody is assigned to you right now">
          Interns are assigned a mentor when their internship is created.
        </EmptyState>
      ) : (
        <div className="stack">
          {(mentees ?? []).map((mentee, index) => {
            const days = attendance[index];
            const left = daysUntil(mentee.ends_at);
            const name = one<{ full_name: string }>(mentee.profiles)?.full_name ?? "Intern";
            const finished = mentee.status === "completed";
            return (
              <section className="panel" key={mentee.id}>
                <div className="panel-head">
                  <div className="stack-sm">
                    <h2>{name}</h2>
                    <span className="hint">
                      {humanise(mentee.track).replace("Intern ", "")} ·{" "}
                      {formatDate(mentee.starts_at)} to {formatDate(mentee.ends_at)}
                      {left !== null && left > 0 ? " · " + left + " days left" : ""}
                    </span>
                  </div>
                  <StatusPill value={mentee.status} />
                </div>
                <div className="panel-body stack">
                  <div className="stack-sm">
                    <div className="split">
                      <span className="hint">
                        {days
                          ? days.days_logged + " of " + days.working_days + " working days logged"
                          : "No attendance yet"}
                      </span>
                      <b className="tabular">{days?.percent ?? 0}%</b>
                    </div>
                    <Bar
                      value={days?.percent ?? 0}
                      tone={(days?.percent ?? 0) >= 80 ? "ok" : (days?.percent ?? 0) >= 65 ? "warn" : "bad"}
                      label={"Attendance for " + name}
                    />
                  </div>

                  <div className="cluster">
                    {finished ? (
                      <RecommendMentee
                        internId={mentee.id}
                        name={name.split(" ")[0]}
                        already={!!mentee.mentor_recommended_at}
                      />
                    ) : (
                      <p className="notice">
                        <Icon name="clock" size={14} />
                        <span>
                          A recommendation comes after the internship is marked complete. That
                          happens on the end date, or earlier if the studio closes it.
                        </span>
                      </p>
                    )}
                  </div>
                </div>
              </section>
            );
          })}
        </div>
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
