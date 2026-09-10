import { notFound, redirect } from "next/navigation";
import { AppShell } from "@/components/AppShell";
import { RequestDetailClient } from "@/components/requests/RequestDetailClient";
import { createClient } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import { demoRequest, type ProjectRequest } from "@/lib/requests";
import { recordView } from "@/lib/audit";

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

  const { data: membership, error: membershipError } = await supabase
    .from("memberships")
    .select("organization_id, role, disabled_at")
    .eq("user_id", user.id)
    .in("role", ["admin", "member"])
    .is("disabled_at", null)
    .order("organization_id")
    .limit(1)
    .maybeSingle();

  // A failed check is not a refusal. Saying "you do not have access"
  // when the question could not be asked sends the reader off to fix
  // an account that was never the problem.
  if (membershipError) throw new Error("Your access could not be checked. Refresh and try again.");

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

  // This screen carries a customer's name, company, email and phone together.
  // Specification 13 counts that as viewing client personal data, so it is
  // recorded against the request -- never by copying the details themselves
  // into the log, which would just move the exposure somewhere less guarded.
  await recordView("client_pii.view", "project_request", id);

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
