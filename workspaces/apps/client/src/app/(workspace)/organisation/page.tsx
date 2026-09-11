import type { Metadata } from "next";
import { requireAccount } from "@muco/core/server";
import { formatDate } from "@muco/core";
import { EmptyState, Fact, Facts, Icon, StatusPill } from "@muco/ui";
import { ProfileForm } from "@muco/ui/forms";
import { loadCustomer, loadProjects } from "@/lib/project";

export const metadata: Metadata = { title: "Organisation" };

// Your details and your company's, kept apart on purpose.
//
// The first is yours to change. The second is the studio's record of who it is
// working for, and it is what appears on an invoice — so it is shown here and
// changed by asking, not by typing. A company name somebody edited on a
// Tuesday and an invoice raised on the Wednesday is a reconciliation problem
// for both sides.
export default async function OrganisationPage() {
  const { supabase, userId, email, fullName, phone, avatarUrl } = await requireAccount("client");
  const customer = await loadCustomer(supabase, userId);

  if (!customer) {
    return (
      <div className="page">
        <EmptyState icon="building" title="Your organisation is not linked yet">
          Your account exists but is not attached to a customer record. Tell the studio.
        </EmptyState>
      </div>
    );
  }

  const projects = await loadProjects(supabase, customer.id);

  return (
    <div className="page">
      <div className="page-head">
        <span className="eyebrow">Your details</span>
        <h1>Organisation</h1>
        <p className="lede">
          Who you are, and who the studio is working for. The first is yours to keep current; the
          second appears on your invoices, so it is changed by asking rather than by typing.
        </p>
      </div>

      <section className="panel">
        <div className="panel-head"><h2>You</h2></div>
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
        <div className="panel-head">
          <h2>{customer.company || customer.name}</h2>
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
          <p className="notice">
            <Icon name="info" size={14} />
            <span>
              These details appear on invoices and on anything the studio issues you. If one is
              wrong, tell support and it is corrected at the source rather than in two places.
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
            Your email address is the account itself, so it cannot be swapped here. Ask support if
            it needs to move to a different address.
          </p>
          <div>
            <a className="btn sm" href="/account/password">Change your password</a>
          </div>
        </div>
      </section>
    </div>
  );
}
