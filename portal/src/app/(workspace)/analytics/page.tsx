import { redirect } from "next/navigation";
import { AppShell } from "@/components/AppShell";
import { AnalyticsDashboard } from "@/components/analytics/AnalyticsDashboard";
import { createClient } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import { demoSummary, type AnalyticsSummary } from "@/lib/analytics";

export default async function AnalyticsPage() {
  let summary: AnalyticsSummary | null = null;
  let error: string | null = null;

  if (!isSupabaseConfigured) {
    summary = demoSummary;
  } else {
    const supabase = await createClient();
    if (!supabase) {
      error = "Supabase is not configured.";
    } else {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) {
        redirect("/login?next=/analytics");
      }

      const { data: membership } = await supabase
        .from("memberships")
        .select("organization_id, role")
        .eq("user_id", user.id)
        .in("role", ["admin", "member"])
        .limit(1)
        .maybeSingle();

      if (!membership) {
        error = "You do not have access to analytics.";
      } else {
        const { data, error: rpcError } = await supabase.rpc(
          "get_website_analytics_summary",
          { p_days: 30 }
        );
        if (rpcError) {
          error = rpcError.message;
        } else {
          summary = data as AnalyticsSummary;
        }
      }
    }
  }

  return (
    <AppShell>
      <AnalyticsDashboard summary={summary} error={error} isConfigured={isSupabaseConfigured} />
    </AppShell>
  );
}
