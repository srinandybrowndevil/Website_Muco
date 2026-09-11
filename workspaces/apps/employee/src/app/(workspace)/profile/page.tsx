import type { Metadata } from "next";
import { requireAccount } from "@muco/core/server";
import { formatDate, humanise } from "@muco/core";
import { Fact, Facts, Icon, StatusPill } from "@muco/ui";
import { ProfileForm } from "@muco/ui/forms";

export const metadata: Metadata = { title: "Profile" };

const ROLE_NAMES: Record<string, string> = {
  frontend: "Frontend engineer",
  backend: "Backend engineer",
  mobile: "Mobile developer",
  design: "Designer (UI/UX)",
  qa: "QA and testing",
  seo: "SEO and content",
};

export default async function ProfilePage() {
  const { supabase, userId, organizationId, email, fullName, phone, avatarUrl } =
    await requireAccount("employee");

  const { data: staff } = await supabase
    .from("staff_profiles")
    .select("roles,is_mentor,status,started_on,ended_on")
    .eq("user_id", userId).eq("organization_id", organizationId).maybeSingle();

  return (
    <div className="page">
      <div className="page-head">
        <span className="eyebrow">Your details</span>
        <h1>Profile</h1>
        <p className="lede">
          Your contact details are yours to keep current. Your roles and your dates are set by the
          studio, because they decide what you can open.
        </p>
      </div>

      <section className="panel">
        <div className="panel-head"><h2>What you can change</h2></div>
        <div className="panel-body">
          <ProfileForm
            userId={userId}
            fullName={fullName ?? ""}
            phone={phone ?? ""}
            email={email ?? ""}
            avatarUrl={avatarUrl}
          />
        </div>
      </section>

      <section className="panel">
        <div className="panel-head"><h2>Your engagement</h2></div>
        <div className="panel-body stack">
          <Facts>
            <Fact label="Status">
              {staff ? <StatusPill value={staff.status} /> : "Not recorded"}
            </Fact>
            <Fact label="Started">{formatDate(staff?.started_on)}</Fact>
            <Fact label="Ended">{staff?.ended_on ? formatDate(staff.ended_on) : "Still running"}</Fact>
            <Fact label="Mentor">{staff?.is_mentor ? "Yes — you can be assigned interns" : "No"}</Fact>
          </Facts>

          <div className="stack-sm">
            <span className="label">Roles</span>
            <div className="cluster">
              {(staff?.roles ?? []).length === 0 ? (
                <span className="hint">No roles recorded.</span>
              ) : (
                (staff?.roles ?? []).map((role: string) => (
                  <span className="badge accent" key={role}>{ROLE_NAMES[role] ?? humanise(role)}</span>
                ))
              )}
            </div>
          </div>

          <p className="notice">
            <Icon name="lock" size={14} />
            <span>
              Roles decide what you can be assigned, so they are the studio&rsquo;s to set. If one is
              missing, that is a conversation rather than a form.
            </span>
          </p>
        </div>
      </section>

      <section className="panel">
        <div className="panel-head"><h2>Signing in</h2></div>
        <div className="panel-body stack-sm">
          <Facts>
            <Fact label="Email address" mono>{email}</Fact>
          </Facts>
          <p className="hint">
            One account across every MUCO LABS workspace. Each address holds its own session, so
            signing out here does not sign you out elsewhere.
          </p>
          <div>
            <a className="btn sm" href="/account/password">Change your password</a>
          </div>
        </div>
      </section>
    </div>
  );
}
