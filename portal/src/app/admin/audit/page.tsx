import Link from "next/link";
import { AppShell } from "@/components/AppShell";
import { EmptyState } from "@/components/EmptyState";
import { requireWorkspace } from "@/lib/workspace";
import { createClient } from "@/lib/supabase/server";

// Specification 13: the founder can see who viewed compensation, who downloaded
// a certificate, who opened a client's personal details, who changed an access
// grant and who disabled an account.
//
// The rows are append-only in the database -- there is no update or delete
// policy on the table, for anyone, including whoever is reading this page. An
// audit log its subject can quietly edit is not an audit log, so this screen
// deliberately offers no way to tidy it up.

const PAGE_SIZE = 200;

type AuditRow = {
  id: number;
  action: string;
  resource_type: string;
  resource_id: string | null;
  detail: Record<string, unknown> | null;
  occurred_at: string;
  actor_id: string | null;
  actor_email: string | null;
  profiles: { full_name: string | null } | null;
};

const FILTERS = [
  { key: "all", label: "Everything" },
  { key: "money", label: "Compensation" },
  { key: "people", label: "People & access" },
  { key: "documents", label: "Documents" },
  { key: "views", label: "Views only" },
  { key: "limits", label: "Dropped entries" },
] as const;

const FILTER_ACTIONS: Record<string, string[]> = {
  money: ["compensation.view", "insert.compensation", "update.compensation", "delete.compensation"],
  people: ["insert.memberships", "update.memberships", "delete.memberships",
           "insert.project_grants", "update.project_grants", "delete.project_grants",
           "insert.intern_profiles", "update.intern_profiles", "delete.intern_profiles"],
  documents: ["certificate.view", "insert.intern_certificates", "update.intern_certificates",
              "delete.intern_certificates", "client_pii.view"],
  views: ["compensation.view", "certificate.view", "client_pii.view"],
  // Not a view, but the one entry a reader must never miss: it marks a stretch
  // where entries were dropped, so a gap in the trail is visible as a gap.
  limits: ["audit.rate_limited"],
};

// Said as a sentence about a person, because that is how it will be read when
// something has gone wrong and the founder is working out what happened.
function describe(row: AuditRow, nameOf: (id: unknown) => string): string {
  const detail = row.detail ?? {};
  const subject = nameOf(detail.subject);
  switch (row.action) {
    case "compensation.view": return "Opened their own compensation";
    case "certificate.view": return `Opened certificate ${String(detail.serial ?? "")}`.trim();
    case "client_pii.view": return "Opened a client's contact details";
    case "audit.rate_limited":
      return "Hit the recording limit — further entries from this account were dropped for a minute";
    case "insert.compensation": return `Recorded compensation for ${subject}`;
    case "update.compensation":
      return detail.amount_changed
        ? `Changed the amount for ${subject}`
        : `Updated the compensation record for ${subject}`;
    case "delete.compensation": return `Removed the compensation record for ${subject}`;
    case "insert.project_grants":
      return `Granted ${subject} ${String(detail.level ?? "")} on ${String(detail.module ?? "")}`;
    case "update.project_grants":
      return `Changed ${subject}'s access to ${String(detail.module ?? "")}`;
    case "delete.project_grants":
      return `Removed ${subject}'s access to ${String(detail.module ?? "")}`;
    case "insert.memberships": return `Added ${subject} as ${String(detail.role ?? "a member")}`;
    case "update.memberships": return `Changed ${subject} to ${String(detail.role ?? "another role")}`;
    case "delete.memberships": return `Removed ${subject}'s access entirely`;
    case "insert.intern_certificates": return `Issued certificate ${String(detail.serial ?? "")}`.trim();
    case "delete.intern_certificates": return `Withdrew certificate ${String(detail.serial ?? "")}`.trim();
    case "insert.intern_profiles": return `Started an internship for ${subject}`;
    case "update.intern_profiles":
      return `Set ${subject}'s internship to ${String(detail.status ?? "a new state")}`;
    case "delete.intern_profiles": return `Removed the internship record for ${subject}`;
    default: return row.action;
  }
}

function when(value: string) {
  return new Date(value).toLocaleString("en-IN", {
    day: "numeric", month: "short", year: "numeric",
    hour: "numeric", minute: "2-digit", timeZone: "Asia/Kolkata",
  });
}

export default async function AuditPage({
  searchParams,
}: {
  searchParams: Promise<{ filter?: string }>;
}) {
  const { organizationId } = await requireWorkspace();
  const { filter } = await searchParams;
  const active = FILTERS.some(f => f.key === filter) ? filter! : "all";

  const client = await createClient();
  if (!client) throw new Error("Configure Supabase before opening the audit log.");

  let query = client.from("audit_events")
    .select("id, action, resource_type, resource_id, detail, occurred_at, actor_id, actor_email, profiles(full_name)")
    .order("occurred_at", { ascending: false })
    .limit(PAGE_SIZE);
  if (active !== "all") query = query.in("action", FILTER_ACTIONS[active]);

  const [events, people] = await Promise.all([
    query,
    client.from("memberships").select("user_id, profiles(full_name)").eq("organization_id", organizationId),
  ]);

  const names = new Map<string, string>();
  for (const person of people.data ?? []) {
    const name = (person.profiles as unknown as { full_name: string | null } | null)?.full_name;
    if (name) names.set(person.user_id, name);
  }
  // An unresolved id reads as "someone no longer listed" rather than a raw
  // uuid: the row still counts as evidence after the account is gone.
  const nameOf = (id: unknown) =>
    typeof id === "string" ? names.get(id) ?? "someone no longer listed" : "someone";

  const rows = (events.data ?? []) as unknown as AuditRow[];

  return (
    <AppShell>
      <div className="page">
        <div className="pagehead">
          <div>
            <p className="eyebrow">Workspace / Audit log</p>
            <h1>Who did what.</h1>
            <p>
              Compensation opened, certificates issued, client details viewed, access granted
              or withdrawn. Entries cannot be edited or deleted by anyone, including you.
            </p>
          </div>
        </div>

        <nav className="filterbar" aria-label="Filter the audit log">
          {FILTERS.map(f => (
            <Link
              key={f.key}
              href={f.key === "all" ? "/admin/audit" : `/admin/audit?filter=${f.key}`}
              className={active === f.key ? "chip active" : "chip"}
              aria-current={active === f.key ? "true" : undefined}
            >
              {f.label}
            </Link>
          ))}
        </nav>

        {events.error && (
          <div className="panel error" role="alert">
            The audit log could not be read. This screen is limited to administrators.
          </div>
        )}

        <div className="panel">
          {!events.error && rows.length === 0 ? (
            <EmptyState
              icon="shield"
              title={active === "all" ? "Nothing recorded yet" : "Nothing matches this filter"}
              body={active === "all"
                ? "This fills in as people use their workspaces — opening compensation, issuing a certificate, changing someone's access. An empty log on a new workspace is expected, not a fault."
                : "No entries of this kind have been recorded yet. Try another filter."}
            />
          ) : (
            <div className="tablewrap">
              <table>
                <caption className="visually-hidden">Recorded actions, most recent first</caption>
                <thead>
                  <tr>
                    <th scope="col">When</th>
                    <th scope="col">Who</th>
                    <th scope="col">What</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map(row => (
                    <tr key={row.id}>
                      <td className="nowrap">{when(row.occurred_at)}</td>
                      <td>{row.profiles?.full_name ?? row.actor_email ?? nameOf(row.actor_id)}</td>
                      <td>{describe(row, nameOf)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {rows.length === PAGE_SIZE && (
          <p className="invoicedoc-note">
            Showing the most recent {PAGE_SIZE} entries. Older entries are kept and are not
            shown on this screen yet.
          </p>
        )}
      </div>
    </AppShell>
  );
}
