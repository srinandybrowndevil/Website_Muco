import Link from "next/link";
import type { Metadata } from "next";
import { requireAccount } from "@muco/core/server";
import { formatDate, relativeDays } from "@muco/core";
import { EmptyState, Icon } from "@muco/ui";
import { GrantEditor } from "@/components/GrantEditor";
import { RevokeGrant } from "@/components/RevokeGrant";

export const metadata: Metadata = { title: "Grants" };

function one<T>(value: unknown): T | null {
  return ((Array.isArray(value) ? value[0] : value) ?? null) as T | null;
}

// Who has which module of which project, at which level, until when.
//
// Grouped by person rather than by project, because the question that gets
// asked is "what can this person see" — usually on the day they leave.
export default async function GrantsPage() {
  const { supabase, organizationId, role } = await requireAccount("admin");

  const [grants, people, projects] = await Promise.all([
    supabase.from("project_grants")
      .select("id,user_id,module,level,starts_at,ends_at,projects(name),profiles!project_grants_user_id_fkey(full_name)")
      .eq("organization_id", organizationId)
      .order("ends_at", { ascending: true, nullsFirst: false }),
    supabase.from("memberships")
      .select("user_id,role,profiles(full_name)")
      .eq("organization_id", organizationId)
      .in("role", ["intern", "employee", "member"])
      .is("disabled_at", null),
    supabase.from("projects").select("id,name")
      .eq("organization_id", organizationId).order("name"),
  ]);

  const rows = grants.data ?? [];
  const byPerson = new Map<string, typeof rows>();
  for (const grant of rows) {
    const list = byPerson.get(grant.user_id as string) ?? [];
    list.push(grant);
    byPerson.set(grant.user_id as string, list);
  }

  const soon = rows.filter(grant => {
    if (!grant.ends_at) return false;
    const days = (Date.parse(grant.ends_at as string) - Date.now()) / 86_400_000;
    return days >= 0 && days <= 7;
  }).length;

  const options = (people.data ?? []).map(row => ({
    id: row.user_id as string,
    name: one<{ full_name: string }>(row.profiles)?.full_name ?? "Unnamed",
    role: row.role as string,
  }));

  return (
    <div className="page">
      <div className="page-head">
        <span className="eyebrow">Who can open what</span>
        <h1>Project grants</h1>
        <p className="lede">
          A grant is the only thing that lets somebody who is not studio staff open a project.
          Grouped by person, because the question that gets asked is what one person can see —
          usually on the day they leave.
        </p>
      </div>

      {soon > 0 ? (
        <div className="callout warn">
          <Icon name="clock" size={18} />
          <div>
            <b>{soon === 1 ? "One grant expires" : soon + " grants expire"} within seven days.</b>
            <p>They lapse on their own. Extend the ones that should continue.</p>
          </div>
        </div>
      ) : null}

      {role === "admin" ? (
        <section className="panel">
          <div className="panel-head"><h2>Grant access</h2></div>
          <div className="panel-body">
            <GrantEditor
              organizationId={organizationId}
              people={options}
              projects={(projects.data ?? []).map(row => ({ id: row.id as string, name: row.name as string }))}
            />
          </div>
        </section>
      ) : (
        <p className="notice">
          <Icon name="lock" size={14} />
          <span>Only an administrator can change grants. This list is readable by members.</span>
        </p>
      )}

      {byPerson.size === 0 ? (
        <EmptyState icon="key" title="No grants yet">
          Somebody with no grant sees their workspace and nothing in it. That is the correct
          starting point — access is added deliberately rather than removed afterwards.
        </EmptyState>
      ) : (
        [...byPerson.entries()].map(([userId, list]) => {
          const name = one<{ full_name: string }>(list[0].profiles)?.full_name ?? "Unnamed";
          return (
            <section className="panel" key={userId}>
              <div className="panel-head">
                <h2><Link href={"/people/" + userId}>{name}</Link></h2>
                <span className="hint">{list.length === 1 ? "1 grant" : list.length + " grants"}</span>
              </div>
              <div className="list">
                {list.map(grant => {
                  const lapsed = grant.ends_at ? Date.parse(grant.ends_at as string) < Date.now() : false;
                  return (
                    <div className="item" key={grant.id}>
                      <span className="item-main">
                        <b>{one<{ name: string }>(grant.projects)?.name ?? "Project"}</b>
                        <small>{grant.module} at {grant.level} · from {formatDate(grant.starts_at)}</small>
                      </span>
                      <span className="hint">
                        {grant.ends_at
                          ? (lapsed ? "Lapsed " : "Expires ") + formatDate(grant.ends_at) +
                            (lapsed ? "" : " · " + relativeDays(grant.ends_at))
                          : "No end date"}
                      </span>
                      {role === "admin" ? (
                        <RevokeGrant id={grant.id as string} label={grant.module + " for " + name} />
                      ) : null}
                    </div>
                  );
                })}
              </div>
            </section>
          );
        })
      )}
    </div>
  );
}
