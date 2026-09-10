import { redirect } from "next/navigation";
import { AppShell } from "@/components/AppShell";
import { EmptyState } from "@/components/EmptyState";
import { requireWorkspace } from "@/lib/workspace";
import { createClient } from "@/lib/supabase/server";
import { homeForRole } from "@/lib/auth";
import { IssueCertificate } from "@/components/admin/IssueCertificate";
import { readSettings } from "@/lib/settings";

// Checklist 6.9: certificates waiting on the founder.
//
// "Pending" is not a column anywhere and should not become one. An internship
// is waiting for a certificate when it has finished -- by its end date, or
// because the founder marked it completed early -- and no certificate row
// exists for it yet. Storing that as a status would create two facts that can
// disagree with each other.

export const metadata = { title: "Certificates" };

const TRACK: Record<string, string> = {
  intern_frontend: "Frontend", intern_backend: "Backend", intern_mobile: "Mobile",
  intern_design: "Design", intern_qa: "QA", intern_seo: "SEO",
};

function formatDate(value: string | null) {
  if (!value) return "—";
  return new Date(value + "T00:00:00").toLocaleDateString("en-IN", {
    day: "numeric", month: "short", year: "numeric",
  });
}

type Certificate = {
  intern_id: string; serial: string; issued_on: string; tools: string[] | null;
  approved_by_name: string;
};

export default async function CertificatesPage() {
  const { organizationId, role } = await requireWorkspace();
  // Issuing is an administrator's act. A member reaching this page is not an
  // attack, but it is the wrong screen for them and the function would refuse.
  if (role !== "admin") redirect(homeForRole(role));

  const client = await createClient();
  if (!client) throw new Error("Configure Supabase before opening certificates.");

  const [interns, certificates, settings] = await Promise.all([
    client.from("intern_profiles")
      .select("id, track, starts_at, ends_at, status, mentor_recommended_at, mentor_note, person:profiles!intern_profiles_user_id_fkey(full_name), mentor:profiles!intern_profiles_mentor_id_fkey(full_name)")
      .eq("organization_id", organizationId)
      .order("ends_at", { ascending: true }),
    client.from("intern_certificates")
      .select("intern_id, serial, issued_on, tools, approved_by_name")
      .eq("organization_id", organizationId),
    readSettings(organizationId),
  ]);

  const issued = new Map(
    ((certificates.data ?? []) as unknown as Certificate[]).map(c => [c.intern_id, c]));
  const today = new Date().toISOString().slice(0, 10);

  const rows = (interns.data ?? []).map(row => {
    const person = row.person as unknown as { full_name: string | null } | null;
    const mentor = row.mentor as unknown as { full_name: string | null } | null;
    const certificate = issued.get(row.id) ?? null;
    const finished = row.status === "completed" || row.status === "certified"
      || String(row.ends_at) < today;
    return {
      id: row.id as string,
      name: person?.full_name || "Name not set",
      mentorName: mentor?.full_name ?? null,
      track: TRACK[String(row.track)] ?? String(row.track),
      endsAt: row.ends_at as string,
      status: row.status as string,
      recommendedAt: (row.mentor_recommended_at as string | null) ?? null,
      mentorNote: (row.mentor_note as string | null) ?? null,
      certificate,
      waiting: finished && !certificate,
    };
  });

  const waiting = rows.filter(r => r.waiting);

  // Attendance is computed from the work log rather than stored, and it is
  // read only for the internships actually awaiting a decision -- there is no
  // reason to measure somebody whose certificate was issued last month.
  const attendance = new Map(await Promise.all(waiting.map(async row => {
    const { data } = await client.rpc("intern_attendance", { p_intern: row.id });
    const first = Array.isArray(data) ? data[0] : data;
    return [row.id, first as { days_logged: number; working_days: number; percent: number } | null] as const;
  })));
  const done = rows.filter(r => r.certificate);
  const running = rows.filter(r => !r.waiting && !r.certificate);
  const failed = interns.error || certificates.error;

  return (
    <AppShell>
      <div className="page">
        <div className="pagehead">
          <div>
            <p className="eyebrow">Workspace / Certificates</p>
            <h1>Certificates.</h1>
            <p>A certificate exists only because you approved it. Nothing here issues itself, and nobody else can issue one.</p>
          </div>
        </div>

        {failed && (
          <div className="panel error" role="alert">
            Some records could not be loaded. Refresh before issuing anything.
          </div>
        )}

        <section className="panel">
          <h2>Waiting for you ({waiting.length})</h2>
          {waiting.length === 0 ? (
            <EmptyState compact icon="check" title="Nothing waiting"
              body="An internship appears here once it has finished — by its end date, or because you marked it completed early — and has no certificate yet." />
          ) : waiting.map(row => (
            <article className="menteecard" key={row.id}>
              <div>
                <b>{row.name}</b>
                <small>{row.track} · ended {formatDate(row.endsAt)} · {row.status}</small>
              </div>
              <div className="issuewrap">
                {(() => {
                  const seen = attendance.get(row.id);
                  if (!seen || seen.working_days === 0) return null;
                  const short = seen.percent < settings.attendanceThreshold;
                  return (
                    <p className={short ? "attendance short" : "attendance"}>
                      <b>{seen.percent}%</b> attendance — {seen.days_logged} of {seen.working_days} working days logged
                      {short ? ` · below your ${settings.attendanceThreshold}% threshold` : ""}
                    </p>
                  );
                })()}
                <IssueCertificate internId={row.id} name={row.name} mentorName={row.mentorName}
                  mentorNote={row.mentorNote} recommendedAt={row.recommendedAt} />
              </div>
            </article>
          ))}
        </section>

        {running.length > 0 && (
          <section className="panel">
            <h2>Still running ({running.length})</h2>
            <p className="muted">
              These internships have not finished. Mark one completed on the people screen if
              you are closing it early; until then a certificate would certify work not yet done.
            </p>
            {running.map(row => (
              <article className="portalf" key={row.id}>
                <div><b>{row.name}</b><small>{row.track} · ends {formatDate(row.endsAt)}</small></div>
              </article>
            ))}
          </section>
        )}

        <section className="panel">
          <h2>Issued ({done.length})</h2>
          {done.length === 0 ? (
            <EmptyState compact icon="file" title="None issued yet"
              body="Once you issue a certificate it appears here with its serial, and stays here permanently — expiry closes access, it does not delete the record." />
          ) : (
            <div className="tablewrap">
              <table>
                <caption className="visually-hidden">Certificates issued</caption>
                <thead>
                  <tr>
                    <th scope="col">Name</th><th scope="col">Serial</th>
                    <th scope="col">Issued</th><th scope="col">Approved by</th>
                    <th scope="col">Tools</th>
                  </tr>
                </thead>
                <tbody>
                  {done.map(row => (
                    <tr key={row.id}>
                      <td>{row.name}</td>
                      <td className="mono">{row.certificate?.serial}</td>
                      <td>{formatDate(row.certificate?.issued_on ?? null)}</td>
                      <td>{row.certificate?.approved_by_name || "—"}</td>
                      <td>{(row.certificate?.tools ?? []).join(", ") || "—"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
      </div>
    </AppShell>
  );
}
