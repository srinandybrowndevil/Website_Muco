import Link from "next/link";
import type { Metadata } from "next";
import { requireAdmin } from "@muco/core/server";
import { Callout } from "@muco/ui";
import { InviteIntern } from "@/components/InviteIntern";

export const metadata: Metadata = { title: "Invite an intern" };

// Widened on purpose: the three tabs compare against each other, and a literal
// type makes TypeScript call two of the three comparisons unreachable.
const KIND: string = "intern";

// requireAdmin, not requireAccount. A member runs the studio; only an
// administrator creates people. The database says the same thing --
// create_invitation calls is_org_admin -- so this decides what is drawn rather
// than what is permitted, and a member who reaches the URL is sent home
// instead of meeting a form that will refuse them.
export default async function InviteInternPage() {
  const { supabase, organizationId } = await requireAdmin();

  const { data: mentors } = await supabase
    .from("staff_profiles")
    .select("user_id,profiles(full_name)")
    .eq("organization_id", organizationId)
    .eq("is_mentor", true)
    .eq("status", "active");

  const options = (mentors ?? []).map(row => {
    const profile = Array.isArray(row.profiles) ? row.profiles[0] : row.profiles;
    return {
      id: row.user_id as string,
      name: (profile as { full_name?: string } | null)?.full_name ?? "Unnamed",
    };
  });

  return (
    <div className="page">
      <div className="page-head">
        <span className="eyebrow">New person</span>
        <h1>Invite an intern</h1>
        <p className="lede">
          The track, the duration, the dates and the mentor ride on the invitation and become an
          internship record when it is accepted. They are checked now rather than then, so an
          invitation that cannot become a record fails in front of you.
        </p>
      </div>

      <div className="tabs">
        <Link href="/people/invite/intern" aria-current={KIND === "intern" ? "page" : undefined}>Intern</Link>
        <Link href="/people/invite/staff" aria-current={KIND === "staff" ? "page" : undefined}>Staff</Link>
        <Link href="/people/invite/client" aria-current={KIND === "client" ? "page" : undefined}>Client</Link>
      </div>

      <section className="panel">
        <div className="panel-body">
          <InviteIntern organizationId={organizationId} mentors={options} />
        </div>
      </section>

      <Callout tone="info" icon="shield" title="What an intern will and will not see">
        Their dates, the work assigned to them, their own log, assigned learning, and the slice of a
        project you grant them. Not customer contact details, not invoices, and not the source of
        anything they are not assigned to.
      </Callout>
    </div>
  );
}
