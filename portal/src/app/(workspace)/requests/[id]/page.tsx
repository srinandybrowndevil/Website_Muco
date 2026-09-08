import { notFound, redirect } from "next/navigation";
import { AppShell } from "@/components/AppShell";
import { RequestDetailClient } from "@/components/requests/RequestDetailClient";
import { createClient } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import { demoRequest, type ProjectRequest } from "@/lib/requests";

export default async function RequestDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  if (!isSupabaseConfigured) {
    return (
      <AppShell>
        <RequestDetailClient initialRequest={demoRequest} isConfigured={false} role={null} />
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
    redirect(`/login?next=${encodeURIComponent(`/requests/${id}`)}`);
  }

  const { data: membership } = await supabase
    .from("memberships")
    .select("organization_id, role")
    .eq("user_id", user.id)
    .in("role", ["admin", "member"])
    .limit(1)
    .maybeSingle();

  if (!membership) {
    return (
      <AppShell>
        <div className="page">You do not have access to this request.</div>
      </AppShell>
    );
  }

  const { data, error } = await supabase
    .from("project_requests")
    .select("*, customers(name, company, email, phone)")
    .eq("id", id)
    .eq("organization_id", membership.organization_id)
    .maybeSingle();

  if (error || !data) {
    notFound();
  }

  return (
    <AppShell>
      <RequestDetailClient
        initialRequest={data as ProjectRequest}
        isConfigured
        role={membership.role as "admin" | "member"}
      />
    </AppShell>
  );
}
