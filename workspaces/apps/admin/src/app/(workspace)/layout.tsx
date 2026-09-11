import { requireAccount } from "@muco/core/server";
import { Console } from "@/components/Console";

// Everything inside this group is behind a session. The sign-in pages sit
// outside it, which is why they render without the console around them rather
// than by asking the console to hide itself.
//
// requireAccount runs here as well as in the proxy. The proxy decides whether
// the request may reach a route at all; this decides whether a page may draw,
// and it is the one that survives a mistake in the proxy matcher.
export default async function WorkspaceLayout({ children }: { children: React.ReactNode }) {
  const account = await requireAccount("admin");

  // Three counts, chosen because each one is a queue rather than a statistic:
  // something is waiting for the founder in each. They ride in the navigation
  // so the console can be left open on any page and still show what arrived.
  const [enquiries, requests, completions] = await Promise.all([
    account.supabase
      .from("website_enquiries")
      .select("id", { count: "exact", head: true })
      .eq("organization_id", account.organizationId)
      .eq("status", "new"),
    account.supabase
      .from("project_requests")
      .select("id", { count: "exact", head: true })
      .eq("organization_id", account.organizationId)
      .in("status", ["new", "reviewing"]),
    account.supabase
      .from("intern_profiles")
      .select("id", { count: "exact", head: true })
      .eq("organization_id", account.organizationId)
      .eq("status", "completed"),
  ]);

  return (
    <Console
      name={account.fullName ?? account.email ?? "You"}
      email={account.email ?? ""}
      role={account.role}
      avatar={account.avatarUrl}
      counts={{
        enquiries: enquiries.count ?? 0,
        requests: requests.count ?? 0,
        completions: completions.count ?? 0,
      }}
    >
      {children}
    </Console>
  );
}
