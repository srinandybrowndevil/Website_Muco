import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { requireAccount } from "@muco/core/server";
import { formatDate, formatDateTime, formatMoney, humanise } from "@muco/core";
import { Avatar, EmptyState, Fact, Facts, Icon, StatusPill } from "@muco/ui";
import { PersonAccess } from "@/components/PersonAccess";

export const metadata: Metadata = { title: "Person" };

function one<T>(value: unknown): T | null {
  return ((Array.isArray(value) ? value[0] : value) ?? null) as T | null;
}

// One person, everything the studio holds about them, and the one control that
// matters: whether they can still get in.
export default async function PersonPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { supabase, organizationId, role } = await requireAccount("admin");

  const { data: membership } = await supabase
    .from("memberships")
    .select("user_id,role,disabled_at,disabled_reason,profiles(full_name,phone,created_at)")
    .eq("organization_id", organizationId)
    .eq("user_id", id)
    .maybeSingle();

  if (!membership) notFound();

  const profile = one<{ full_name: string; phone: string; created_at: string }>(membership.profiles);
  const name = profile?.full_name ?? "Unnamed";

  const [intern, staff, customer, grants, compensation, audit] = await Promise.all([
    supabase.from("intern_profiles")
      .select("id,track,tier,starts_at,ends_at,status,college,grace_days,mentor_recommended_at")
      .eq("user_id", id).eq("organization_id", organizationId).maybeSingle(),
    supabase.from("staff_profiles").select("roles,is_mentor,status,started_on,ended_on")
      .eq("user_id", id).eq("organization_id", organizationId).maybeSingle(),
    supabase.from("customers").select("id,name,company,email,phone")
      .eq("auth_user_id", id).eq("organization_id", organizationId).maybeSingle(),
    supabase.from("project_grants").select("id,module,level,starts_at,ends_at,projects(name)")
      .eq("user_id", id).order("ends_at", { ascending: true, nullsFirst: false }),
    // A member may run the studio but not see what anybody is paid. The
    // database refuses it either way; this decides whether to ask at all.
    role === "admin"
      ? supabase.from("compensation").select("engagement,amount,cycle_label,status,effective_from")
          .eq("user_id", id).eq("status", "active").maybeSingle()
      : Promise.resolve({ data: null }),
    supabase.from("audit_events").select("id,action,resource_type,occurred_at")
      .eq("actor_id", id).order("occurred_at", { ascending: false }).limit(6),
  ]);

  return (
    <div className="page">
      <div className="page-head">
        <Link className="hint" href="/people"><Icon name="arrowLeft" size={13} /> All people</Link>
        <div className="split">
          <div className="cluster">
            <Avatar name={name} size="lg" />
            <div className="stack-sm">
              <h1>{name}</h1>
              <span className="hint">{humanise(membership.role)}</span>
            </div>
          </div>
          <StatusPill
            value={membership.disabled_at ? "closed" : intern.data?.status ?? staff.data?.status ?? "active"}
          />
        </div>
      </div>

      <section className="panel">
        <div className="panel-head"><h2>Contact</h2></div>
        <div className="panel-body">
          <Facts>
            <Fact label="Phone" mono>{profile?.phone ?? "Not recorded"}</Fact>
            <Fact label="Account created">{formatDate(profile?.created_at)}</Fact>
            <Fact label="Identifier" mono>{id.slice(0, 8)}</Fact>
          </Facts>
        </div>
      </section>

      {intern.data ? (
        <section className="panel">
          <div className="panel-head">
            <h2>Internship</h2>
            <Link className="btn sm quiet" href="/completions">Completions</Link>
          </div>
          <div className="panel-body">
            <Facts>
              <Fact label="Track">{humanise(intern.data.track).replace("Intern ", "")}</Fact>
              <Fact label="Duration">{intern.data.tier.replace("m", "")} month</Fact>
              <Fact label="Starts">{formatDate(intern.data.starts_at)}</Fact>
              <Fact label="Ends">{formatDate(intern.data.ends_at)}</Fact>
              <Fact label="College">{intern.data.college ?? "Not recorded"}</Fact>
              <Fact label="Grace">{intern.data.grace_days} days read-only</Fact>
              <Fact label="Mentor recommended">
                {intern.data.mentor_recommended_at ? formatDate(intern.data.mentor_recommended_at) : "Not yet"}
              </Fact>
            </Facts>
          </div>
        </section>
      ) : null}

      {staff.data ? (
        <section className="panel">
          <div className="panel-head"><h2>Engagement</h2></div>
          <div className="panel-body stack">
            <Facts>
              <Fact label="Roles">{(staff.data.roles ?? []).join(", ") || "None recorded"}</Fact>
              <Fact label="Mentor">{staff.data.is_mentor ? "Yes" : "No"}</Fact>
              <Fact label="Started">{formatDate(staff.data.started_on)}</Fact>
              <Fact label="Ended">{staff.data.ended_on ? formatDate(staff.data.ended_on) : "Still running"}</Fact>
            </Facts>
            {role === "admin" ? (
              compensation.data ? (
                <Facts>
                  <Fact label="Compensation">
                    {formatMoney(compensation.data.amount)} · {humanise(compensation.data.engagement)}
                  </Fact>
                  <Fact label="Effective from">{formatDate(compensation.data.effective_from)}</Fact>
                </Facts>
              ) : (
                <p className="hint">No active compensation record.</p>
              )
            ) : (
              <p className="notice">
                <Icon name="lock" size={14} />
                <span>Compensation is visible to administrators only.</span>
              </p>
            )}
          </div>
        </section>
      ) : null}

      {customer.data ? (
        <section className="panel">
          <div className="panel-head"><h2>Customer</h2></div>
          <div className="panel-body">
            <Facts>
              <Fact label="Company">{customer.data.company || customer.data.name}</Fact>
              <Fact label="Email" mono>{customer.data.email ?? "Not recorded"}</Fact>
              <Fact label="Phone" mono>{customer.data.phone ?? "Not recorded"}</Fact>
            </Facts>
          </div>
        </section>
      ) : null}

      <section className="panel">
        <div className="panel-head">
          <h2>Project access</h2>
          <Link className="btn sm quiet" href="/grants">Manage grants</Link>
        </div>
        {(grants.data ?? []).length === 0 ? (
          <EmptyState icon="key" title="No project grants">
            Grants are what let somebody open a project room. Without one they see the workspace and
            nothing in it.
          </EmptyState>
        ) : (
          <div className="list">
            {(grants.data ?? []).map(grant => {
              const lapsed = grant.ends_at ? Date.parse(grant.ends_at) < Date.now() : false;
              return (
                <div className="item" key={grant.id}>
                  <span className="item-main">
                    <b>{one<{ name: string }>(grant.projects)?.name ?? "Project"}</b>
                    <small>{grant.module} at {grant.level}</small>
                  </span>
                  <span className="hint">
                    {grant.ends_at
                      ? (lapsed ? "Lapsed " : "Until ") + formatDate(grant.ends_at)
                      : "No end date"}
                  </span>
                </div>
              );
            })}
          </div>
        )}
      </section>

      <section className="panel">
        <div className="panel-head"><h2>Access</h2></div>
        <div className="panel-body">
          {role === "admin" ? (
            <PersonAccess
              userId={id}
              name={name.split(" ")[0]}
              disabledAt={membership.disabled_at}
              reason={membership.disabled_reason}
            />
          ) : (
            <p className="notice">
              <Icon name="lock" size={14} />
              <span>Only an administrator can switch somebody off or back on.</span>
            </p>
          )}
        </div>
      </section>

      <section className="panel">
        <div className="panel-head">
          <h2>What they have done</h2>
          <Link className="btn sm quiet" href="/audit">Full audit log</Link>
        </div>
        {(audit.data ?? []).length === 0 ? (
          <EmptyState icon="shield" title="Nothing recorded against this account" />
        ) : (
          <div className="list">
            {(audit.data ?? []).map(line => (
              <div className="item" key={line.id}>
                <span className="item-main">
                  <b>{line.action.replace(/[_.]/g, " ")}</b>
                  <small>{line.resource_type}</small>
                </span>
                <span className="hint">{formatDateTime(line.occurred_at)}</span>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
