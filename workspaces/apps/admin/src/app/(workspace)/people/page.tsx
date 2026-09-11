import Link from "next/link";
import type { Metadata } from "next";
import { requireAccount } from "@muco/core/server";
import { formatDate, humanise } from "@muco/core";
import { Avatar, EmptyState, Icon, StatusPill } from "@muco/ui";

export const metadata: Metadata = { title: "People" };

const TYPES: [string, string][] = [
  ["", "Everyone"],
  ["admin", "Admins"],
  ["member", "Members"],
  ["employee", "Staff"],
  ["intern", "Interns"],
  ["client", "Clients"],
];

function one<T>(value: unknown): T | null {
  return ((Array.isArray(value) ? value[0] : value) ?? null) as T | null;
}

// Everybody with a membership, filtered by what they are.
//
// Deliberately one list rather than four. An admin looking for a person knows
// their name, not which table they live in, and four tabs makes "is this
// person switched off" a question you have to ask in four places.
export default async function PeoplePage({
  searchParams,
}: {
  searchParams: Promise<{ type?: string; q?: string }>;
}) {
  const { type = "", q = "" } = await searchParams;
  const { supabase, organizationId } = await requireAccount("admin");

  const { data: rows } = await supabase
    .from("memberships")
    .select("user_id,role,disabled_at,disabled_reason,profiles(full_name,phone)")
    .eq("organization_id", organizationId);

  const [interns, staff, customers] = await Promise.all([
    supabase.from("intern_profiles").select("user_id,track,tier,starts_at,ends_at,status")
      .eq("organization_id", organizationId),
    supabase.from("staff_profiles").select("user_id,roles,is_mentor,status,started_on")
      .eq("organization_id", organizationId),
    supabase.from("customers").select("auth_user_id,company,name")
      .eq("organization_id", organizationId).not("auth_user_id", "is", null),
  ]);

  const internBy = new Map((interns.data ?? []).map(row => [row.user_id, row]));
  const staffBy = new Map((staff.data ?? []).map(row => [row.user_id, row]));
  const customerBy = new Map((customers.data ?? []).map(row => [row.auth_user_id as string, row]));

  const needle = q.trim().toLowerCase();
  const people = (rows ?? [])
    .map(row => ({
      userId: row.user_id as string,
      role: row.role as string,
      disabledAt: row.disabled_at as string | null,
      disabledReason: row.disabled_reason as string | null,
      name: one<{ full_name: string }>(row.profiles)?.full_name ?? "Unnamed",
    }))
    .filter(person => (type ? person.role === type : true))
    .filter(person => (needle ? person.name.toLowerCase().includes(needle) : true))
    .sort((a, b) =>
      Number(!!a.disabledAt) - Number(!!b.disabledAt) || a.name.localeCompare(b.name));

  function secondLine(person: { userId: string; role: string }) {
    const intern = internBy.get(person.userId);
    if (intern) {
      return humanise(intern.track).replace("Intern ", "") + " · " +
        formatDate(intern.starts_at) + " to " + formatDate(intern.ends_at);
    }
    const member = staffBy.get(person.userId);
    if (member) {
      return (member.roles ?? []).join(", ") + (member.is_mentor ? " · mentor" : "") +
        " · since " + formatDate(member.started_on);
    }
    const customer = customerBy.get(person.userId);
    if (customer) return customer.company || customer.name;
    return "Runs the studio";
  }

  function state(person: { userId: string; role: string; disabledAt: string | null }) {
    if (person.disabledAt) return "closed";
    return internBy.get(person.userId)?.status ?? staffBy.get(person.userId)?.status ?? "active";
  }

  return (
    <div className="page">
      <div className="page-head">
        <div className="split">
          <div className="stack-sm">
            <span className="eyebrow">Everybody with access</span>
            <h1>People</h1>
          </div>
          <div className="cluster">
            <Link className="btn sm" href="/people/invite/intern">Invite an intern</Link>
            <Link className="btn sm" href="/people/invite/staff">Invite staff</Link>
            <Link className="btn sm primary" href="/people/invite/client">Invite a client</Link>
          </div>
        </div>
        <p className="lede">
          One list rather than four, because you are usually looking for a person rather than for a
          kind of person. Somebody switched off stays here, at the bottom, with the reason.
        </p>
      </div>

      <div className="cluster">
        {TYPES.map(([value, label]) => (
          <Link
            className="chip"
            key={value || "all"}
            href={value ? "/people?type=" + value : "/people"}
            aria-current={type === value ? "true" : undefined}
          >
            {label}
          </Link>
        ))}
      </div>

      <section className="panel">
        <div className="panel-head">
          <h2>{people.length === 1 ? "1 person" : people.length + " people"}</h2>
          <span className="hint">{(rows ?? []).filter(r => r.disabled_at).length} switched off</span>
        </div>
        {people.length === 0 ? (
          <EmptyState icon="users" title="Nobody here yet">
            People arrive by invitation. Start with the buttons above — an invitation carries the
            role, the dates and the grants, so accepting it creates a complete record.
          </EmptyState>
        ) : (
          <div className="list">
            {people.map(person => (
              <Link className="item" href={"/people/" + person.userId} key={person.userId}>
                <Avatar name={person.name} size="sm" />
                <span className="item-main">
                  <b>{person.name}</b>
                  <small className="truncate">{secondLine(person)}</small>
                </span>
                <span className="badge">{person.role}</span>
                <StatusPill value={state(person)} />
                <Icon name="chevronRight" size={15} />
              </Link>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
