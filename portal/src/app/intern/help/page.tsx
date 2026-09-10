import { requireIntern } from "@/lib/intern";
import { createClient } from "@/lib/supabase/server";
import { InternShell } from "@/components/intern/InternShell";
import { readSettings } from "@/lib/settings";

// Checklist 2.8: where an intern goes when they are stuck.
//
// The row asks for a path to the mentor rather than the founder, and it is
// right to. An intern who is told to message the founder learns that the
// mentor is decorative, and the founder becomes the support desk for every
// question anyone has. So the mentor is named first and given a working link;
// the studio address is the fallback for when there is no mentor yet, or the
// question is not one a mentor can answer.

export const metadata = { title: "Getting help" };

export default async function InternHelpPage() {
  const { userId, readOnly, organizationId } = await requireIntern();
  const client = await createClient();
  if (!client) throw new Error("Configure Supabase before opening help.");

  const [internship, settings] = await Promise.all([
    client.from("intern_profiles")
      .select("mentor:profiles!intern_profiles_mentor_id_fkey(full_name, phone)")
      .eq("user_id", userId).maybeSingle(),
    readSettings(organizationId),
  ]);

  const mentor = internship.data?.mentor as unknown as
    { full_name: string | null; phone: string | null } | null;

  return (
    <InternShell readOnly={readOnly}>
      <div className="pagehead">
        <div>
          <p className="eyebrow">Internship</p>
          <h1>Getting help.</h1>
          <p>Ask early. A question asked on day one costs nothing; the same question asked in week three costs a week.</p>
        </div>
      </div>

      <section className="panel">
        <h2>Your mentor</h2>
        {mentor?.full_name ? (
          <>
            <p className="helpname">{mentor.full_name}</p>
            <p>
              Your mentor is the first person to ask about the work, your tasks, your log and
              anything you are blocked on. They see your work log, so you do not have to
              re-explain what you have already written there.
            </p>
            {mentor.phone && (
              <p className="muted">Reach them on {mentor.phone} during working hours.</p>
            )}
          </>
        ) : (
          <p>
            No mentor is assigned to you yet. Until one is, use the studio address below and
            somebody will point you to the right person.
          </p>
        )}
      </section>

      <section className="panel">
        <h2>The studio</h2>
        {settings.supportEmail ? (
          <p>
            For anything your mentor cannot settle — your dates, your certificate, or a problem
            with this workspace — write to{" "}
            <a href={`mailto:${settings.supportEmail}`}>{settings.supportEmail}</a>.
          </p>
        ) : (
          <p>
            No studio address has been set yet. Ask your mentor, and ask them to have the
            founder set one on the workspace settings page so the next intern does not have to.
          </p>
        )}
        <p className="muted">
          This workspace holds your dates, your work log and your certificate. It does not hold
          customer records, invoices or other projects, so a question about those is not one
          anybody here can answer for you.
        </p>
      </section>
    </InternShell>
  );
}
