import { requireIntern } from "@/lib/intern";
import { createClient } from "@/lib/supabase/server";
import { InternShell } from "@/components/intern/InternShell";
import { WorkLogForm } from "@/components/intern/WorkLogForm";
import { EmptyState } from "@/components/EmptyState";

// The studio's calendar day, not the viewer's. An intern travelling or a
// laptop left on another time zone should not be able to log tomorrow.
function studioToday() {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Kolkata" }).format(new Date());
}

export default async function WorkLogPage() {
  const { organizationId, userId, readOnly } = await requireIntern();
  const client = await createClient();
  if (!client) throw new Error("Configure Supabase before opening the work log.");

  // The identifier this page writes against. If the read fails and the
  // failure is swallowed, the form still renders and every entry it
  // submits is refused with no explanation -- the same shape as the
  // certificate bug.
  const { data: profile, error: profileError } = await client.from("intern_profiles")
    .select("id").eq("user_id", userId).maybeSingle();
  if (profileError) throw new Error("Your internship record could not be read, so the work log cannot be opened.");
  const { data: entries, error } = await client.from("intern_work_logs")
    .select("id, logged_on, summary, hours")
    .order("logged_on", { ascending: false })
    .limit(120);

  return (
    <InternShell readOnly={readOnly}>
      <div className="pagehead">
        <div>
          <p className="eyebrow">Internship / Work log</p>
          <h1>What you worked on.</h1>
          <p>{readOnly
            ? "Your internship has ended, so the log is now read-only. Everything you wrote stays here."
            : "One entry a day. Your mentor reads this, and the days you log count towards your certificate."}</p>
        </div>
      </div>

      {!readOnly && profile && (
        <section className="panel">
          <h2>Add today</h2>
          <WorkLogForm organizationId={organizationId} internId={profile.id} today={studioToday()} />
        </section>
      )}

      <section className="panel">
        <h2>Your entries</h2>
        {error && <p className="error" role="alert">Your entries could not be loaded. Refresh to try again.</p>}
        {!error && !entries?.length && (
          <EmptyState compact icon="check" title="No entries yet"
            body="Write one line at the end of each day. It takes a minute, it is what your mentor reads before a review, and the days you log are what the certificate counts." />
        )}
        {entries?.map(entry => (
          <article className="portalf" key={entry.id}>
            <div>
              <b>{new Date(`${entry.logged_on}T00:00:00`).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}</b>
              <small>{entry.summary}{entry.hours ? ` · ${entry.hours} h` : ""}</small>
            </div>
          </article>
        ))}
      </section>
    </InternShell>
  );
}
