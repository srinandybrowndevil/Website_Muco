import { CustomerShell } from "@/components/portal/CustomerShell";
import { CustomerDashboard } from "@/components/portal/CustomerDashboard";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import { requireWorkspace } from "@/lib/workspace";
import { LiveCustomer } from "@/components/live/LiveCustomer";

export default async function PortalPage() {
  if (isSupabaseConfigured) {
    const workspace = await requireWorkspace(true);
    return <CustomerShell><LiveCustomer organizationId={workspace.organizationId}/></CustomerShell>;
  }
  return (
    <CustomerShell>
      <CustomerDashboard />
    </CustomerShell>
  );
}
