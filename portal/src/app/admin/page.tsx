import { AppShell } from "@/components/AppShell";
import { Dashboard } from "@/components/CrmPages";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import { requireWorkspace } from "@/lib/workspace";
import { LiveOverview } from "@/components/live/LiveOverview";
import { DueFollowUps } from "@/components/live/DueFollowUps";
import { WrongWorkspaceNotice } from "@/components/WrongWorkspaceNotice";
export default async function Page({searchParams}:{searchParams:Promise<{wrongworkspace?:string}>}){
  if (!isSupabaseConfigured) return <AppShell><Dashboard/></AppShell>;
  const [workspace, query] = await Promise.all([requireWorkspace(), searchParams]);
  return <AppShell>
    {query.wrongworkspace === "customer" && <WrongWorkspaceNotice audience="customer"/>}
    {/* Above the totals on purpose. What is late is more urgent than what
        is large, and a number you have to interpret should not sit above a
        promise you already made. */}
    <DueFollowUps organizationId={workspace.organizationId}/>
    <LiveOverview organizationId={workspace.organizationId}/>
  </AppShell>;
}
