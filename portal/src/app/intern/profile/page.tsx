import { requireIntern } from "@/lib/intern";
import { createClient } from "@/lib/supabase/server";
import { InternShell } from "@/components/intern/InternShell";
import { PersonalDetails } from "@/components/account/PersonalDetails";

// Checklist 2.7: the fields an intern may edit, and the ones they may not.
//
// The dates are the whole lockout. An intern who could move ends_at could
// extend their own internship, so they are shown here as plain text with the
// reason next to them rather than as a disabled input that merely looks
// unavailable -- and the database refuses the write regardless of what this
// page renders.

export const metadata = { title: "Your details" };

const TRACK: Record<string, string> = {
  intern_frontend: "Frontend", intern_backend: "Backend", intern_mobile: "Mobile",
  intern_design: "Design", intern_qa: "QA", intern_seo: "SEO",
};

const TIER: Record<string, string> = {
  one_month: "One month", two_month: "Two months", three_month: "Three months",
};

function formatDate(value: string | null) {
  if (!value) return "Not set";
  return new Date(`${value}T00:00:00`).toLocaleDateString("en-IN", {
    day: "numeric", month: "long", year: "numeric",
  });
}

export default async function InternProfilePage() {
  const { userId, readOnly } = await requireIntern();
  const client = await createClient();
  if (!client) throw new Error("Configure Supabase before opening your details.");

  const [me, internship] = await Promise.all([
    client.from("profiles").select("full_name, phone").eq("id", userId).maybeSingle(),
    client.from("intern_profiles")
      .select("track, tier, starts_at, ends_at, college, status, grace_days, mentor:profiles!intern_profiles_mentor_id_fkey(full_name)")
      .eq("user_id", userId).maybeSingle(),
  ]);

  const row = internship.data;
  const mentorName = (row?.mentor as unknown as { full_name: string | null } | null)?.full_name;

  return (
    <InternShell readOnly={readOnly}>
      <div className="pagehead">
        <div>
          <p className="eyebrow">Internship</p>
          <h1>Your details.</h1>
          <p>Change what is yours to change. The rest is here so you can read it.</p>
        </div>
      </div>

      <section className="panel">
        <h2>What you can change</h2>
        <PersonalDetails fullName={me.data?.full_name ?? null} phone={me.data?.phone ?? null} />
      </section>

      <section className="panel">
        <h2>What the studio sets</h2>
        <p className="muted">
          These are set when your internship is created and cannot be edited from here or
          through the API. If any of them is wrong, tell your mentor — it is a correction,
          not a request.
        </p>
        <dl className="detaillist">
          <div><dt>Track</dt><dd>{TRACK[String(row?.track)] ?? row?.track ?? "Not set"}</dd></div>
          <div><dt>Length</dt><dd>{TIER[String(row?.tier)] ?? row?.tier ?? "Not set"}</dd></div>
          <div><dt>Starts</dt><dd>{formatDate(row?.starts_at ?? null)}</dd></div>
          <div><dt>Ends</dt><dd>{formatDate(row?.ends_at ?? null)}</dd></div>
          <div><dt>Read-only window after the end</dt><dd>{row?.grace_days ?? 7} days</dd></div>
          <div><dt>Mentor</dt><dd>{mentorName || "Not assigned yet"}</dd></div>
          <div><dt>College</dt><dd>{row?.college || "Not recorded"}</dd></div>
          <div><dt>Status</dt><dd>{row?.status ?? "Not set"}</dd></div>
        </dl>
      </section>
    </InternShell>
  );
}
