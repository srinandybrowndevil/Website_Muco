import { requireAccount } from "@muco/core/server";
import { ClientShell } from "@/components/ClientShell";

export default async function WorkspaceLayout({ children }: { children: React.ReactNode }) {
  const account = await requireAccount("client");

  // Which company this person belongs to. The policy on customers is
  // auth_user_id = auth.uid(), so this returns their own record or nothing —
  // the filter is for clarity rather than for safety.
  const { data: customer } = await account.supabase
    .from("customers")
    .select("company,name")
    .eq("auth_user_id", account.userId)
    .maybeSingle();

  return (
    <ClientShell
      company={customer?.company || customer?.name || "Your organisation"}
      person={account.fullName ?? account.email ?? ""}
    >
      {children}
    </ClientShell>
  );
}
