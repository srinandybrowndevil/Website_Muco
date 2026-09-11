import type { Metadata } from "next";
import { requireAccount } from "@muco/core/server";
import { formatDate, humanise } from "@muco/core";
import { Fact, Facts, Icon } from "@muco/ui";
import { ProfileForm } from "@muco/ui/forms";

export const metadata: Metadata = { title: "Profile" };

// Two halves, and the division is the point. What you may change sits in a
// form; what the studio sets sits in a read-only list with a sentence saying
// why. A disabled input would say "not yet"; this says "not yours to edit",
// which is the true statement about an internship end date.
export default async function ProfilePage() {
  const { supabase, userId, organizationId, email, fullName, phone, avatarUrl } =
    await requireAccount("intern");

  const { data: internship } = await supabase
    .from("intern_profiles").select("track,tier,starts_at,ends_at,status,college,mentor_id")
    .eq("user_id", userId).eq("organization_id", organizationId).maybeSingle();

  const { data: mentor } = internship?.mentor_id
    ? await supabase.from("profiles").select("full_name").eq("id", internship.mentor_id).maybeSingle()
    : { data: null };

  return (
    <div className="page">
      <div className="page-head">
        <span className="eyebrow">Your details</span>
        <h1>Profile</h1>
        <p className="lede">
          Your contact details are yours to keep current. Your dates, track and mentor are set by
          the studio, because your certificate is issued from them.
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
        <div className="panel-head"><h2>What the studio sets</h2></div>
        <div className="panel-body stack">
          <Facts>
            <Fact label="Track">{internship ? humanise(internship.track).replace("Intern ", "") : "Not set"}</Fact>
            <Fact label="Duration">{internship?.tier ? internship.tier.replace("m", "") + " month" : "Not set"}</Fact>
            <Fact label="Starts">{formatDate(internship?.starts_at)}</Fact>
            <Fact label="Ends">{formatDate(internship?.ends_at)}</Fact>
            <Fact label="Mentor">{mentor?.full_name ?? "Not assigned"}</Fact>
            <Fact label="College">{internship?.college ?? "Not recorded"}</Fact>
          </Facts>
          <p className="notice">
            <Icon name="lock" size={14} />
            <span>
              If one of these is wrong, tell your mentor. Changing it here would change what your
              certificate says, which is why it is not editable.
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
            Your email address is the account itself, so it cannot be swapped here. You have one
            account across every MUCO LABS workspace.
          </p>
          <div>
            <a className="btn sm" href="/account/password">Change your password</a>
          </div>
        </div>
      </section>
    </div>
  );
}
