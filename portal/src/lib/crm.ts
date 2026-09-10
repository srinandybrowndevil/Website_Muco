export type CrmRow = { id: string; organization_id?: string; [key: string]: unknown };
export type Field = { key: string; label: string; type?: string; required?: boolean; options?: string[]; min?: number; max?: number ; pattern?: RegExp; patternMessage?: string };
// icon and emptyBody drive this section's empty state. Written per section
// on purpose: "No leads yet" earns its place only if the next line says
// what a lead is for here and what happens once one exists.
export type Section = { title: string; singular: string; primary: string; fields: Field[]; icon: string; emptyBody: string;
  // Documents that carry a human-facing serial. The prefix is fixed by the
  // studio; the running number is generated so two people creating an invoice
  // at once cannot pick the same one by eye.
  numberField?: string; numberPrefix?: string; numberPad?: number };
const name: Field = { key: "name", label: "Name", required: true };
const customer: Field = { key: "customer_id", label: "Customer", type: "customer" };
const status = (options: string[]): Field => ({ key: "status", label: "Status", options, required: true });
const amount: Field = { key: "amount", label: "Amount (INR)", type: "number", min: 0, required: true };
export const crmSections: Record<string, Section> = {
  leads: { title: "Leads pipeline", singular: "lead", primary: "name", fields: [name, { key: "company", label: "Company" }, { key: "email", label: "Email", type: "email" }, { key: "source", label: "Source" }, { key: "stage", label: "Stage", options: ["new", "qualified", "proposal", "negotiation", "won", "lost"], required: true }, { key: "estimated_value", label: "Estimated value (INR)", type: "number", min: 0, required: true }], icon: "target", emptyBody: "A lead is someone worth following up. Save one and it moves through the pipeline stages, feeding the pipeline value on your overview." },
  customers: { title: "Customers", singular: "customer", primary: "name", fields: [name, { key: "company", label: "Company" }, { key: "email", label: "Email", type: "email" }, { key: "phone", label: "Phone", type: "tel" }, status(["active", "onboarding", "at_risk", "inactive"])], icon: "users", emptyBody: "Customers are who projects, proposals and invoices attach to. Add one here, or let a person create their own account from the website and appear automatically." },
  tasks: { title: "Follow-ups", singular: "follow-up", primary: "title", fields: [{ key: "title", label: "Title", required: true }, { key: "description", label: "Details", type: "textarea" }, customer, status(["open", "completed", "cancelled"]), { key: "priority", label: "Priority (1 high, 3 low)", type: "number", min: 1, max: 3, required: true }, { key: "due_at", label: "Due", type: "datetime-local" }], icon: "check", emptyBody: "Follow-ups are the promises you made and do not want to lose. Give one a due date and a priority and it shows in the open count on your overview." },
  projects: { title: "Projects", singular: "project", primary: "name", fields: [name, { key: "kind", label: "Kind", options: ["internal", "client", "sandbox"], required: true }, customer, { key: "description", label: "Scope", type: "textarea" }, status(["planning", "active", "on_hold", "completed"]), { key: "budget", label: "Budget (INR)", type: "number", min: 0 }, { key: "progress", label: "Progress (%)", type: "number", min: 0, max: 100, required: true }, { key: "due_on", label: "Due date", type: "date" }, { key: "repo_url", label: "GitHub repository", type: "url", pattern: /^https:\/\/(www\.)?github\.com\/[A-Za-z0-9._-]+\/[A-Za-z0-9._-]+\/?$/, patternMessage: "Enter a GitHub repository link, for example https://github.com/mucolabs/project." }, { key: "preview_url", label: "Preview link", type: "url", pattern: /^https:\/\/\S+$/, patternMessage: "A preview link must start with https://." }, { key: "staging_url", label: "Staging link", type: "url", pattern: /^https:\/\/\S+$/, patternMessage: "A staging link must start with https://." }], icon: "briefcase", emptyBody: "A project is accepted work in progress. Its progress percentage is what the customer sees on their own portal page, so keep it honest. Kind decides who may be put near it: a sandbox is where an intern belongs and a client project is not." },
  proposals: { title: "Proposals", singular: "proposal", primary: "title", fields: [{ key: "number", label: "Proposal number", required: true }, { key: "title", label: "Title", required: true }, customer, amount, status(["draft", "sent", "viewed", "accepted", "void"]), { key: "valid_until", label: "Valid until", type: "date" }], icon: "file", emptyBody: "A proposal records what you quoted and what happened to it. Saving one here does not email the customer -- send it your usual way and track the status.", numberField: "number", numberPrefix: "ML-PID-", numberPad: 2 },
  invoices: { title: "Invoices", singular: "invoice", primary: "number", fields: [{ key: "number", label: "Invoice number", required: true }, { ...customer, required: true }, amount, status(["draft", "sent", "paid", "overdue", "void"]), { key: "issued_on", label: "Issued date", type: "date" }, { key: "due_on", label: "Due date", type: "date" }], icon: "receipt", emptyBody: "Invoices track what is owed and what has been paid. Sent, viewed and overdue records count towards the outstanding total on your overview.", numberField: "number", numberPrefix: "ML-INV-", numberPad: 2 },
};
export const label = (value: unknown) => String(value ?? "—").replaceAll("_", " ");
export const currency = (value: unknown) => new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 }).format(Number(value) || 0);

export function recordPayload(section: string, values: Record<string, string>) {
  const config = crmSections[section];
  if (!config) throw new Error("Unknown record type");
  const payload: Record<string, unknown> = {};
  for (const field of config.fields) {
    const raw = (values[field.key] ?? "").trim();
    if (!raw) {
      if (field.required) throw new Error(`${field.label} is required`);
      payload[field.key] = null;
      continue;
    }
    if (field.options && !field.options.includes(raw)) throw new Error(`Choose a valid ${field.label.toLowerCase()}`);
    // Checked here as well as by the database constraint, so a mistyped link
    // comes back as a sentence rather than a raw Postgres constraint error.
    if (field.pattern && !field.pattern.test(raw)) throw new Error(field.patternMessage ?? `Check ${field.label.toLowerCase()}`);
    if (field.type === "number") {
      const number = Number(raw);
      if (!Number.isFinite(number) || (field.min != null && number < field.min) || (field.max != null && number > field.max)) throw new Error(`Check ${field.label.toLowerCase()}`);
      payload[field.key] = number;
    } else if (field.type === "datetime-local") {
      const date = new Date(raw);
      if (Number.isNaN(date.getTime())) throw new Error("Check the due date");
      payload[field.key] = date.toISOString();
    } else payload[field.key] = raw;
  }
  if (section === "tasks") payload.completed_at = values.status === "completed" ? new Date().toISOString() : null;
  if (section === "invoices") payload.paid_at = values.status === "paid" ? new Date().toISOString() : null;
  return payload;
}


/** Highest serial already used for this section, plus one, e.g. ML-INV-07. */
export function nextDocumentNumber(section: Section, existing: (string | null | undefined)[]) {
  const prefix = section.numberPrefix ?? "";
  const pad = section.numberPad ?? 2;
  let highest = 0;
  for (const value of existing) {
    if (!value || !value.startsWith(prefix)) continue;
    const digits = value.slice(prefix.length).match(/^\d+/);
    if (digits) highest = Math.max(highest, parseInt(digits[0], 10));
  }
  return `${prefix}${String(highest + 1).padStart(pad, "0")}`;
}

/** Today, and the studio's default payment window, as date-input values. */
export function issueDates(dueInDays = 5) {
  const today = new Date();
  const due = new Date(today);
  due.setDate(due.getDate() + dueInDays);
  const iso = (d: Date) => new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().slice(0, 10);
  return { issued: iso(today), due: iso(due) };
}
