import Link from "next/link";
import { redirect } from "next/navigation";
import { AppShell } from "@/components/AppShell";
import { EmptyState } from "@/components/EmptyState";
import { createClient } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import {
  demoRequest,
  formatDate,
  requestStatusLabel,
  requestStatusTone,
  type ProjectRequest,
} from "@/lib/requests";

function RequestTable({ requests }: { requests: ProjectRequest[] }) {
  return (
    <div className="tablewrap">
      <table>
        <caption className="visually-hidden">Customer project requests</caption>
        <thead>
          <tr>
            <th scope="col">Request</th>
            <th scope="col">Customer</th>
            <th scope="col">Service</th>
            <th scope="col">Submitted</th>
            <th scope="col">Status</th>
            <th scope="col">Action</th>
          </tr>
        </thead>
        <tbody>
          {requests.map((r) => (
            <tr key={r.id}>
              <td>
                <Link href={`/requests/${r.id}`}>
                  <b>{r.title}</b>
                </Link>
                <small>{r.id.slice(0, 8)}</small>
              </td>
              <td>
                {r.customers?.name ?? "—"}
                {r.customers?.company ? <small>{r.customers.company}</small> : null}
              </td>
              <td>{r.service ?? "—"}</td>
              <td>{formatDate(r.created_at)}</td>
              <td>
                <em className={`status ${requestStatusTone(r.status)}`}>{requestStatusLabel[r.status]}</em>
              </td>
              <td><Link className="secondary" href={`/requests/${r.id}`}>Open request</Link></td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export default async function RequestsInboxPage() {
  let requests: ProjectRequest[] = [];
  let error: string | null = null;

  if (!isSupabaseConfigured) {
    requests = [demoRequest];
  } else {
    const supabase = await createClient();
    if (!supabase) {
      error = "Supabase is not configured.";
    } else {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) {
        redirect("/login?next=/requests");
      }
      const { data: membership } = await supabase
        .from("memberships")
        .select("organization_id")
        .eq("user_id", user.id)
        .in("role", ["admin", "member"])
        .order("organization_id")
        .limit(1)
        .maybeSingle();
      if (!membership) {
        error = "You do not have access to the request inbox.";
      } else {
        const { data, error: fetchError } = await supabase
          .from("project_requests")
          .select("*, customers(name, company)")
          .eq("organization_id", membership.organization_id)
          .order("created_at", { ascending: false });
        if (fetchError) {
          error = fetchError.message;
        } else {
          requests = (data as ProjectRequest[]) ?? [];
        }
      }
    }
  }

  return (
    <AppShell>
      <div className="page">
        <div className="pagehead">
          <div>
            <p className="eyebrow">Workspace / REQUESTS</p>
            <h1>Project requests.</h1>
            <p>Customer submissions, from first contact to conversion.</p>
          </div>
        </div>

        {error && (
          <div className="panel error" role="alert">
            {error}
          </div>
        )}

        {!error && requests.length === 0 && (
          <div className="panel">
            <EmptyState
              icon="inbox"
              title="The inbox is clear"
              body="Every project request a customer submits from their portal lands here with their brief, budget, timeline and files, ready to review and set a status on."
              action={{ label: "Check enquiries", href: "/enquiries" }}
              note="Contact actions on mucolabs.com now require sign-in, so requests arrive attached to a real customer account."
            />
          </div>
        )}

        {!error && requests.length > 0 && <RequestTable requests={requests} />}

        {!isSupabaseConfigured && requests.length > 0 && (
          <p className="demopill" aria-live="polite">
            Preview mode — data is not saved.
          </p>
        )}
      </div>
    </AppShell>
  );
}
