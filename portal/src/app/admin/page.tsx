import { AppShell } from "@/components/AppShell";
import { Dashboard } from "@/components/CrmPages";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import { requireWorkspace } from "@/lib/workspace";
import { LiveOverview } from "@/components/live/LiveOverview";
import { WrongWorkspaceNotice } from "@/components/WrongWorkspaceNotice";
export default async function Page({searchParams}:{searchParams:Promise<{wrongworkspace?:string}>}){
  if (!isSupabaseConfigured) return <AppShell><Dashboard/></AppShell>;
  const [workspace, query] = await Promise.all([requireWorkspace(), searchParams]);
  return <AppShell>
    {query.wrongworkspace === "customer" && <WrongWorkspaceNotice audience="customer"/>}
    <LiveOverview organizationId={workspace.organizationId}/>
  </AppShell>;
}
