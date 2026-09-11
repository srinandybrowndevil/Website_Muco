import Link from "next/link";
import type { Metadata } from "next";
import { requireAccount } from "@muco/core/server";
import { formatDate, relativeDays } from "@muco/core";
import { EmptyState, Icon, Metric } from "@muco/ui";

export const metadata: Metadata = { title: "Home" };

// PostgREST returns an embedded one-to-one as an object, and the generated
// types describe it as an array often enough that both shapes have to be
// handled. Getting this wrong renders "[object Object]" where a name belongs.
function nameOf(value: unknown): string {
  const row = Array.isArray(value) ? value[0] : value;
  return (row as { full_name?: string } | null)?.full_name ?? "Somebody";
}

function projectName(value: unknown): string {
  const row = Array.isArray(value) ? value[0] : value;
  return (row as { name?: string } | null)?.name ?? "";
}

type QueueRow = { icon: string; href: string; what: string; detail: string; when: string };

// Counts are a state of the world. A queue is a list of obligations. The queue
// goes first, because opening this page to five numbers and no instruction is
// how a founder ends up checking five screens to find the one that needed them.
export default async function AdminHome() {
  const { supabase, organizationId, fullName } = await requireAccount("admin");
  const org = { organization_id: organizationId };
  const today = new Date().toISOString().slice(0, 10);
  const inAWeek = new Date(Date.now() + 7 * 86_400_000).toISOString().slice(0, 10);

  const [interns, staff, clients, pending, expiring, enquiries, requests, recent] = await Promise.all([
    supabase.from("intern_profiles").select("id", { count: "exact", head: true })
      .match(org).eq("status", "active"),
    supabase.from("staff_profiles").select("id", { count: "exact", head: true })
      .match(org).eq("status", "active"),
    supabase.from("memberships").select("user_id", { count: "exact", head: true })
      .match(org).eq("role", "client").is("disabled_at", null),
    supabase.from("intern_profiles")
      .select("id,ends_at,mentor_recommended_at,profiles!intern_profiles_user_id_fkey(full_name)")
      .match(org).eq("status", "completed").order("ends_at", { ascending: true }),
    supabase.from("project_grants")
      .select("id,module,level,ends_at,projects(name),profiles!project_grants_user_id_fkey(full_name)")
      .match(org).gte("ends_at", today).lte("ends_at", inAWeek).order("ends_at", { ascending: true }),
    supabase.from("website_enquiries").select("id,name,business,created_at")
      .match(org).eq("status", "new").order("created_at", { ascending: false }).limit(4),
    supabase.from("project_requests").select("id,title,status,created_at")
      .match(org).in("status", ["new", "reviewing"]).order("created_at", { ascending: false }).limit(4),
    supabase.from("audit_events").select("id,action,resource_type,occurred_at,actor_email")
      .match(org).order("occurred_at", { ascending: false }).limit(8),
  ]);

  const queue: QueueRow[] = [
    ...(pending.data ?? []).map(row => ({
      icon: "award",
      href: "/completions",
      what: "Approve a certificate",
      detail: nameOf(row.profiles) + " finished on " + formatDate(row.ends_at) +
        (row.mentor_recommended_at ? ", mentor has recommended" : ", no mentor recommendation yet"),
      when: relativeDays(row.ends_at),
    })),
    ...(expiring.data ?? []).map(row => ({
      icon: "key",
      href: "/grants",
      what: "A grant is about to expire",
      detail: nameOf(row.profiles) + " - " + row.module + " at " + row.level +
        (projectName(row.projects) ? " on " + projectName(row.projects) : ""),
      when: relativeDays(row.ends_at),
    })),
    ...(requests.data ?? []).map(row => ({
      icon: "fileText",
      href: "/requests/" + row.id,
      what: "A customer request is open",
      detail: row.title,
      when: relativeDays(row.created_at),
    })),
    ...(enquiries.data ?? []).map(row => ({
      icon: "inbox",
      href: "/enquiries",
      what: "A new enquiry from the website",
      detail: [row.name, row.business].filter(Boolean).join(" - "),
      when: relativeDays(row.created_at),
    })),
  ];

  const firstName = (fullName ?? "").split(" ")[0];
  const toApprove = pending.data?.length ?? 0;
  const lapsing = expiring.data?.length ?? 0;

  return (
    <div className="page">
      <div className="page-head">
        <span className="eyebrow">MUCO LABS</span>
        <h1>{firstName ? "Good to see you, " + firstName : "The studio"}</h1>
        <p className="lede">
          Everything waiting on you is in the first list. The counts below are the shape of the
          studio right now, and each one opens the screen it came from.
        </p>
      </div>

      <section className="panel" aria-labelledby="queue-heading">
        <div className="panel-head">
          <h2 id="queue-heading">Waiting on you</h2>
          {queue.length > 0 ? <span className="badge accent">{queue.length}</span> : null}
        </div>
        {queue.length === 0 ? (
          <EmptyState icon="checkCircle" title="Nothing is waiting on you">
            No certificates to approve, no grants expiring this week, and no unanswered enquiries or
            requests. This list fills itself; you do not have to go looking.
          </EmptyState>
        ) : (
          <div className="queue">
            {queue.slice(0, 8).map((row, index) => (
              <Link className="item" href={row.href} key={row.href + index}>
                <span className="kind"><Icon name={row.icon} size={15} /></span>
                <span className="item-main">
                  <b>{row.what}</b>
                  <small className="truncate">{row.detail}</small>
                </span>
                <span className="when">{row.when}</span>
                <Icon name="chevronRight" size={15} />
              </Link>
            ))}
          </div>
        )}
      </section>

      <section className="grid" aria-label="Studio counts">
        <Metric label="Active interns" value={interns.count ?? 0} href="/people?type=intern"
          note="Inside their start and end dates" />
        <Metric label="Active staff" value={staff.count ?? 0} href="/people?type=employee"
          note="Employees and contracted builders" />
        <Metric label="Clients" value={clients.count ?? 0} href="/people?type=client"
          note="Accounts that can open the client workspace" />
        <Metric label="Certificates to approve" value={toApprove} href="/completions"
          attention={toApprove > 0} note="Internships marked complete" />
        <Metric label="Grants expiring in 7 days" value={lapsing} href="/grants"
          attention={lapsing > 0} note="Access that lapses without a decision" />
      </section>

      <section className="panel" aria-labelledby="recent-heading">
        <div className="panel-head">
          <h2 id="recent-heading">Recently recorded</h2>
          <Link className="btn sm quiet" href="/audit">
            <span>Full audit log</span>
            <Icon name="arrowRight" size={14} />
          </Link>
        </div>
        {(recent.data ?? []).length === 0 ? (
          <EmptyState icon="shield" title="Nothing recorded yet">
            Compensation views, certificate downloads, grant changes and anybody being switched off
            are all written here as they happen.
          </EmptyState>
        ) : (
          <div className="list">
            {(recent.data ?? []).map(row => (
              <div className="item" key={row.id}>
                <span className="item-main">
                  <b>{row.action.replace(/[_.]/g, " ")}</b>
                  <small>{row.resource_type} - {row.actor_email ?? "actor no longer has an account"}</small>
                </span>
                <span className="when">{relativeDays(row.occurred_at)}</span>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
