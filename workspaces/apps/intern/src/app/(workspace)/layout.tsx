import { requireAccount } from "@muco/core/server";
import { InternShell } from "@/components/InternShell";

// How long is left is the fact an intern opens this workspace to find out, so
// it is resolved here and shown in the header on every page rather than only
// on the home page.
//
// intern_access is the single source of that answer. It is SECURITY DEFINER
// and reads the membership as well as the dates, so an internship inside its
// dates whose account has been switched off comes back "closed" rather than
// "active" — which is the case a date comparison written in a page would get
// wrong, silently, on the one day it mattered.
export default async function WorkspaceLayout({ children }: { children: React.ReactNode }) {
  const account = await requireAccount("intern");

  const { data } = await account.supabase.rpc("intern_access", { p_user: account.userId });
  const access = Array.isArray(data) ? data[0] : data;

  return (
    <InternShell
      state={access?.state ?? "closed"}
      daysLeft={typeof access?.days_left === "number" ? access.days_left : null}
    >
      {children}
    </InternShell>
  );
}
