"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { createClient } from "@muco/core/browser";
import { Icon } from "@muco/ui";

const TRACKS: [string, string][] = [
  ["intern_frontend", "Frontend"],
  ["intern_backend", "Backend"],
  ["intern_mobile", "Mobile"],
  ["intern_design", "Design (UI/UX)"],
  ["intern_qa", "QA and testing"],
  ["intern_seo", "SEO and content"],
];

const TIERS: [string, string, number][] = [
  ["m1", "One month", 30],
  ["m2", "Two months", 60],
  ["m3", "Three months", 90],
];

/**
 * Creating an internship before the person exists.
 *
 * The track, the tier and the dates ride on the invitation and become an
 * intern_profiles row when it is accepted. They cannot be rows now, because
 * that record points at an account nobody has created yet.
 *
 * They are validated when the invitation is made rather than when it is
 * redeemed. create_invitation refuses an intern invitation with no track, no
 * tier or no dates, and refuses an end date before a start date — so an
 * invitation that cannot become a record fails in front of the person making
 * it, not three weeks later in front of the intern.
 */
export function InviteIntern({
  organizationId,
  mentors,
}: {
  organizationId: string;
  mentors: { id: string; name: string }[];
}) {
  const router = useRouter();
  const today = new Date().toISOString().slice(0, 10);

  const [email, setEmail] = useState("");
  const [track, setTrack] = useState(TRACKS[0][0]);
  const [tier, setTier] = useState("m2");
  const [startsAt, setStartsAt] = useState(today);
  const [endsAt, setEndsAt] = useState("");
  const [mentorId, setMentorId] = useState("");
  const [college, setCollege] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [link, setLink] = useState<string | null>(null);

  // Suggesting the end date from the tier is the difference between a form
  // that knows what a two-month internship is and one that makes somebody
  // count days in their head.
  function pickTier(value: string) {
    setTier(value);
    const days = TIERS.find(row => row[0] === value)?.[2] ?? 60;
    const start = new Date(startsAt || today);
    setEndsAt(new Date(start.getTime() + days * 86_400_000).toISOString().slice(0, 10));
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

    const { data, error: failure } = await supabase.rpc("create_invitation", {
      invite_organization_id: organizationId,
      invite_email: email.trim(),
      invite_role: "intern",
      invite_customer_id: null,
      valid_for: "7 days",
      invite_details: {
        track,
        tier,
        starts_at: startsAt,
        ends_at: endsAt,
        mentor_id: mentorId || null,
        college: college.trim() || null,
      },
    });

    setBusy(false);
    if (failure) {
      setError(failure.message);
      return;
    }
    setLink(window.location.origin.replace("admin.", "intern.") + "/accept-invite?token=" + data);
    router.refresh();
  }

  if (link) {
    return (
      <div className="stack">
        <div className="callout ok">
          <Icon name="checkCircle" size={18} />
          <div>
            <b>Invitation created for {email}.</b>
            <p>
              It opens the intern workspace, works once, expires in seven days, and only for that
              address. Send it to them yourself — the studio does not email invitations.
            </p>
          </div>
        </div>
        <div className="field">
          <label htmlFor="intern-link">Link</label>
          <input id="intern-link" readOnly value={link} onFocus={event => event.target.select()} />
        </div>
        <div className="cluster">
          <button className="btn primary" type="button" onClick={() => navigator.clipboard.writeText(link)}>
            <Icon name="link" size={15} /><span>Copy link</span>
          </button>
          <button className="btn quiet" type="button" onClick={() => { setLink(null); setEmail(""); }}>
            Invite another intern
          </button>
        </div>
      </div>
    );
  }

  return (
    <form className="stack" onSubmit={submit}>
      <div className="field">
        <label htmlFor="intern-email">Email address</label>
        <input id="intern-email" type="email" value={email}
          onChange={event => setEmail(event.target.value)} required />
      </div>

      <div className="grid-2">
        <div className="field">
          <label htmlFor="intern-track">Track</label>
          <select id="intern-track" value={track} onChange={event => setTrack(event.target.value)}>
            {TRACKS.map(([value, label]) => <option key={value} value={value}>{label}</option>)}
          </select>
        </div>
        <div className="field">
          <label htmlFor="intern-tier">Duration</label>
          <select id="intern-tier" value={tier} onChange={event => pickTier(event.target.value)}>
            {TIERS.map(([value, label]) => <option key={value} value={value}>{label}</option>)}
          </select>
        </div>
      </div>

      <div className="grid-2">
        <div className="field">
          <label htmlFor="intern-start">Starts</label>
          <input id="intern-start" type="date" value={startsAt}
            onChange={event => setStartsAt(event.target.value)} required />
        </div>
        <div className="field">
          <label htmlFor="intern-end">Ends</label>
          <input id="intern-end" type="date" value={endsAt} min={startsAt}
            onChange={event => setEndsAt(event.target.value)} required />
          <span className="hint">Access becomes read-only after this date, plus the grace period.</span>
        </div>
      </div>

      <div className="grid-2">
        <div className="field">
          <label htmlFor="intern-mentor">Mentor</label>
          <select id="intern-mentor" value={mentorId} onChange={event => setMentorId(event.target.value)}>
            <option value="">Assign later</option>
            {mentors.map(mentor => <option key={mentor.id} value={mentor.id}>{mentor.name}</option>)}
          </select>
          <span className="hint">Only a mentor can recommend their completion.</span>
        </div>
        <div className="field">
          <label htmlFor="intern-college">College (optional)</label>
          <input id="intern-college" type="text" value={college}
            onChange={event => setCollege(event.target.value)} />
        </div>
      </div>

      {error ? <p className="errortext" role="alert">{error}</p> : null}

      <div>
        <button className="btn primary" type="submit" disabled={busy || !email.trim() || !endsAt}>
          <Icon name="userPlus" size={15} />
          <span>{busy ? "Creating" : "Create invitation"}</span>
        </button>
      </div>
    </form>
  );
}
