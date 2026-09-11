import type { Metadata } from "next";
import { requireAccount } from "@muco/core/server";
import { formatDate, humanise } from "@muco/core";
import { Callout, EmptyState, Fact, Facts, Icon, StatusPill } from "@muco/ui";
import { loadCustomer, loadProjects } from "@/lib/project";

export const metadata: Metadata = { title: "Scope" };

// What was agreed, in the studio's own words, beside the documents it was
// agreed in. Kept separate from milestones on purpose: scope is what the work
// is, milestones are when it lands, and a customer arguing about one is rarely
// arguing about the other.
export default async function ScopePage() {
  const { supabase, userId } = await requireAccount("client");
  const customer = await loadCustomer(supabase, userId);
  if (!customer) return <div className="page"><EmptyState icon="building" title="Your organisation is not linked yet" /></div>;

  const projects = await loadProjects(supabase, customer.id);

  const { data: documents } = await supabase
    .from("files")
    .select("id,name,kind,size_bytes,created_at,project_id")
    .eq("customer_id", customer.id)
    .eq("kind", "document")
    .order("created_at", { ascending: false });

  return (
    <div className="page">
      <div className="page-head">
        <span className="eyebrow">What we agreed</span>
        <h1>Scope</h1>
        <p className="lede">
          Work at MUCO LABS is quoted from a written scope. This is that scope, as the studio holds
          it — if it does not match your copy, the difference is worth raising today rather than at
          handover.
        </p>
      </div>

      {projects.length === 0 ? (
        <EmptyState icon="fileText" title="No project opened yet" />
      ) : (
        projects.map(project => (
          <section className="panel" key={project.id}>
            <div className="panel-head">
              <h2>{project.name}</h2>
              <StatusPill value={project.status} />
            </div>
            <div className="panel-body stack">
              {project.description ? (
                <p className="prose" style={{ whiteSpace: "pre-wrap" }}>{project.description}</p>
              ) : (
                <p className="hint">No written description has been recorded against this project yet.</p>
              )}
              <Facts>
                <Fact label="Started">{formatDate(project.starts_on)}</Fact>
                <Fact label="Expected">{formatDate(project.due_on)}</Fact>
              </Facts>
            </div>
          </section>
        ))
      )}

      <section className="panel">
        <div className="panel-head">
          <h2>Scope documents</h2>
          <span className="hint">{(documents ?? []).length} shared with you</span>
        </div>
        {(documents ?? []).length === 0 ? (
          <EmptyState icon="fileText" title="No documents shared yet">
            Proposals, scope sheets and anything else the studio wants you to have appear here.
          </EmptyState>
        ) : (
          <div className="list">
            {(documents ?? []).map(document => (
              <div className="item" key={document.id}>
                <Icon name="fileText" size={16} />
                <span className="item-main">
                  <b className="truncate">{document.name}</b>
                  <small>{humanise(document.kind)} · {formatDate(document.created_at)}</small>
                </span>
              </div>
            ))}
          </div>
        )}
      </section>

      <Callout tone="info" icon="info" title="The terms that come with a scope">
        Payment is 50% on start and 50% on completion, as published on the website. On final
        payment the code, the design and the accounts are yours. Neither of those changes from
        project to project, and neither is negotiated here.
      </Callout>
    </div>
  );
}
