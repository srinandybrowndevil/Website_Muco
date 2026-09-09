import { CustomerShell } from "@/components/portal/CustomerShell";
import { CustomerProfile } from "@/components/portal/CustomerProfile";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import { requireWorkspace } from "@/lib/workspace";

export default async function CustomerProfilePage() {
  if (isSupabaseConfigured) await requireWorkspace(true);
  return <CustomerShell><CustomerProfile /></CustomerShell>;
}
