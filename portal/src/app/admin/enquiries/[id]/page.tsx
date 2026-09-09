import { notFound, redirect } from "next/navigation";
import { AppShell } from "@/components/AppShell";
import { EnquiryDetailClient } from "@/components/enquiries/EnquiryDetailClient";
import { createClient } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import { demoEnquiries, type WebsiteEnquiry } from "@/lib/enquiries";

export default async function EnquiryDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  if (!isSupabaseConfigured) {
    return (
      <AppShell>
        <EnquiryDetailClient
          enquiry={demoEnquiries[0]}
          isConfigured={false}
          role={null}
        />
      </AppShell>
    );
  }

  const supabase = await createClient();
  if (!supabase) {
    return (
      <AppShell>
        <div className="page">Supabase is not configured.</div>
      </AppShell>
    );
  }

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    redirect(`/login?next=${encodeURIComponent(`/enquiries/${id}`)}`);
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
    return (
      <AppShell>
        <div className="page">You do not have access to this enquiry.</div>
      </AppShell>
    );
  }

  const { data, error } = await supabase
    .from("website_enquiries")
    .select("*")
    .eq("id", id)
    .eq("organization_id", membership.organization_id)
    .maybeSingle();

  if (error || !data) {
    notFound();
  }

  return (
    <AppShell>
      <EnquiryDetailClient
        enquiry={data as WebsiteEnquiry}
        isConfigured
        role={membership.role as "admin" | "member"}
      />
    </AppShell>
  );
}
