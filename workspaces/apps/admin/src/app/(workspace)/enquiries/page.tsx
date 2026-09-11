import Link from "next/link";
import type { Metadata } from "next";
import { requireAccount } from "@muco/core/server";
import { relativeDays } from "@muco/core";
import { EmptyState, Icon, StatusPill } from "@muco/ui";

export const metadata: Metadata = { title: "Enquiries" };

const FILTERS: [string, string][] = [
  ["new", "New"],
  ["contacted", "Contacted"],
  ["qualified", "Qualified"],
  ["converted", "Converted"],
  ["closed", "Closed"],
  ["spam", "Spam"],
  ["", "Everything"],
];

// What the public website sent in.
//
// This is the destination of the contact form on mucolabs.com, so it is not
// an optional screen: without it those submissions land in a table nobody
// opens, which is the same as a contact form that does not work.
export default async function EnquiriesPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string }>;
}) {
  const { status = "new" } = await searchParams;
  const { supabase, organizationId } = await requireAccount("admin");

  let query = supabase
    .from("website_enquiries")
    .select("id,name,business,email,phone,service,budget,timeline,message,page,channel,status,created_at")
    .eq("organization_id", organizationId)
    .order("created_at", { ascending: false })
    .limit(100);

  if (status) query = query.eq("status", status);

  const { data: enquiries } = await query;

  return (
    <div className="page">
      <div className="page-head">
        <span className="eyebrow">From the website</span>
        <h1>Enquiries</h1>
        <p className="lede">
          Everything the contact form on mucolabs.com sent in. An enquiry that becomes real work
          converts into a lead, and the conversion is recorded against you.
        </p>
      </div>

      <div className="cluster">
        {FILTERS.map(([value, label]) => (
          <Link
            className="chip"
            key={value || "all"}
            href={value ? "/enquiries?status=" + value : "/enquiries?status="}
            aria-current={status === value ? "true" : undefined}
          >
            {label}
          </Link>
        ))}
      </div>

      <section className="panel">
        <div className="panel-head">
          <h2>{(enquiries ?? []).length} shown</h2>
        </div>
        {(enquiries ?? []).length === 0 ? (
          <EmptyState icon="inbox" title="Nothing here">
            {status === "new"
              ? "No unanswered enquiries. The website writes straight into this list, so an empty one means nobody has written today."
              : "Nothing with that status."}
          </EmptyState>
        ) : (
          <div className="list">
            {(enquiries ?? []).map(enquiry => (
              <Link className="item" href={"/enquiries/" + enquiry.id} key={enquiry.id}
                style={{ alignItems: "flex-start" }}>
                <span className="item-main">
                  <b>{enquiry.name}{enquiry.business ? " · " + enquiry.business : ""}</b>
                  <small>
                    {enquiry.service ?? "No service named"}
                    {enquiry.budget ? " · " + enquiry.budget : ""}
                    {" · "}{relativeDays(enquiry.created_at)}
                  </small>
                  {enquiry.message ? (
                    <small className="truncate" style={{ color: "var(--text-2)" }}>
                      {enquiry.message}
                    </small>
                  ) : null}
                </span>
                <StatusPill value={enquiry.status} />
                <Icon name="chevronRight" size={15} />
              </Link>
            ))}
          </div>
        )}
      </section>

      <p className="notice">
        <Icon name="shield" size={14} />
        <span>
          The public form is rate limited per address, and the submitter&rsquo;s IP is stored for
          that reason alone. It is never shown to anybody outside the studio.
        </span>
      </p>
    </div>
  );
}
