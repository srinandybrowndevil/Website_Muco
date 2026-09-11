"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { createClient } from "@muco/core/browser";
import { Icon } from "@muco/ui";

// Matching the roles published on the careers page, plus QA. Inventing a role
// here that the studio does not advertise would put a job title in front of a
// contractor that nobody at MUCO LABS uses.
const ROLES: [string, string][] = [
  ["frontend", "Frontend engineer"],
  ["backend", "Backend engineer"],
  ["mobile", "Mobile developer"],
  ["design", "Designer (UI/UX)"],
  ["qa", "QA and testing"],
  ["seo", "SEO and content"],
];

/**
 * Inviting staff, and recording what they are paid at the same time.
 *
 * Compensation rides on the invitation and becomes a row when it is accepted,
 * for the same reason the internship dates do: the record points at an account
 * that does not exist yet.
 *
 * Both engagement types are offered because the careers page offers contract
 * and project work rather than salaried posts. Labelling every contractor a
 * monthly employee would be the interface disagreeing with the company.
 */
export function InviteStaff({ organizationId }: { organizationId: string }) {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [roles, setRoles] = useState<string[]>([]);
  const [isMentor, setIsMentor] = useState(false);
  const [engagement, setEngagement] = useState("");
  const [amount, setAmount] = useState("");
  const [cycle, setCycle] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [link, setLink] = useState<string | null>(null);

  function toggle(role: string) {
    setRoles(current =>
      current.includes(role) ? current.filter(item => item !== role) : [...current, role]);
  }

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    setBusy(true);
    setError(null);

    const supabase = createClient();
    if (!supabase) {
      setBusy(false);
      setError("Not connected to the database.");
      return;
    }

    const details: Record<string, unknown> = { roles, is_mentor: isMentor };
    if (engagement) {
      details.engagement = engagement;
      details.amount = Number(amount || 0);
      if (cycle.trim()) details.cycle_label = cycle.trim();
    }

    const { data, error: failure } = await supabase.rpc("create_invitation", {
      invite_organization_id: organizationId,
      invite_email: email.trim(),
      invite_role: "employee",
      invite_customer_id: null,
      valid_for: "7 days",
      invite_details: details,
    });

    setBusy(false);
    if (failure) {
      setError(failure.message);
      return;
    }
    setLink(window.location.origin.replace("admin.", "employee.") + "/accept-invite?token=" + data);
    router.refresh();
  }

  if (link) {
    return (
      <div className="stack">
        <div className="callout ok">
          <Icon name="checkCircle" size={18} />
          <div>
            <b>Invitation created for {email}.</b>
            <p>It opens the employee workspace, works once, and expires in seven days.</p>
          </div>
        </div>
        <div className="field">
          <label htmlFor="staff-link">Link</label>
          <input id="staff-link" readOnly value={link} onFocus={event => event.target.select()} />
        </div>
        <div className="cluster">
          <button className="btn primary" type="button" onClick={() => navigator.clipboard.writeText(link)}>
            <Icon name="link" size={15} /><span>Copy link</span>
          </button>
          <button className="btn quiet" type="button" onClick={() => { setLink(null); setEmail(""); }}>
            Invite somebody else
          </button>
        </div>
      </div>
    );
  }

  return (
    <form className="stack" onSubmit={submit}>
      <div className="field">
        <label htmlFor="staff-email">Email address</label>
        <input id="staff-email" type="email" value={email}
          onChange={event => setEmail(event.target.value)} required />
      </div>

      <div className="field">
        <span className="label">Roles</span>
        <div className="cluster">
          {ROLES.map(([value, label]) => (
            <button
              key={value}
              type="button"
              className="chip"
              aria-pressed={roles.includes(value)}
              onClick={() => toggle(value)}
            >
              {label}
            </button>
          ))}
        </div>
        <span className="hint">At least one. Roles decide what this person can be assigned.</span>
      </div>

      <label className="checkline">
        <input type="checkbox" checked={isMentor} onChange={event => setIsMentor(event.target.checked)} />
        <span>
          Can mentor interns. A mentor sees their mentees&rsquo; work logs and attendance, and is
          the only person who can recommend a completion.
        </span>
      </label>

      <div className="field">
        <label htmlFor="staff-engagement">Compensation (optional, can be set later)</label>
        <select id="staff-engagement" value={engagement} onChange={event => setEngagement(event.target.value)}>
          <option value="">Not recorded yet</option>
          <option value="retainer_monthly">Monthly retainer</option>
          <option value="project_fee">Per-project fee</option>
        </select>
      </div>

      {engagement ? (
        <div className="grid-2">
          <div className="field">
            <label htmlFor="staff-amount">Amount (INR)</label>
            <input id="staff-amount" type="number" min="0" step="500" value={amount}
              onChange={event => setAmount(event.target.value)} required />
          </div>
          <div className="field">
            <label htmlFor="staff-cycle">Label (optional)</label>
            <input id="staff-cycle" type="text" value={cycle}
              onChange={event => setCycle(event.target.value)}
              placeholder={engagement === "retainer_monthly" ? "per month" : "for the project"} />
          </div>
        </div>
      ) : null}

      {error ? <p className="errortext" role="alert">{error}</p> : null}

      <div>
        <button className="btn primary" type="submit" disabled={busy || !email.trim() || roles.length === 0}>
          <Icon name="userPlus" size={15} />
          <span>{busy ? "Creating" : "Create invitation"}</span>
        </button>
      </div>
    </form>
  );
}
