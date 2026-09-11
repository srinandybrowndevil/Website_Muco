import Link from "next/link";
import type { Metadata } from "next";
import { requireAccount } from "@muco/core/server";
import { formatDateTime } from "@muco/core";
import { EmptyState, Icon } from "@muco/ui";

export const metadata: Metadata = { title: "Audit log" };

function one<T>(value: unknown): T | null {
  return ((Array.isArray(value) ? value[0] : value) ?? null) as T | null;
}

// Who did what, when.
//
// The actor is resolved by preferring the live profile name, then the email
// captured when the line was written, then a phrase. That order matters and
// was wrong once: an earlier version put the email last, after a helper that
// never returns null, so the captured address could never have been displayed
// — and it is the only thing that survives the account being deleted.
export default async function AuditPage({
  searchParams,
}: {
  searchParams: Promise<{ action?: string; person?: string }>;
}) {
  const { action = "", person = "" } = await searchParams;
  const { supabase, organizationId } = await requireAccount("admin");

  let query = supabase
    .from("audit_events")
    .select("id,actor_id,actor_email,action,resource_type,resource_id,detail,occurred_at")
    .eq("organization_id", organizationId)
    .order("occurred_at", { ascending: false })
    .limit(200);

  if (action) query = query.eq("action", action);
  if (person) query = query.eq("actor_id", person);

  const [events, vocabulary, people] = await Promise.all([
    query,
    supabase.from("audit_actions").select("action,description").order("action"),
    supabase.from("memberships").select("user_id,profiles(full_name)").eq("organization_id", organizationId),
  ]);

  const nameBy = new Map(
    (people.data ?? []).map(row => [
      row.user_id as string,
      one<{ full_name: string }>(row.profiles)?.full_name ?? null,
    ]),
  );
  const describes = new Map((vocabulary.data ?? []).map(row => [row.action, row.description]));

  function actorOf(row: { actor_id: string | null; actor_email: string | null }) {
    if (row.actor_id && nameBy.get(row.actor_id)) return nameBy.get(row.actor_id)!;
    if (row.actor_email) return row.actor_email;
    return "An account that no longer exists";
  }

  return (
    <div className="page">
      <div className="page-head">
        <span className="eyebrow">Who did what</span>
        <h1>Audit log</h1>
        <p className="lede">
          Compensation views, certificate issues, grant changes, client invitations and anybody
          being switched off. Written by the database as it happens, not by a page — a page that
          forgets to log is a log with a hole in it.
        </p>
      </div>

      <div className="cluster">
        <Link className="chip" href="/audit" aria-current={!action ? "true" : undefined}>Everything</Link>
        {(vocabulary.data ?? []).map(row => (
          <Link
            className="chip"
            key={row.action}
            href={"/audit?action=" + encodeURIComponent(row.action)}
            aria-current={action === row.action ? "true" : undefined}
            title={row.description ?? undefined}
          >
            {row.action.replace(/[_.]/g, " ")}
          </Link>
        ))}
      </div>

      <section className="panel">
        <div className="panel-head">
          <h2>{(events.data ?? []).length === 200 ? "Most recent 200" : (events.data ?? []).length + " lines"}</h2>
          {person ? <Link className="btn sm quiet" href="/audit">Clear person filter</Link> : null}
        </div>
        {(events.data ?? []).length === 0 ? (
          <EmptyState icon="shield" title="Nothing recorded for this filter">
            The log fills as people work. An empty log on a live workspace is worth asking about.
          </EmptyState>
        ) : (
          <div className="tablewrap">
            <table>
              <caption className="sr-only">Audit events</caption>
              <thead>
                <tr>
                  <th scope="col">When</th>
                  <th scope="col">Who</th>
                  <th scope="col">What</th>
                  <th scope="col">On</th>
                </tr>
              </thead>
              <tbody>
                {(events.data ?? []).map(row => (
                  <tr key={row.id}>
                    <td>{formatDateTime(row.occurred_at)}</td>
                    <td>
                      {row.actor_id
                        ? <Link href={"/audit?person=" + row.actor_id}>{actorOf(row)}</Link>
                        : actorOf(row)}
                    </td>
                    <td title={describes.get(row.action) ?? undefined}>
                      {row.action.replace(/[_.]/g, " ")}
                    </td>
                    <td className="mono">
                      {row.resource_type}
                      {row.resource_id ? " " + String(row.resource_id).slice(0, 8) : ""}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <p className="notice">
        <Icon name="shield" size={14} />
        <span>
          Detail is filtered before it is stored: anything whose key looks like a password, a token,
          a bank account or an identity number is dropped rather than written.
        </span>
      </p>
    </div>
  );
}
