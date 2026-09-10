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

function formatDate(value: string) {
  return new Date(`${value}T00:00:00`).toLocaleDateString("en-IN", {
    day: "numeric", month: "long", year: "numeric",
  });
}

export default async function InternHome() {
  const { access, readOnly } = await requireIntern();

  const client = await createClient();
  const permissions = client
    ? (await client.rpc("intern_permissions")).data as { module: string; level: string }[] | null
    : null;

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
