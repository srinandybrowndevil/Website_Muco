import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { requireAccount } from "@muco/core/server";
import { formatDateTime } from "@muco/core";
import { Fact, Facts, Icon, StatusPill } from "@muco/ui";
import { Convert } from "@/components/Convert";
import { EnquiryStatus } from "@/components/EnquiryStatus";

export const metadata: Metadata = { title: "Enquiry" };

export default async function EnquiryPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { supabase, organizationId, role } = await requireAccount("admin");

  const { data: enquiry } = await supabase
    .from("website_enquiries")
    .select("id,name,business,email,phone,location,service,website,budget,timeline,message,page,referrer,utm_source,utm_medium,utm_campaign,channel,status,created_at,converted_at,converted_lead_id")
    .eq("organization_id", organizationId)
    .eq("id", id)
    .maybeSingle();

  if (!enquiry) notFound();

  return (
    <div className="page">
      <div className="page-head">
        <Link className="hint" href="/enquiries"><Icon name="arrowLeft" size={13} /> All enquiries</Link>
        <div className="split">
          <h1>{enquiry.name}</h1>
          <StatusPill value={enquiry.status} />
        </div>
        <p className="lede">
          Arrived {formatDateTime(enquiry.created_at)}
          {enquiry.page ? " from " + enquiry.page : ""}.
        </p>
      </div>

      <section className="panel">
        <div className="panel-head"><h2>What they wrote</h2></div>
        <div className="panel-body stack">
          <p className="prose" style={{ whiteSpace: "pre-wrap" }}>
            {enquiry.message || "They left the message empty."}
          </p>
          <Facts>
            <Fact label="Business">{enquiry.business ?? "Not given"}</Fact>
            <Fact label="Service">{enquiry.service ?? "Not chosen"}</Fact>
            <Fact label="Budget">{enquiry.budget ?? "Not given"}</Fact>
            <Fact label="Timeline">{enquiry.timeline ?? "Not given"}</Fact>
            <Fact label="Location">{enquiry.location ?? "Not given"}</Fact>
            <Fact label="Their website" mono>{enquiry.website ?? "None"}</Fact>
          </Facts>
        </div>
      </section>

      <section className="panel">
        <div className="panel-head"><h2>How to reach them</h2></div>
        <div className="panel-body stack">
          <Facts>
            <Fact label="Email" mono>{enquiry.email ?? "Not given"}</Fact>
            <Fact label="Phone" mono>{enquiry.phone ?? "Not given"}</Fact>
            <Fact label="Preferred channel">{enquiry.channel ?? "Not stated"}</Fact>
          </Facts>
          <div className="cluster">
            {enquiry.email ? (
              <a className="btn sm" href={"mailto:" + enquiry.email}>
                <Icon name="mail" size={14} /><span>Email them</span>
              </a>
            ) : null}
            {enquiry.phone ? (
              <a className="btn sm" href={"tel:" + enquiry.phone}>
                <Icon name="phone" size={14} /><span>Call them</span>
              </a>
            ) : null}
          </div>
        </div>
      </section>

      <section className="panel">
        <div className="panel-head"><h2>Where they came from</h2></div>
        <div className="panel-body">
          <Facts>
            <Fact label="Page" mono>{enquiry.page ?? "Not recorded"}</Fact>
            <Fact label="Referrer" mono>{enquiry.referrer ?? "Direct"}</Fact>
            <Fact label="Source" mono>{enquiry.utm_source ?? "None"}</Fact>
            <Fact label="Medium" mono>{enquiry.utm_medium ?? "None"}</Fact>
            <Fact label="Campaign" mono>{enquiry.utm_campaign ?? "None"}</Fact>
          </Facts>
        </div>
      </section>

      <section className="panel">
        <div className="panel-head"><h2>What happens next</h2></div>
        <div className="panel-body stack">
          {enquiry.converted_lead_id ? (
            <div className="callout ok">
              <Icon name="checkCircle" size={18} />
              <div>
                <b>Already converted to a lead.</b>
                <p>Converted {formatDateTime(enquiry.converted_at)}. Converting again does nothing.</p>
              </div>
            </div>
          ) : (
            <div className="cluster">
              <EnquiryStatus id={enquiry.id} status={enquiry.status} />
              {role === "admin" ? (
                <Convert rpc="convert_website_enquiry" id={enquiry.id}
                  label="Convert to a lead" what="an enquiry" />
              ) : (
                <p className="notice">
                  <Icon name="lock" size={14} />
                  <span>Only an administrator can convert an enquiry.</span>
                </p>
              )}
            </div>
          )}
        </div>
      </section>
    </div>
  );
}
