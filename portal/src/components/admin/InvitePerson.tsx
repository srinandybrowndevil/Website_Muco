"use client";

import { FormEvent, useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";

// Checklist 6.3, 6.4 and 6.5: inviting an intern, an employee, and a client.
//
// The form this replaces offered two roles, Member and Admin. An intern or an
// employee could only be created by writing SQL, and a client invitation was
// not merely missing but impossible: create_invitation refuses a client
// invitation carrying no customer, and the form had nowhere to name one.
//
// The role-specific answers are not rows yet and cannot be. An internship
// record points at a person who does not exist until they accept, so what the
// founder fills in here rides on the invitation and becomes a record at
// acceptance. That is also why the validation lives in the database: an
// invitation that cannot become a record should fail in front of the person
// creating it, not weeks later in front of the person accepting it.

type Customer = { id: string; name: string; company: string | null };
type Member = { user_id: string; name: string };

const ROLES = [
  ["client", "Client", "Signs in to their own portal and sees one project."],
  ["intern", "Intern", "Dated access to a sandbox, a work log and a certificate."],
  ["employee", "Employee or contractor", "Assigned projects and their own compensation."],
  ["member", "Team member", "A weaker founder seat. Sees the studio, not the payroll."],
  ["admin", "Administrator", "Everything, including this page."],
] as const;

const TRACKS = [
  ["intern_frontend", "Frontend"], ["intern_backend", "Backend"], ["intern_mobile", "Mobile"],
  ["intern_design", "Design"], ["intern_qa", "QA"], ["intern_seo", "SEO"],
] as const;

const TIERS = [
  ["one_month", "One month"], ["two_month", "Two months"], ["three_month", "Three months"],
] as const;

const STAFF_ROLES = [
  ["frontend", "Frontend"], ["backend", "Backend"], ["mobile", "Mobile"],
  ["design", "Design"], ["qa", "QA"], ["seo", "SEO"],
] as const;

export function InvitePerson({
  organizationId, onCreated,
}: { organizationId: string; onCreated: (url: string) => void }) {
  const [role, setRole] = useState<string>("client");
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [members, setMembers] = useState<Member[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Loaded once. A client invitation needs a customer to attach to and an
  // intern invitation needs somebody to name as mentor, and both lists are
  // small enough that a select beats a search box.
  useEffect(() => {
    const client = createClient();
    if (!client) return;
    let live = true;

    void (async () => {
      const [customerRows, memberRows] = await Promise.all([
        client.from("customers").select("id, name, company")
          .eq("organization_id", organizationId).order("name").limit(500),
        client.from("memberships").select("user_id, role, disabled_at, profiles(full_name)")
          .eq("organization_id", organizationId),
      ]);
      if (!live) return;
      setCustomers((customerRows.data ?? []) as Customer[]);
      setMembers((memberRows.data ?? [])
        .filter(row => !row.disabled_at && row.role !== "client" && row.role !== "intern")
        .map(row => ({
          user_id: row.user_id as string,
          name: (row.profiles as unknown as { full_name: string | null } | null)?.full_name || "Name not set",
        })));
    })();

    return () => { live = false; };
  }, [organizationId]);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setError(null);
    onCreated("");

    const form = event.currentTarget;
    const values = new FormData(form);
    const details: Record<string, unknown> = {};

    if (role === "intern") {
      details.track = values.get("track");
      details.tier = values.get("tier");
      details.starts_at = values.get("starts_at");
      details.ends_at = values.get("ends_at");
      const mentor = String(values.get("mentor_id") || "");
      if (mentor) details.mentor_id = mentor;
      const college = String(values.get("college") || "").trim();
      if (college) details.college = college;
    }

    if (role === "employee") {
      details.roles = values.getAll("staff_roles").map(String);
      details.is_mentor = values.get("is_mentor") === "on";
      const engagement = String(values.get("engagement") || "");
      if (engagement) {
        details.engagement = engagement;
        details.amount = Number(values.get("amount") || 0);
        const cycle = String(values.get("cycle_label") || "").trim();
        if (cycle) details.cycle_label = cycle;
      }
    }

    try {
      const client = createClient();
      if (!client) throw new Error("This workspace is not configured for sign-in.");
      const { data, error: failed } = await client.rpc("create_invitation", {
        invite_organization_id: organizationId,
        invite_email: String(values.get("email")).trim(),
        invite_role: role,
        invite_customer_id: role === "client" ? String(values.get("customer_id")) : null,
        invite_details: details,
      });
      if (failed) throw new Error(failed.message);
      onCreated(window.location.origin + "/accept-invite?token=" + encodeURIComponent(String(data)));
      form.reset();
      setRole("client");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not create the invitation.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <form onSubmit={submit} className="panel invitefields">
      <h2>Invite someone</h2>

      <label>
        Their email
        <input name="email" type="email" required placeholder="them@example.com" />
      </label>

      <fieldset className="rolechoice">
        <legend>What are they joining as?</legend>
        {ROLES.map(([value, title, blurb]) => (
          <label key={value} className={role === value ? "rolecard chosen" : "rolecard"}>
            <input type="radio" name="role" value={value} checked={role === value}
              onChange={() => setRole(value)} />
            <span><b>{title}</b><small>{blurb}</small></span>
          </label>
        ))}
      </fieldset>

      {role === "client" && (
        <label>
          Which customer are they?
          <select name="customer_id" required defaultValue="">
            <option value="" disabled>Choose a customer record</option>
            {customers.map(customer => (
              <option key={customer.id} value={customer.id}>
                {customer.name}{customer.company ? " · " + customer.company : ""}
              </option>
            ))}
          </select>
          <small className="fieldnote">
            A client signs in against an existing customer record, which is what ties them to
            their invoices and their project. If they are not listed, create the customer first.
          </small>
        </label>
      )}

      {role === "intern" && (
        <div className="fieldgrid">
          <label>
            Track
            <select name="track" required defaultValue="intern_frontend">
              {TRACKS.map(([value, title]) => <option key={value} value={value}>{title}</option>)}
            </select>
          </label>
          <label>
            Length
            <select name="tier" required defaultValue="one_month">
              {TIERS.map(([value, title]) => <option key={value} value={value}>{title}</option>)}
            </select>
          </label>
          <label>Starts<input name="starts_at" type="date" required /></label>
          <label>Ends<input name="ends_at" type="date" required /></label>
          <label>
            Mentor
            <select name="mentor_id" defaultValue="">
              <option value="">Assign later</option>
              {members.map(member => (
                <option key={member.user_id} value={member.user_id}>{member.name}</option>
              ))}
            </select>
          </label>
          <label>College<input name="college" placeholder="Optional" /></label>
          <p className="fieldnote">
            The length picks the default permission pack. The dates are what actually lock the
            workspace, so a six-week internship is two dates, not a new tier.
          </p>
        </div>
      )}

      {role === "employee" && (
        <div className="fieldgrid">
          <fieldset className="rolechecks">
            <legend>Roles</legend>
            {STAFF_ROLES.map(([value, title]) => (
              <label key={value} className="checkline">
                <input type="checkbox" name="staff_roles" value={value} />
                <span>{title}</span>
              </label>
            ))}
          </fieldset>
          <label className="checkline">
            <input type="checkbox" name="is_mentor" />
            <span>They mentor interns</span>
          </label>
          <label>
            Engagement
            <select name="engagement" defaultValue="">
              <option value="">Record compensation later</option>
              <option value="retainer_monthly">Monthly retainer</option>
              <option value="project_fee">Project fee</option>
            </select>
          </label>
          <label>Amount<input name="amount" type="number" min="0" step="1" placeholder="0" /></label>
          <label>Period label<input name="cycle_label" placeholder="Monthly, or the project name" /></label>
          <p className="fieldnote">
            Mentoring is a flag, not a role. A contractor on a project fee and a retained
            employee both come through here — what differs is the engagement, not the door.
          </p>
        </div>
      )}

      {error && <p className="error" role="alert">{error}</p>}

      <button className="primary" disabled={busy}>
        {busy ? "Creating…" : "Create invitation link"}
      </button>

      <p className="fieldnote">
        No email is sent. You get a single-use link to pass on however you already talk to
        them, and it expires in seven days.
      </p>
    </form>
  );
}
