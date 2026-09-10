import { createClient } from "@/lib/supabase/server";
import { WorkspaceLink as Link } from "@/components/WorkspaceHost";

// Checklist 6.1: people, certificates waiting, grants ending soon.
//
// Three counts, chosen because each one is a thing that goes wrong quietly.
// Nobody notices an intern who finished last week and never got their
// certificate, or a grant that lapses on Friday, until somebody complains.
//
// A count of zero is shown as zero. The alternative -- hiding the tile when
// there is nothing -- teaches you to read absence as "not measured" rather
// than "nothing to do", and then a genuinely broken query looks like calm.

function endOfWindow(days: number) {
  const date = new Date();
  date.setDate(date.getDate() + days);
  return date.toISOString().slice(0, 10);
}

export async function WorkspaceCounts({ organizationId }: { organizationId: string }) {
  const client = await createClient();
  if (!client) return null;

  const today = new Date().toISOString().slice(0, 10);
  const soon = endOfWindow(14);

  const [people, interns, certificates, grants] = await Promise.all([
    client.from("memberships").select("user_id, disabled_at").eq("organization_id", organizationId),
    client.from("intern_profiles").select("id, ends_at, status").eq("organization_id", organizationId),
    client.from("intern_certificates").select("intern_id").eq("organization_id", organizationId),
    client.from("project_grants").select("id, ends_at").eq("organization_id", organizationId)
      .not("ends_at", "is", null).gte("ends_at", today).lte("ends_at", soon),
  ]);

  const active = (people.data ?? []).filter(row => !row.disabled_at).length;
  const switchedOff = (people.data ?? []).length - active;

  // Waiting is derived, not stored. An internship is waiting when it has
  // finished and has no certificate; a status column saying the same thing
  // would be a second fact able to disagree with the first.
  const issued = new Set((certificates.data ?? []).map(row => row.intern_id as string));
  const waiting = (interns.data ?? []).filter(row =>
    !issued.has(row.id as string) &&
    (row.status === "completed" || String(row.ends_at) < today)).length;

  const ending = (grants.data ?? []).length;

  return (
    <div className="tally counts">
      <div>
        <b>{active}</b>
        <small>People with access</small>
        {switchedOff > 0 && <em>{switchedOff} switched off</em>}
        <Link href="/admin/people">Open</Link>
      </div>
      <div className={waiting > 0 ? "needsyou" : ""}>
        <b>{waiting}</b>
        <small>Certificates waiting on you</small>
        <Link href="/admin/certificates">Open</Link>
      </div>
      <div className={ending > 0 ? "needsyou" : ""}>
        <b>{ending}</b>
        <small>Grants ending in 14 days</small>
        <Link href="/admin/grants">Open</Link>
      </div>
    </div>
  );
}
