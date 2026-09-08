import { AppShell } from "@/components/AppShell";
import { Dashboard } from "@/components/CrmPages";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import { requireWorkspace } from "@/lib/workspace";
import { LiveOverview } from "@/components/live/LiveOverview";
export default async function Page(){
  if (!isSupabaseConfigured) return <AppShell><Dashboard/></AppShell>;
  const workspace = await requireWorkspace();
  return <AppShell><LiveOverview organizationId={workspace.organizationId}/></AppShell>;
}
