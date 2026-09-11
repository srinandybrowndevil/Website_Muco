"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { createClient } from "@muco/core/browser";
import { today } from "@muco/core";
import { Icon } from "@muco/ui";

const KINDS: [string, string][] = [
  ["client", "Client project — somebody is paying for this"],
  ["internal", "Internal build — one of the studio's own products"],
  ["sandbox", "Sandbox — a sliced or fake copy, safe for an intern"],
];

/**
 * Creating a project.
 *
 * Until this existed a project could only arrive by converting a customer
 * request, which meant an internal build or a sandbox had to be written as an
 * INSERT by hand. That is the failure the specification warns about — a rule
 * with no screen — and it is worse here than most, because the kind of a
 * project is what decides whether an intern may be put on it.
 *
 * The kind is asked for first and explained in words rather than labelled with
 * a term. "internal" and "sandbox" mean nothing to somebody choosing quickly;
 * "safe for an intern" means exactly the thing the choice decides.
 */
export function CreateProject({
  organizationId,
  customers,
}: {
  organizationId: string;
  customers: { id: string; label: string }[];
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [kind, setKind] = useState("client");
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [customerId, setCustomerId] = useState(customers[0]?.id ?? "");
  const [startsOn, setStartsOn] = useState(() => today());
  const [dueOn, setDueOn] = useState("");
  const [budget, setBudget] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const needsCustomer = kind === "client";

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

    const { data, error: failure } = await supabase
      .from("projects")
      .insert({
        organization_id: organizationId,
        name: name.trim(),
        description: description.trim() || null,
        kind,
        // A client project without a customer would be invisible to the person
        // paying for it, so the customer is required for that kind and refused
        // for the others.
        customer_id: needsCustomer ? customerId : null,
        status: "planning",
        starts_on: startsOn || null,
        due_on: dueOn || null,
        budget: budget === "" ? null : Number(budget),
      })
      .select("id")
      .single();

    setBusy(false);
    if (failure || !data) {
      setError(failure?.message ?? "The project could not be created.");
      return;
    }
    router.push("/projects/" + data.id);
  }

  if (!open) {
    return (
      <button className="btn primary" type="button" onClick={() => setOpen(true)}>
        <Icon name="plus" size={15} />
        <span>New project</span>
      </button>
    );
  }

  return (
    <form className="stack" onSubmit={submit}>
      <div className="field">
        <label htmlFor="p-kind">What kind of project</label>
        <select id="p-kind" value={kind} onChange={event => setKind(event.target.value)}>
          {KINDS.map(([value, label]) => <option key={value} value={value}>{label}</option>)}
        </select>
      </div>

      {needsCustomer ? (
        <div className="field">
          <label htmlFor="p-customer">For which customer</label>
          <select id="p-customer" value={customerId} onChange={event => setCustomerId(event.target.value)} required>
            {customers.length === 0 ? <option value="">No customers yet</option> : null}
            {customers.map(row => <option key={row.id} value={row.id}>{row.label}</option>)}
          </select>
          <span className="hint">They see this project the moment it exists, so name it the way they would.</span>
        </div>
      ) : null}

      <div className="field">
        <label htmlFor="p-name">Name</label>
        <input id="p-name" type="text" value={name}
          onChange={event => setName(event.target.value)} required />
      </div>

      <div className="field">
        <label htmlFor="p-description">What it is</label>
        <textarea id="p-description" value={description}
          onChange={event => setDescription(event.target.value)}
          placeholder="The scope, in the words you would use with the customer. This is what they read on their Scope page." />
      </div>

      <div className="grid-2">
        <div className="field">
          <label htmlFor="p-start">Starts</label>
          <input id="p-start" type="date" value={startsOn}
            onChange={event => setStartsOn(event.target.value)} />
        </div>
        <div className="field">
          <label htmlFor="p-due">Expected completion</label>
          <input id="p-due" type="date" value={dueOn} min={startsOn}
            onChange={event => setDueOn(event.target.value)} />
        </div>
      </div>

      <div className="field">
        <label htmlFor="p-budget">Budget (INR, optional)</label>
        <input id="p-budget" type="number" min="0" step="1000" value={budget}
          onChange={event => setBudget(event.target.value)} />
        <span className="hint">Never shown to the customer. Their invoices are, and those are separate.</span>
      </div>

      {error ? <p className="errortext" role="alert">{error}</p> : null}

      <div className="cluster">
        <button className="btn primary" type="submit"
          disabled={busy || !name.trim() || (needsCustomer && !customerId)}>
          {busy ? "Creating" : "Create project"}
        </button>
        <button className="btn quiet" type="button" onClick={() => setOpen(false)}>Cancel</button>
      </div>
    </form>
  );
}
