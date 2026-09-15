"use client";

import { useRouter } from "next/navigation";
import { useRef, useState } from "react";
import { createClient } from "@muco/core/browser";
import { Icon } from "@muco/ui";
import { isLocalPreview } from "@muco/core";

const SERVICES = [
  "Website design and development",
  "Mobile app",
  "UI/UX and product design",
  "Custom software or SaaS",
  "CRM, ERP, HRMS, LMS or billing",
  "Digital marketing and SEO",
  "AI and business automation",
  "Branding, IT and cloud support",
  "Something about the project we are already doing",
];

/**
 * Asking the studio for something.
 *
 * One form for two different asks — a question about the current project, and
 * a new piece of work — because from the customer's side they are the same
 * action: tell the studio something and expect an answer. The studio sorts
 * them out at its end, which is where the sorting belongs.
 *
 * Nothing here is a quote and nothing here is a commitment. The copy says so,
 * because a form that looks like an order form makes people hesitate to use it.
 */
export function RequestForm({
  organizationId,
  customerId,
  intent = "support",
}: {
  organizationId: string;
  customerId: string;
  intent?: "support" | "project";
}) {
  const router = useRouter();
  const project = intent === "project";
  const [service, setService] = useState(project ? SERVICES[0] : SERVICES[SERVICES.length - 1]);
  const [title, setTitle] = useState("");
  const [problem, setProblem] = useState("");
  const [timeline, setTimeline] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sent, setSent] = useState(false);
  // The reference is copied into state on success rather than read from the
  // ref during render. requestId stays a ref because it must survive a retry
  // without re-rendering -- that is what stops a lost response creating a
  // second brief -- but reading a ref while rendering is not guaranteed to be
  // stable under concurrent rendering, and react-hooks/refs rejects it.
  const [sentReference, setSentReference] = useState<string | null>(null);
  const [requirements, setRequirements] = useState("");
  const [budget, setBudget] = useState("");
  const [website, setWebsite] = useState("");
  const [reference, setReference] = useState("");
  const [contact, setContact] = useState("email");
  const requestId = useRef<string | null>(null);

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    if (busy || !title.trim() || !problem.trim()) return;
    setBusy(true);
    setError(null);

    const supabase = createClient();
    if (!supabase) {
      setBusy(false);
      setError("This workspace is not connected to its database.");
      return;
    }

    try {
    requestId.current ??= crypto.randomUUID();
    // Reuse the identifier after a lost response: never create a second brief.
    const { data: existing, error: lookupError } = await supabase.from("project_requests")
      .select("id").eq("id", requestId.current).eq("customer_id", customerId).maybeSingle();
    if (lookupError) throw lookupError;
    if (!existing) {
    const { data: saved, error: failure } = await supabase.from("project_requests").insert({
      id: requestId.current,
      organization_id: organizationId,
      customer_id: customerId,
      status: "new",
      service,
      title: title.trim(),
      problem: problem.trim(),
      timeline: timeline.trim() || null,
      ...(project ? { requirements: requirements.trim() || null, budget_range: budget || null,
        website: website.trim() || null, reference: reference.trim() || null, contact_preference: contact } : {}),
    }).select("id").single();
    if (failure || !saved) throw failure ?? new Error("The request was not confirmed as saved.");
    }
    setTitle("");
    setProblem("");
    setTimeline("");
    setRequirements(""); setBudget(""); setWebsite(""); setReference("");
    setSentReference(requestId.current);
    setSent(true);
    router.refresh();
    } catch {
      setError("We could not confirm that your request was saved. Your details are still here. Check your connection and try again; retrying will not create another request.");
    } finally { setBusy(false); }
  }

  if (sent) {
    return (
      <div className="callout ok" role="status">
        <Icon name="checkCircle" size={18} />
        <div>
          <b>{isLocalPreview ? "Saved to the local admin workspace." : "Sent to the studio."}</b>
          <p>
            {isLocalPreview
              ? "Open Admin → Requests to review it. This sample request has not been sent to anyone. "
              : "It appears in the list below straight away and someone reads it within working hours — Monday to Saturday, 9am to 7pm. "}
            <small>Request reference: {sentReference}</small>
            <button className="btn sm quiet" type="button" onClick={() => { requestId.current = null; setSentReference(null); setSent(false); }}>
              Write another
            </button>
          </p>
        </div>
      </div>
    );
  }

  return (
    <form className="stack" onSubmit={submit}>
      <fieldset className="stack" disabled={busy} style={{ border: 0, padding: 0, margin: 0, minWidth: 0 }}>
      <div className="field">
        <label htmlFor="req-service">What is this about</label>
        <select id="req-service" value={service} onChange={event => setService(event.target.value)}>
          {(project ? SERVICES.slice(0, -1) : SERVICES).map(option => <option key={option} value={option}>{option}</option>)}
        </select>
      </div>

      <div className="field">
        <label htmlFor="req-title">In one line</label>
        <input
          id="req-title"
          type="text"
          value={title}
          onChange={event => setTitle(event.target.value)}
          placeholder={project ? "An online store for my clothing business" : "The contact form is sending twice"}
          maxLength={140}
          required
        />
      </div>

      <div className="field">
        <label htmlFor="req-problem">What is happening, or what you need</label>
        <textarea
          id="req-problem"
          value={problem}
          onChange={event => setProblem(event.target.value)}
          placeholder={project ? "Who will use it? What should they be able to do? What problem will it solve for your business?" : "What you expected, what happened instead, and when you first noticed."}
          maxLength={4000}
          required
        />
      </div>

      {project ? <>
        <div className="field"><label htmlFor="req-requirements">Features and requirements (optional)</label>
          <textarea id="req-requirements" value={requirements} maxLength={6000} onChange={event => setRequirements(event.target.value)} placeholder="For example: product catalogue, online payments, order tracking and an admin dashboard." /></div>
        <div className="field"><label htmlFor="req-budget">Budget preference (optional)</label>
          <select id="req-budget" value={budget} onChange={event => setBudget(event.target.value)}>
            <option value="">I would like a quote</option>{["Under ₹25,000", "₹25,000–₹50,000", "₹50,000–₹1,00,000", "₹1,00,000–₹3,00,000", "Above ₹3,00,000"].map(value => <option key={value}>{value}</option>)}
          </select><p className="hint">An indication of your budget, not a service price.</p></div>
        <div className="field"><label htmlFor="req-website">Your current website (optional)</label>
          <input id="req-website" type="url" value={website} maxLength={500} onChange={event => setWebsite(event.target.value)} placeholder="https://yourbusiness.com" /></div>
        <div className="field"><label htmlFor="req-reference">Reference links or notes (optional)</label>
          <textarea id="req-reference" value={reference} maxLength={2000} onChange={event => setReference(event.target.value)} placeholder="Examples you like and what you would change." /></div>
        <div className="field"><label htmlFor="req-contact">How should we follow up?</label>
          <select id="req-contact" value={contact} onChange={event => setContact(event.target.value)}><option value="email">Email</option><option value="phone">Phone</option><option value="video">Discuss a video call</option><option value="chat">Chat</option></select></div>
      </> : null}

      <div className="field">
        <label htmlFor="req-timeline">When you need it (optional)</label>
        <input
          id="req-timeline"
          type="text"
          value={timeline}
          onChange={event => setTimeline(event.target.value)}
          placeholder="Before the launch on the 20th"
          maxLength={120}
        />
      </div>

      {error ? <p className="errortext" role="alert">{error}</p> : null}

      <div>
        <button className="btn primary" type="submit" disabled={busy || !title.trim() || !problem.trim()}>
          {busy ? "Sending" : project ? "Send project brief" : "Send to the studio"}
        </button>
      </div>
      </fieldset>

      <p className="hint">
        Sending this is not an order and not an acceptance of a quote. If it turns into work, you
        get a written scope and a price first.
      </p>
    </form>
  );
}
