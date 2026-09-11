import { requireAccount } from "@muco/core/server";
import { WorkShell } from "@/components/WorkShell";

export default async function WorkspaceLayout({ children }: { children: React.ReactNode }) {
  const account = await requireAccount("employee");

  // Whether this person mentors anybody decides whether the navigation has a
  // Mentoring item at all. Reading it here rather than in the page means the
  // item cannot appear on one screen and vanish on the next.
  const { data: staff } = await account.supabase
    .from("staff_profiles")
    .select("is_mentor")
    .eq("user_id", account.userId)
    .eq("organization_id", account.organizationId)
    .maybeSingle();

  return (
    <WorkShell
      name={account.fullName ?? account.email ?? "You"}
      email={account.email ?? ""}
      avatar={account.avatarUrl}
      isMentor={!!staff?.is_mentor}
    >
      {children}
    </WorkShell>
  );
}
