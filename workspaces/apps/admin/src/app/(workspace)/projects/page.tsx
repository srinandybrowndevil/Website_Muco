import Link from "next/link";
import type { Metadata } from "next";
import { requireAccount } from "@muco/core/server";
import { formatDate, formatMoney, humanise } from "@muco/core";
import { EmptyState, Icon, StatusPill } from "@muco/ui";
import { CreateProject } from "@/components/CreateProject";

export const metadata: Metadata = { title: "Projects" };

function one<T>(value: unknown): T | null {
  return ((Array.isArray(value) ? value[0] : value) ?? null) as T | null;
}

// Every project, internal and client, with the flag that separates them.
//
// The distinction matters more than it looks. An internal build and a sandbox
// can carry an intern; a client project carries somebody else's confidential
// work, and the studio's promise about that is the reason grants exist.
export default async function ProjectsPage({
  searchParams,
}: {
  searchParams: Promise<{ kind?: string }>;
}) {
  const { kind = "" } = await searchParams;
  const { supabase, organizationId, role } = await requireAccount("admin");

  let query = supabase
    .from("projects")
    .select("id,name,description,status,kind,budget,starts_on,due_on,progress,customers(company,name)")
    .eq("organization_id", organizationId)
    .order("status", { ascending: true })
    .order("due_on", { ascending: true, nullsFirst: false });

  if (kind) query = query.eq("kind", kind);

  const { data: projects } = await query;
  const rows = projects ?? [];

  const { data: customers } = await supabase
    .from("customers")
    .select("id,name,company")
    .eq("organization_id", organizationId)
    .order("company", { ascending: true });

  return (
    <div className="page">
      <div className="page-head">
        <div className="split">
          <div className="stack-sm">
            <span className="eyebrow">Everything the studio is building</span>
            <h1>Projects</h1>
          </div>
          {role === "admin" ? (
            <CreateProject
              organizationId={organizationId}
              customers={(customers ?? []).map(row => ({
                id: row.id as string,
                label: (row.company as string) || (row.name as string),
              }))}
            />
          ) : null}
        </div>
        <p className="lede">
          Internal builds, client work and sandboxes. The kind decides who may be put on it: a
          sandbox can carry an intern, a client project carries somebody else&rsquo;s confidential
          work.
        </p>
      </div>

      <div className="cluster">
        {[["", "All"], ["client", "Client"], ["internal", "Internal"], ["sandbox", "Sandbox"]].map(
          ([value, label]) => (
            <Link
              className="chip"
              key={value || "all"}
              href={value ? "/projects?kind=" + value : "/projects"}
              aria-current={kind === value ? "true" : undefined}
            >
              {label}
            </Link>
          ),
        )}
      </div>

      <section className="panel">
        <div className="panel-head">
          <h2>{rows.length === 1 ? "1 project" : rows.length + " projects"}</h2>
          <Link className="btn sm quiet" href="/grants">
            <span>Who can open them</span>
            <Icon name="arrowRight" size={14} />
          </Link>
        </div>
        {rows.length === 0 ? (
          <EmptyState icon="briefcase" title="No projects yet">
            A client project is usually created by accepting a customer request. An internal one is
            created directly.
          </EmptyState>
        ) : (
          <div className="tablewrap">
            <table>
              <caption className="sr-only">Projects</caption>
              <thead>
                <tr>
                  <th scope="col">Project</th>
                  <th scope="col">For</th>
                  <th scope="col">Kind</th>
                  <th scope="col">Status</th>
                  <th scope="col">Due</th>
                  {role === "admin" ? <th scope="col" className="num">Budget</th> : null}
                </tr>
              </thead>
              <tbody>
                {rows.map(row => (
                  <tr key={row.id}>
                    <td><Link href={"/projects/" + row.id}>{row.name}</Link></td>
                    <td>
                      {one<{ company: string; name: string }>(row.customers)?.company ??
                        one<{ company: string; name: string }>(row.customers)?.name ??
                        "The studio"}
                    </td>
                    <td>{humanise(row.kind)}</td>
                    <td><StatusPill value={row.status} /></td>
                    <td>{row.due_on ? formatDate(row.due_on) : "—"}</td>
                    {role === "admin" ? (
                      <td className="num tabular">{row.budget ? formatMoney(row.budget) : "—"}</td>
                    ) : null}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <p className="notice">
        <Icon name="info" size={14} />
        <span>
          Progress is not shown as a percentage anywhere a client can see. Section 12 of the
          specification asks for project status to stay honest, and a bar is a promise.
        </span>
      </p>
    </div>
  );
}
