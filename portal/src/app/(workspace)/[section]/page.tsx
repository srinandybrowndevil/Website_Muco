import { notFound } from "next/navigation";
import { AppShell } from "@/components/AppShell";
import { Customers, Documents, Leads, Projects, Tasks } from "@/components/CrmPages";
import { SecondaryPage } from "@/components/SecondaryPages";
import { TeamSettings } from "@/components/TeamSettings";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import { requireWorkspace } from "@/lib/workspace";
import { crmSections } from "@/lib/crm";
import { LiveRecords } from "@/components/live/LiveRecords";
import { LiveOverview } from "@/components/live/LiveOverview";
import { LiveFiles } from "@/components/live/LiveFiles";
import { LiveSettings } from "@/components/live/LiveSettings";
const valid=["leads","customers","tasks","projects","proposals","invoices","files","reports","automation","settings"];
// "requests" is handled by the static /requests route so it is excluded here.
export default async function Page({params}:{params:Promise<{section:string}>}) {
  const {section}=await params;
  if(!valid.includes(section)) notFound();
  if (isSupabaseConfigured) {
    const {organizationId, role} = await requireWorkspace();
    const page = crmSections[section] ? <LiveRecords key={section} section={section} organizationId={organizationId}/>
      : section === "reports" ? <LiveOverview organizationId={organizationId} reports/>
      : section === "files" ? <LiveFiles organizationId={organizationId}/>
      : <LiveSettings organizationId={organizationId} role={role} automation={section === "automation"}/>;
    return <AppShell>{page}</AppShell>;
  }
  let page:React.ReactNode;
  if(section==="leads")page=<Leads/>; else if(section==="customers")page=<Customers/>; else if(section==="tasks")page=<Tasks/>; else if(section==="projects")page=<Projects/>; else if(section==="proposals"||section==="invoices")page=<Documents type={section}/>; else if(section==="settings")page=<TeamSettings/>; else page=<SecondaryPage section={section}/>;
  return <AppShell>{page}</AppShell>;
}
