import { redirect } from "next/navigation";
import { AppShell } from "@/components/AppShell";
import { EnquiriesClient } from "@/components/enquiries/EnquiriesClient";
import { createClient } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import { demoEnquiries, type WebsiteEnquiry } from "@/lib/enquiries";

export default async function EnquiriesPage() {
  let enquiries: WebsiteEnquiry[] = [];
  let error: string | null = null;

  if (!isSupabaseConfigured) {
    enquiries = demoEnquiries;
  } else {
    const supabase = await createClient();
    if (!supabase) {
      error = "Supabase is not configured.";
    } else {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) {
        redirect("/login?next=/enquiries");
      }

      const { data: membership } = await supabase
        .from("memberships")
        .select("organization_id, role")
        .eq("user_id", user.id)
        .in("role", ["admin", "member"])
        .order("organization_id")
        .limit(1)
        .maybeSingle();

      if (!membership) {
        error = "You do not have access to enquiries.";
      } else {
        const { data, error: fetchError } = await supabase
          .from("website_enquiries")
          .select("*")
          .eq("organization_id", membership.organization_id)
          .order("created_at", { ascending: false });

        if (fetchError) {
          error = fetchError.message;
        } else {
          enquiries = (data ?? []) as WebsiteEnquiry[];
        }
      }
    }
  }

  return (
    <AppShell>
      <EnquiriesClient
        enquiries={enquiries}
        isConfigured={isSupabaseConfigured}
        error={error}
      />
    </AppShell>
  );
}
