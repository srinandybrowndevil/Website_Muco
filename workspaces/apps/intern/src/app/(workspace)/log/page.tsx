import type { Metadata } from "next";
import { requireAccount } from "@muco/core/server";
import { formatDate } from "@muco/core";
import { EmptyState, Icon } from "@muco/ui";
import { WorkLogForm } from "@/components/WorkLogForm";

export const metadata: Metadata = { title: "Work log" };

export default async function WorkLogPage() {
  const { supabase, userId, organizationId } = await requireAccount("intern");

  const { data: internship } = await supabase
    .from("intern_profiles").select("id,status")
    .eq("user_id", userId).eq("organization_id", organizationId).maybeSingle();

  if (!internship) {
    return (
      <div className="page">
        <EmptyState icon="edit" title="No internship record yet">
          The work log belongs to an internship, and yours has not been set up.
        </EmptyState>
      </div>
    );
  }

  // Asia/Kolkata, not the server's clock. A log written at 9pm in Erode is
  // already tomorrow in UTC, and an entry filed against the wrong day is an
  // attendance percentage that disagrees with what the person actually did.
  const today = new Intl.DateTimeFormat("en-CA", {
    year: "numeric", month: "2-digit", day: "2-digit", timeZone: "Asia/Kolkata",
  }).format(new Date());

  const { data: entries } = await supabase
    .from("intern_work_logs").select("id,logged_on,summary,hours")
    .eq("intern_id", internship.id)
    .order("logged_on", { ascending: false })
    .limit(60);

  const todayEntry = (entries ?? []).find(entry => entry.logged_on === today) ?? null;

  return (
    <div className="page">
      <div className="page-head">
        <span className="eyebrow">Every working day</span>
        <h1>Work log</h1>
        <p className="lede">
          A few lines about what you did. Your attendance is counted from these entries rather than
          from a sign-in, so this is the record your certificate rests on.
        </p>
      </div>

      <section className="panel">
        <div className="panel-head">
          <h2>{todayEntry ? "Today, already written" : "Today"}</h2>
          <span className="hint">{formatDate(today)}</span>
        </div>
        <div className="panel-body">
          <WorkLogForm
            internId={internship.id}
            organizationId={organizationId}
            today={today}
            existing={todayEntry ? { summary: todayEntry.summary, hours: todayEntry.hours } : null}
          />
        </div>
      </section>

      <section className="panel">
        <div className="panel-head">
          <h2>Earlier days</h2>
          <span className="hint">{(entries ?? []).length} entries</span>
        </div>
        {(entries ?? []).length === 0 ? (
          <EmptyState icon="edit" title="Nothing logged yet">
            Start with today. Two or three lines is enough — this is a record of what happened, not
            a report anybody grades.
          </EmptyState>
        ) : (
          <div className="list">
            {(entries ?? []).map(entry => (
              <div className="item" key={entry.id} style={{ alignItems: "flex-start" }}>
                <span className="item-main">
                  <b>{formatDate(entry.logged_on)}</b>
                  <small style={{ whiteSpace: "pre-wrap", color: "var(--text-2)" }}>{entry.summary}</small>
                </span>
                {entry.hours ? <span className="badge">{entry.hours}h</span> : null}
              </div>
            ))}
          </div>
        )}
      </section>

      <p className="notice">
        <Icon name="info" size={14} />
        <span>
          Your mentor and the studio can read this. Nobody else can, including other interns.
        </span>
      </p>
    </div>
  );
}
