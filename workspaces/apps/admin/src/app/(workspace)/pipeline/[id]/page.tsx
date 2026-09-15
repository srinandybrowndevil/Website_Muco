import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { requireAccount } from "@muco/core/server";
import { Fact, Facts } from "@muco/ui";
import { LeadForm } from "@/components/LeadForm";

export const metadata: Metadata = { title: "Lead" };
export default async function LeadPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!/^[\da-f]{8}-[\da-f]{4}-[\da-f]{4}-[\da-f]{4}-[\da-f]{12}$/i.test(id)) notFound();
  const { supabase, organizationId } = await requireAccount("admin");
  const { data: lead, error } = await supabase.from("leads")
    .select("id,name,company,email,source,stage,estimated_value,last_contact_at")
    .eq("organization_id", organizationId).eq("id", id).maybeSingle();
  if (error) return <div className="page"><h1>Lead unavailable</h1><p className="errortext" role="alert">The lead could not be loaded. Refresh to try again.</p><Link href="/pipeline">Back to pipeline</Link></div>;
  if (!lead) notFound();
  const [request, enquiry] = await Promise.all([
    supabase.from("project_requests").select("id,title").eq("organization_id", organizationId).eq("converted_lead_id", id).maybeSingle(),
    supabase.from("website_enquiries").select("id").eq("organization_id", organizationId).eq("converted_lead_id", id).maybeSingle(),
  ]);
  return <div className="page">
    <div className="page-head"><Link href="/pipeline">← Back to pipeline</Link><h1>{lead.company || lead.name}</h1><p className="lede">Manage this opportunity and keep your next conversation grounded in the original request.</p></div>
    <div className="grid-main">
      <section className="panel"><div className="panel-head"><h2>Update the opportunity</h2></div><div className="panel-body"><LeadForm lead={lead} organizationId={organizationId} /></div></section>
      <section className="panel"><div className="panel-head"><h2>Contact and source</h2></div><div className="panel-body stack">
        <Facts><Fact label="Name">{lead.name}</Fact><Fact label="Company">{lead.company || "Not recorded"}</Fact><Fact label="Email">{lead.email || "Not recorded"}</Fact><Fact label="Source">{lead.source || "Not recorded"}</Fact></Facts>
        {request.data ? <Link href={`/requests/${request.data.id}`}>Open customer brief: {request.data.title}</Link> : null}
        {enquiry.data ? <Link href={`/enquiries/${enquiry.data.id}`}>Open original website enquiry</Link> : null}
        {request.error || enquiry.error ? <p role="alert">Source links could not be loaded. Try refreshing.</p> : null}
      </div></section>
    </div>
  </div>;
}
