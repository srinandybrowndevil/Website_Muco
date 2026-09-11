import type { Metadata } from "next";
import { requireAccount } from "@muco/core/server";
import { Callout, EmptyState, Icon, StatusPill } from "@muco/ui";
import { loadCustomer, loadProjects } from "@/lib/project";

export const metadata: Metadata = { title: "Previews" };

// Where a customer looks at the work before it is live.
//
// A preview and a staging site are different promises and are labelled as
// such: one is something to look at, the other is something to try. Calling
// both "link" is how a customer ends up reporting a bug on a design mockup.
export default async function PreviewsPage() {
  const { supabase, userId } = await requireAccount("client");
  const customer = await loadCustomer(supabase, userId);
  if (!customer) return <div className="page"><EmptyState icon="building" title="Your organisation is not linked yet" /></div>;

  const projects = await loadProjects(supabase, customer.id);
  const withLinks = projects.filter(project => project.preview_url || project.staging_url);

  return (
    <div className="page">
      <div className="page-head">
        <span className="eyebrow">See it before it is live</span>
        <h1>Previews</h1>
        <p className="lede">
          Links to the work in progress. Nothing here is the finished product, and nothing here is
          public — these addresses are not indexed and are not meant to be shared outside your team.
        </p>
      </div>

      {withLinks.length === 0 ? (
        <EmptyState icon="eye" title="Nothing to look at yet">
          A preview appears as soon as there is something worth showing you, which is usually
          partway through the first build milestone rather than at the end.
        </EmptyState>
      ) : (
        <div className="stack">
          {withLinks.map(project => (
            <section className="panel" key={project.id}>
              <div className="panel-head">
                <h2>{project.name}</h2>
                <StatusPill value={project.status} />
              </div>
              <div className="list">
                {project.preview_url ? (
                  <a className="item" href={project.preview_url} target="_blank" rel="noopener noreferrer">
                    <Icon name="eye" size={17} />
                    <span className="item-main">
                      <b>Preview</b>
                      <small>Something to look at. Design and content, not necessarily working.</small>
                    </span>
                    <Icon name="external" size={15} />
                  </a>
                ) : null}
                {project.staging_url ? (
                  <a className="item" href={project.staging_url} target="_blank" rel="noopener noreferrer">
                    <Icon name="terminal" size={17} />
                    <span className="item-main">
                      <b>Staging</b>
                      <small>Something to try. Close to the real thing; use test data, not real.</small>
                    </span>
                    <Icon name="external" size={15} />
                  </a>
                ) : null}
              </div>
            </section>
          ))}
        </div>
      )}

      <Callout tone="warn" icon="alert" title="Do not put real customer data into staging">
        A staging site is rebuilt and wiped as the work goes on, and it is not held to the same
        standard as the live one. Test with made-up names and numbers.
      </Callout>
    </div>
  );
}
