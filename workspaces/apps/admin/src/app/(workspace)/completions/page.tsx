import Link from "next/link";
import type { Metadata } from "next";
import { requireAccount } from "@muco/core/server";
import { formatDate, humanise } from "@muco/core";
import { Bar, EmptyState, Icon, StatusPill } from "@muco/ui";
import { IssueCertificate } from "@/components/IssueCertificate";

export const metadata: Metadata = { title: "Completions" };

function one<T>(value: unknown): T | null {
  return ((Array.isArray(value) ? value[0] : value) ?? null) as T | null;
}

// Internships that have finished and are waiting on a decision.
//
// Three things sit beside each name because those are the three inputs to the
// decision: did the mentor recommend them, did they turn up, and is there
// already a certificate. Anything else is on the person's own page.
export default async function CompletionsPage() {
  const { supabase, organizationId, role } = await requireAccount("admin");

  const [interns, settings] = await Promise.all([
    supabase.from("intern_profiles")
      .select("id,user_id,track,tier,starts_at,ends_at,status,mentor_id,mentor_recommended_at,mentor_note,profiles!intern_profiles_user_id_fkey(full_name)")
      .eq("organization_id", organizationId)
      .in("status", ["completed", "certified"])
      .order("ends_at", { ascending: false }),
    supabase.from("organization_settings").select("attendance_threshold")
      .eq("organization_id", organizationId).maybeSingle(),
  ]);

  const threshold = settings.data?.attendance_threshold ?? 80;
  const rows = interns.data ?? [];

  const [attendance, certificates, mentors] = await Promise.all([
    Promise.all(rows.map(async row => {
      const { data } = await supabase.rpc("intern_attendance", { p_intern: row.id });
      return one<{ percent: number; days_logged: number; working_days: number }>(data);
    })),
    supabase.from("intern_certificates").select("intern_id,serial,issued_on")
      .eq("organization_id", organizationId),
    supabase.from("profiles").select("id,full_name")
      .in("id", rows.map(row => row.mentor_id).filter(Boolean) as string[]),
  ]);

  const certBy = new Map((certificates.data ?? []).map(row => [row.intern_id, row]));
  const mentorBy = new Map((mentors.data ?? []).map(row => [row.id, row.full_name as string]));

  return (
    <div className="page">
      <div className="page-head">
        <span className="eyebrow">Waiting on a decision</span>
        <h1>Completions</h1>
        <p className="lede">
          Internships that have finished. A mentor recommends; you approve. Attendance is shown
          rather than enforced — the count does not know that somebody worked through exam week.
        </p>
      </div>

      {rows.length === 0 ? (
        <EmptyState icon="checkCircle" title="No internships are waiting">
          An internship arrives here when it is marked complete, which happens on its end date or
          earlier if you close it.
        </EmptyState>
      ) : (
        <div className="stack">
          {rows.map((row, index) => {
            const days = attendance[index];
            const certificate = certBy.get(row.id);
            const name = one<{ full_name: string }>(row.profiles)?.full_name ?? "Intern";
            const percent = days?.percent ?? 0;
            return (
              <section className="panel" key={row.id}>
                <div className="panel-head">
                  <div className="stack-sm">
                    <h2>
                      <Link href={"/people/" + row.user_id}>{name}</Link>
                    </h2>
                    <span className="hint">
                      {humanise(row.track).replace("Intern ", "")} ·{" "}
                      {formatDate(row.starts_at)} to {formatDate(row.ends_at)}
                    </span>
                  </div>
                  <StatusPill value={row.status} />
                </div>
                <div className="panel-body stack">
                  <div className="stack-sm">
                    <div className="split">
                      <span className="hint">
                        {days ? days.days_logged + " of " + days.working_days + " working days logged" : "No log"}
                      </span>
                      <b className="tabular">{percent}% against {threshold}%</b>
                    </div>
                    <Bar
                      value={percent}
                      tone={percent >= threshold ? "ok" : percent >= threshold - 15 ? "warn" : "bad"}
                      label={"Attendance for " + name}
                    />
                  </div>

                  {row.mentor_recommended_at ? (
                    <div className="callout ok">
                      <Icon name="checkCircle" size={18} />
                      <div>
                        <b>
                          {mentorBy.get(row.mentor_id ?? "") ?? "Their mentor"} recommended this on{" "}
                          {formatDate(row.mentor_recommended_at)}.
                        </b>
                        <p>{row.mentor_note ?? "No note was left."}</p>
                      </div>
                    </div>
                  ) : (
                    <p className="notice">
                      <Icon name="clock" size={14} />
                      <span>
                        No mentor recommendation yet. You can still approve — the recommendation is
                        advice, not a gate.
                      </span>
                    </p>
                  )}

                  <div className="cluster">
                    {certificate ? (
                      <>
                        <span className="pill ok" data-shape="filled">Issued {formatDate(certificate.issued_on)}</span>
                        <span className="badge">{certificate.serial}</span>
                      </>
                    ) : role === "admin" ? (
                      <IssueCertificate
                        internId={row.id}
                        name={name.split(" ")[0]}
                        mentorName={mentorBy.get(row.mentor_id ?? "") ?? null}
                        attendance={percent}
                        threshold={threshold}
                      />
                    ) : (
                      <p className="notice">
                        <Icon name="lock" size={14} />
                        <span>Only an administrator issues a certificate.</span>
                      </p>
                    )}
                  </div>
                </div>
              </section>
            );
          })}
        </div>
      )}
    </div>
  );
}
