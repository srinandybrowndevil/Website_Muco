"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { createClient } from "@muco/core/browser";
import { Icon } from "@muco/ui";

/**
 * An owner adding somebody to their own organisation.
 *
 * The studio does not send this email. That is a deliberate limitation stated
 * rather than hidden: there is no transactional mail set up for client
 * invitations, and a form that claims to have sent something it did not is
 * worse than one that hands you the link and says so.
 *
 * The link is shown once. It is the invitation — anybody holding it can accept
 * for the address it names, so it is not stored in the page after the dialog
 * closes and is not written anywhere this component can be asked for again.
 */
export function InviteColleague() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [level, setLevel] = useState("viewer");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [link, setLink] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    setBusy(true);
    setError(null);

    const supabase = createClient();
    if (!supabase) {
      setBusy(false);
      setError("This workspace is not connected to its database.");
      return;
    }

    const { data, error: failure } = await supabase.rpc("invite_client_colleague", {
      p_email: email.trim(),
      p_level: level,
    });

    setBusy(false);
    if (failure) {
      setError(failure.message);
      return;
    }
    setLink(window.location.origin + "/accept-invite?token=" + data);
    setEmail("");
    router.refresh();
  }

  if (link) {
    return (
      <div className="stack">
        <div className="callout ok">
          <Icon name="checkCircle" size={18} />
          <div>
            <b>Invitation created. Send this link to them yourself.</b>
            <p>
              It works once, expires in seven days, and only for the address you entered. The studio
              does not email it — pass it on however you normally reach them.
            </p>
          </div>
        </div>
        <div className="field">
          <label htmlFor="invite-link">Invitation link</label>
          <input id="invite-link" type="text" readOnly value={link} onFocus={event => event.target.select()} />
        </div>
        <div className="cluster">
          <button
            className="btn primary"
            type="button"
            onClick={async () => {
              await navigator.clipboard.writeText(link);
              setCopied(true);
            }}
          >
            <Icon name={copied ? "checkCircle" : "link"} size={15} />
            <span>{copied ? "Copied" : "Copy link"}</span>
          </button>
          <button className="btn quiet" type="button" onClick={() => { setLink(null); setCopied(false); }}>
            Invite somebody else
          </button>
        </div>
      </div>
    );
  }

  return (
    <form className="stack" onSubmit={submit}>
      <div className="grid-2">
        <div className="field">
          <label htmlFor="invite-email">Their email address</label>
          <input
            id="invite-email"
            type="email"
            value={email}
            onChange={event => setEmail(event.target.value)}
            autoComplete="off"
            required
          />
          <span className="hint">The invitation works only for this address.</span>
        </div>
        <div className="field">
          <label htmlFor="invite-level">What they can do</label>
          <select id="invite-level" value={level} onChange={event => setLevel(event.target.value)}>
            <option value="viewer">Viewer — can see the project</option>
            <option value="manager">Manager — can see it and raise support requests</option>
          </select>
          <span className="hint">Neither can invite anybody else. Only you can.</span>
        </div>
      </div>

      {error ? <p className="errortext" role="alert">{error}</p> : null}

      <div>
        <button className="btn primary" type="submit" disabled={busy || !email.trim()}>
          <Icon name="userPlus" size={15} />
          <span>{busy ? "Creating" : "Create invitation"}</span>
        </button>
      </div>
    </form>
  );
}
