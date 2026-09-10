import { requireIntern } from "@/lib/intern";
import { createClient } from "@/lib/supabase/server";
import { InternShell } from "@/components/intern/InternShell";
import { EmptyState } from "@/components/EmptyState";

// Specification 14 item 10: the tier packs live in a table, so this reads them
// rather than restating them. An intern being able to see exactly what their
// tier reaches is the point -- guessing at your own permissions is how people
// end up asking for access they already have, or assuming they have access
// they do not.
const MODULE_LABEL: Record<string, string> = {
  own_profile: "Your own profile",
  work_log: "Your work log",
  learning: "Learning material",
  sandbox_project: "Practice project",
  client_code_redacted: "Client code, with customer details removed",
  analytics_aggregate: "Team analytics, totals only",
};

const LEVEL_LABEL: Record<string, string> = {
  none: "No access",
  read: "Can view",
  write: "Can view and change",
};

const TRACK_LABEL: Record<string, string> = {
  intern_frontend: "Frontend", intern_backend: "Backend", intern_mobile: "Mobile",
  intern_design: "Design", intern_qa: "QA", intern_seo: "SEO",
};

function formatDate(value: string) {
  return new Date(`${value}T00:00:00`).toLocaleDateString("en-IN", {
    day: "numeric", month: "long", year: "numeric",
  });
}

export default async function InternHome() {
  const { access, readOnly, userId } = await requireIntern();

  const client = await createClient();
  const permissions = client
    ? (await client.rpc("intern_permissions")).data as { module: string; level: string }[] | null
    : null;

  // Checklist 2.1 lists more than a countdown: the track somebody is on, when
  // they started, who their mentor is, and where their certificate stands.
  // Leaving those off meant an intern had to ask a person for facts the
  // workspace already held about them.
  const internship = client
    ? (await client.from("intern_profiles")
        .select("id, track, starts_at, status, mentor:profiles!intern_profiles_mentor_id_fkey(full_name)")
        .eq("user_id", userId).maybeSingle()).data
    : null;
  const certificate = client && internship
    ? (await client.from("intern_certificates")
        .select("serial, issued_on").eq("intern_id", internship.id).maybeSingle()).data
    : null;
  const mentorName = (internship?.mentor as unknown as { full_name: string | null } | null)?.full_name;

  return (
    <InternShell readOnly={readOnly}>
      <div className="pagehead">
        <div>
          <p className="eyebrow">Internship</p>
          <h1>Your internship.</h1>
          <p>
            {readOnly
              ? `Your internship ended on ${formatDate(access.ends_at)}. This workspace is read-only now.`
              : `Your internship ends on ${formatDate(access.ends_at)}. Access becomes read-only after that date.`}
          </p>
        </div>
        {!readOnly && (
          <span className="daysleft" aria-label={`${access.days_left} days remaining`}>
            <b>{access.days_left}</b>
            <small>{access.days_left === 1 ? "day left" : "days left"}</small>
          </span>
        )}
      </div>

      <section className="panel">
        <h2>Your internship</h2>
        <dl className="detaillist">
          <div><dt>Track</dt><dd>{TRACK_LABEL[String(internship?.track)] ?? "Not set"}</dd></div>
          <div><dt>Started</dt><dd>{internship?.starts_at ? formatDate(internship.starts_at) : "Not set"}</dd></div>
          <div><dt>Ends</dt><dd>{formatDate(access.ends_at)}</dd></div>
          <div><dt>Mentor</dt><dd>{mentorName || "Not assigned yet"}</dd></div>
          <div>
            <dt>Certificate</dt>
            <dd>
              {certificate
                ? `Issued ${formatDate(String(certificate.issued_on))} · ${certificate.serial}`
                : "Not issued yet. It appears once the founder approves it."}
            </dd>
          </div>
        </dl>
      </section>

      {permissions && permissions.length > 0 && (
        <section className="panel">
          <h2>What your internship opens</h2>
          <p>
            This is set by the length of your internship, not by asking. Anything not listed
            is outside an internship entirely — customer records, invoices and other projects
            are not part of it.
          </p>
          <ul className="permlist">
            {permissions.map(permission => (
              <li key={permission.module} className={permission.level === "none" ? "off" : undefined}>
                <span>{MODULE_LABEL[permission.module] ?? permission.module}</span>
                <b>{LEVEL_LABEL[permission.level] ?? permission.level}</b>
              </li>
            ))}
          </ul>
        </section>
      )}

      <section className="panel">
        <EmptyState
          icon="check"
          title="Nothing assigned yet"
          body="Your mentor assigns work here. Until then there is nothing you need to do — your dates and your certificate status are on this page and stay accurate on their own."
          note="You can see only the work assigned to you. Customer details, invoices and other projects are not part of an internship."
        />
      </section>
    </InternShell>
  );
}
