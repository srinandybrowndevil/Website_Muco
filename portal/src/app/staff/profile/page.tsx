import { requireStaff } from "@/lib/staff";
import { createClient } from "@/lib/supabase/server";
import { StaffShell } from "@/components/staff/StaffShell";
import { PersonalDetails } from "@/components/account/PersonalDetails";

// Checklist 4.9: the role label, on a page that belongs to the person.
//
// Roles are shown here and set elsewhere, deliberately. What somebody is
// engaged as is an agreement between them and the studio, not a preference,
// and a field they could edit would be a field they could quietly widen.

export const metadata = { title: "Your profile" };

const ROLE: Record<string, string> = {
  frontend: "Frontend engineer", backend: "Backend engineer", mobile: "Mobile engineer",
  design: "Designer", qa: "QA engineer", seo: "SEO specialist",
};

const STATUS: Record<string, string> = {
  invited: "Invited", active: "Active", paused: "Paused", ended: "Ended",
};

function formatDate(value: string | null) {
  if (!value) return "Not recorded";
  return new Date(`${value}T00:00:00`).toLocaleDateString("en-IN", {
    day: "numeric", month: "long", year: "numeric",
  });
}

export default async function StaffProfilePage() {
  const { userId } = await requireStaff();
  const client = await createClient();
  if (!client) throw new Error("Configure Supabase before opening your profile.");

  const [me, staff] = await Promise.all([
    client.from("profiles").select("full_name, phone").eq("id", userId).maybeSingle(),
    client.from("staff_profiles").select("roles, is_mentor, status, started_on")
      .eq("user_id", userId).maybeSingle(),
  ]);

  const roles = (staff.data?.roles as string[] | null) ?? [];

  return (
    <StaffShell>
      <div className="pagehead">
        <div>
          <p className="eyebrow">Staff</p>
          <h1>Your profile.</h1>
          <p>What you are engaged as, and how the studio reaches you.</p>
        </div>
      </div>

      <section className="panel">
        <h2>Your engagement</h2>
        <dl className="detaillist">
          <div>
            <dt>Role</dt>
            <dd>
              {roles.length
                ? roles.map(role => ROLE[role] ?? role).join(" · ")
                : "No role recorded yet"}
            </dd>
          </div>
          <div><dt>Mentor</dt><dd>{staff.data?.is_mentor ? "Yes — you mentor interns" : "No"}</dd></div>
          <div><dt>Status</dt><dd>{STATUS[String(staff.data?.status)] ?? staff.data?.status ?? "Not set"}</dd></div>
          <div><dt>Started</dt><dd>{formatDate(staff.data?.started_on ?? null)}</dd></div>
        </dl>
        <p className="muted">
          Roles are set by the founder. If one of these is wrong it is a correction to make,
          not a setting to change — say so and it will be fixed at the record.
        </p>
      </section>

      <section className="panel">
        <h2>Your details</h2>
        <PersonalDetails fullName={me.data?.full_name ?? null} phone={me.data?.phone ?? null} />
      </section>
    </StaffShell>
  );
}
