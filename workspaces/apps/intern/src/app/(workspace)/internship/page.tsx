import type { Metadata } from "next";
import { requireAccount } from "@muco/core/server";
import { formatDate, humanise } from "@muco/core";
import { Bar, Callout, EmptyState, Fact, Facts, Icon, StatusPill } from "@muco/ui";

export const metadata: Metadata = { title: "My internship" };

const MONTHS: Record<string, string> = { m1: "One month", m2: "Two months", m3: "Three months" };

// The record, and the rules that come with it. Both on one page on purpose: an
// intern who wants to know what they are allowed to ask for should find it in
// the same place as their dates, not in an email they have lost.
export default async function InternshipPage() {
  const { supabase, userId, organizationId } = await requireAccount("intern");

  const { data: internship } = await supabase
    .from("intern_profiles")
    .select("id,track,tier,starts_at,ends_at,status,college,grace_days,mentor_id,mentor_recommended_at,mentor_note")
    .eq("user_id", userId).eq("organization_id", organizationId).maybeSingle();

  if (!internship) {
    return (
      <div className="page">
        <EmptyState icon="calendar" title="No internship record yet">
          The studio has to set your track and dates before this page has anything to show.
        </EmptyState>
      </div>
    );
  }

  const [mentor, attendance, settings] = await Promise.all([
    internship.mentor_id
      ? supabase.from("profiles").select("full_name").eq("id", internship.mentor_id).maybeSingle()
      : Promise.resolve({ data: null }),
    supabase.rpc("intern_attendance", { p_intern: internship.id }),
    supabase.from("organization_settings").select("attendance_threshold")
      .eq("organization_id", organizationId).maybeSingle(),
  ]);

  const one = <T,>(v: unknown) => ((Array.isArray(v) ? v[0] : v) ?? null) as T | null;
  const days = one<{ days_logged: number; working_days: number; percent: number }>(attendance.data);
  const threshold = settings.data?.attendance_threshold ?? 80;
  const percent = days?.percent ?? 0;

  return (
    <div className="page">
      <div className="page-head">
        <span className="eyebrow">Your record</span>
        <h1>My internship</h1>
        <p className="lede">
          These are the facts the studio holds about your internship. You cannot change them here —
          your dates, track and mentor are set by the studio, and your certificate is issued from
          them.
        </p>
      </div>

      <section className="panel">
        <div className="panel-body">
          <Facts>
            <Fact label="Status"><StatusPill value={internship.status} /></Fact>
            <Fact label="Track">{humanise(internship.track).replace("Intern ", "")}</Fact>
            <Fact label="Duration">{MONTHS[internship.tier] ?? internship.tier}</Fact>
            <Fact label="Starts">{formatDate(internship.starts_at)}</Fact>
            <Fact label="Ends">{formatDate(internship.ends_at)}</Fact>
            <Fact label="Mentor">{one<{ full_name: string }>(mentor?.data)?.full_name ?? "Not assigned yet"}</Fact>
            <Fact label="College">{internship.college ?? "Not recorded"}</Fact>
            <Fact label="Grace period">{internship.grace_days} days of read-only access after the end date</Fact>
          </Facts>
        </div>
      </section>

      <section className="panel">
        <div className="panel-head"><h2>Attendance</h2></div>
        <div className="panel-body stack">
          <div className="split">
            <span className="hint">
              {days ? days.days_logged + " days logged of " + days.working_days + " working days" : "No days logged yet"}
            </span>
            <b className="tabular">{percent}%</b>
          </div>
          <Bar
            value={percent}
            tone={percent >= threshold ? "ok" : percent >= threshold - 15 ? "warn" : "bad"}
            label="Attendance against the studio threshold"
          />
          <p className="hint">
            Counted from your daily work log, not from a sign-in. The studio looks for {threshold}%
            when approving a certificate, and treats it as information rather than a gate — somebody
            closing an internship early knows something a count does not.
          </p>
        </div>
      </section>

      {internship.mentor_recommended_at ? (
        <Callout tone="ok" icon="checkCircle" title="Your mentor has recommended your completion">
          {internship.mentor_note ?? "No note was left."}
        </Callout>
      ) : null}

      <section className="panel">
        <div className="panel-head"><h2>What this internship does not include</h2></div>
        <div className="panel-body stack-sm">
          <p className="hint">
            Worth saying plainly rather than letting you find out by being refused. None of this is
            about trust; it is how the studio keeps its promises to the people who pay it.
          </p>
          <ul className="stack-sm" style={{ listStyle: "none" }}>
            {[
              "Customer phone numbers, email addresses and other contact details",
              "Invoices, budgets, and anything else about what a project costs",
              "Source code for client projects you are not assigned to",
              "The studio's own products, unless you are given a sandbox copy",
              "Other people's compensation, including other interns",
            ].map(line => (
              <li className="notice" key={line}>
                <Icon name="lock" size={14} />
                <span>{line}</span>
              </li>
            ))}
          </ul>
        </div>
      </section>
    </div>
  );
}
