import type { Metadata } from "next";
import Link from "next/link";
import { isLocalPreview } from "@muco/core";
import { requireAccount } from "@muco/core/server";
import { formatDate } from "@muco/core";
import { EmptyState, Fact, Facts, Icon, StatusPill } from "@muco/ui";
import { ProfileForm } from "@muco/ui/forms";
import { loadCustomer, loadProjects } from "@/lib/project";

export const metadata: Metadata = { title: "Profile & organisation" };

// Your details and your company's, kept apart on purpose.
//
// The first is yours to change. The second is the studio's record of who it is
// working for, and it is what appears on an invoice — so it is shown here and
// changed by asking, not by typing. A company name somebody edited on a
// Tuesday and an invoice raised on the Wednesday is a reconciliation problem
// for both sides.
export default async function OrganisationPage() {
  const {
    supabase,
    userId,
    email,
    fullName,
    phone,
    avatarUrl,
    linkedinUrl,
    instagramUrl,
  } = await requireAccount("client");
  const customer = await loadCustomer(supabase, userId);

  if (!customer) {
    return (
      <div className="page">
        <div className="page-head"><h1>Profile &amp; organisation</h1></div>
        <EmptyState icon="building" title="Your organisation is not linked yet"
          action={<Link className="btn" href="/support">Contact support</Link>}>
          Your account exists but is not attached to a customer record. Tell the studio.
        </EmptyState>
      </div>
    );
  }

  const projects = await loadProjects(supabase, customer.id);

  return (
    <div className="page client-profile-page">
      <div className="page-head">
        <span className="eyebrow">Your details</span>
        <h1>Profile &amp; organisation</h1>
        <p className="lede">
          Make this workspace yours. Keep your photo and contact details up to date,
          and check the business details we use for your project.
        </p>
      </div>

      <div className="client-profile-layout">
      <section className="panel client-profile-panel" aria-labelledby="personal-profile-heading">
        <div className="panel-head">
          <div className="client-profile-heading">
            <Icon name="user" size={22} />
            <div><h2 id="personal-profile-heading">Your profile</h2><p>Your name, photo and ways to reach you.</p></div>
          </div>
        </div>
        <div className="panel-body">
          <ProfileForm
            userId={userId}
            fullName={fullName ?? ""}
            phone={phone ?? ""}
            email={email ?? ""}
            avatarUrl={avatarUrl}
            linkedinUrl={linkedinUrl}
            instagramUrl={instagramUrl}
            allowSocials
            allowAvatarUpload
          />
        </div>
      </section>

      <section className="panel client-profile-panel client-business-panel" aria-labelledby="business-profile-heading">
        <div className="panel-head">
          <div className="stack-sm"><span className="eyebrow">Business record</span><h2 id="business-profile-heading">{customer.company || customer.name}</h2></div>
          <StatusPill value={customer.status} />
        </div>
        <div className="panel-body stack">
          <Facts>
            <Fact label="Company">{customer.company || "Not recorded"}</Fact>
            <Fact label="Contact name">{customer.name}</Fact>
            <Fact label="Email on file" mono>{customer.email ?? "Not recorded"}</Fact>
            <Fact label="Phone on file" mono>{customer.phone ?? "Not recorded"}</Fact>
            <Fact label="Customer since">{formatDate(customer.created_at)}</Fact>
            <Fact label="Projects">{projects.length === 0 ? "None yet" : String(projects.length)}</Fact>
          </Facts>
          <div className="client-business-note">
            <p>These details are used on invoices. Updating your personal profile does not change this business record.</p>
            <Link className="btn" href="/support"><Icon name="message" size={16} /> Request a correction</Link>
          </div>
        </div>
      </section>
      </div>

      {!isLocalPreview ? <section className="panel">
        <div className="panel-head"><h2>Signing in</h2></div>
        <div className="panel-body stack-sm">
          <Facts>
            <Fact label="Email address" mono>{email}</Fact>
          </Facts>
          <p className="hint">
            Your email address is the account itself, so it cannot be swapped here. Ask support if
            it needs to move to a different address.
          </p>
          <div>
            <a className="btn sm" href="/account/password">Change your password</a>
          </div>
        </div>
      </section> : null}
    </div>
  );
}
