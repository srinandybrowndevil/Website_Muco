"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { createClient } from "@muco/core/browser";
import { Icon } from "@muco/ui";

/**
 * Inviting a customer, which needs a customer to invite them to.
 *
 * create_invitation refuses a client invitation carrying no customer, and
 * refuses a customer that belongs to another organisation. That is the right
 * shape — a client account with no company behind it has nothing to show — but
 * it means this form has to be able to create the company as well as the
 * invitation, or the founder ends up writing an INSERT before every customer.
 */
export function InviteClient({
  organizationId,
  customers,
}: {
  organizationId: string;
  customers: { id: string; label: string; hasOwner: boolean }[];
}) {
  const router = useRouter();
  const [customerId, setCustomerId] = useState(customers[0]?.id ?? "new");
  const [company, setCompany] = useState("");
  const [contact, setContact] = useState("");
  const [email, setEmail] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [link, setLink] = useState<string | null>(null);

  const creating = customerId === "new";
  const chosen = customers.find(row => row.id === customerId);

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

    let target = customerId;

    if (creating) {
      const { data: created, error: failed } = await supabase
        .from("customers")
        .insert({
          organization_id: organizationId,
          name: contact.trim() || company.trim(),
          company: company.trim(),
          email: email.trim(),
          status: "active",
        })
        .select("id")
        .single();
      if (failed || !created) {
        setBusy(false);
        setError("The customer record could not be created: " + (failed?.message ?? "unknown"));
        return;
      }
      target = created.id;
    }

    const { data, error: failure } = await supabase.rpc("create_invitation", {
      invite_organization_id: organizationId,
      invite_email: email.trim(),
      invite_role: "client",
      invite_customer_id: target,
      valid_for: "7 days",
      invite_details: {},
    });

    setBusy(false);
    if (failure) {
      setError(failure.message);
      return;
    }
    setLink(window.location.origin.replace("admin.", "client.") + "/accept-invite?token=" + data);
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
              It opens the client workspace. The first person to accept for a company becomes its
              owner and can then add their own colleagues without coming back to you.
            </p>
          </div>
        </div>
        <div className="field">
          <label htmlFor="client-link">Link</label>
          <input id="client-link" readOnly value={link} onFocus={event => event.target.select()} />
        </div>
        <div className="cluster">
          <button className="btn primary" type="button" onClick={() => navigator.clipboard.writeText(link)}>
            <Icon name="link" size={15} /><span>Copy link</span>
          </button>
          <button className="btn quiet" type="button" onClick={() => { setLink(null); setEmail(""); }}>
            Invite another client
          </button>
        </div>
      </div>
    );
  }

  return (
    <form className="stack" onSubmit={submit}>
      <div className="field">
        <label htmlFor="client-customer">Company</label>
        <select id="client-customer" value={customerId} onChange={event => setCustomerId(event.target.value)}>
          {customers.map(row => (
            <option key={row.id} value={row.id}>
              {row.label}{row.hasOwner ? " — already has an owner" : ""}
            </option>
          ))}
          <option value="new">A new company</option>
        </select>
        {chosen?.hasOwner ? (
          <span className="hint">
            This company already has an owner. Anybody you invite now joins as a viewer, and the
            owner can change that from their own People page.
          </span>
        ) : null}
      </div>

      {creating ? (
        <div className="grid-2">
          <div className="field">
            <label htmlFor="client-company">Company name</label>
            <input id="client-company" type="text" value={company}
              onChange={event => setCompany(event.target.value)} required />
          </div>
          <div className="field">
            <label htmlFor="client-contact">Contact name</label>
            <input id="client-contact" type="text" value={contact}
              onChange={event => setContact(event.target.value)} />
          </div>
        </div>
      ) : null}

      <div className="field">
        <label htmlFor="client-email">Their email address</label>
        <input id="client-email" type="email" value={email}
          onChange={event => setEmail(event.target.value)} required />
        <span className="hint">The invitation works only for this address.</span>
      </div>

      {error ? <p className="errortext" role="alert">{error}</p> : null}

      <div>
        <button className="btn primary" type="submit"
          disabled={busy || !email.trim() || (creating && !company.trim())}>
          <Icon name="userPlus" size={15} />
          <span>{busy ? "Creating" : "Create invitation"}</span>
        </button>
      </div>
    </form>
  );
}
