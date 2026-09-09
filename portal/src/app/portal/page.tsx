import { CustomerShell } from "@/components/portal/CustomerShell";
import { CustomerDashboard } from "@/components/portal/CustomerDashboard";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import { requireWorkspace } from "@/lib/workspace";
import { LiveCustomer } from "@/components/live/LiveCustomer";
import { WrongWorkspaceNotice } from "@/components/WrongWorkspaceNotice";

export default async function PortalPage({searchParams}:{searchParams:Promise<{wrongworkspace?:string}>}) {
  if (isSupabaseConfigured) {
    const [workspace, query] = await Promise.all([requireWorkspace(true), searchParams]);
    return <CustomerShell>
      {query.wrongworkspace === "team" && <WrongWorkspaceNotice audience="team"/>}
      <LiveCustomer organizationId={workspace.organizationId}/>
    </CustomerShell>;
  }
  return (
    <CustomerShell>
      <CustomerDashboard />
    </CustomerShell>
  );
}
