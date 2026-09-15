"use client";

import { useState } from "react";
import { createClient } from "@muco/core/browser";
import { Icon } from "@muco/ui";

const SERVICES = [
  "Website design and development",
  "Mobile app",
  "UI/UX and product design",
  "Custom software or SaaS",
  "CRM, ERP, HRMS, LMS or billing",
  "Digital marketing and SEO",
  "AI and business automation",
  "Branding, IT and cloud support",
];

export function PublicProjectRequestForm() {
  const [service, setService] = useState(SERVICES[0]);
  const [email, setEmail] = useState("");
  const [title, setTitle] = useState("");
  const [problem, setProblem] = useState("");
  const [timeline, setTimeline] = useState("");
  const [requirements, setRequirements] = useState("");
  const [budget, setBudget] = useState("");
  const [website, setWebsite] = useState("");
  const [reference, setReference] = useState("");
  const [contact, setContact] = useState("email");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sent, setSent] = useState(false);
  const [requestId, setRequestId] = useState<string | null>(null);

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    if (busy || !email.trim() || !title.trim() || !problem.trim()) return;
    setBusy(true);
    setError(null);

    const supabase = createClient();
    if (!supabase) {
      setBusy(false);
      setError("This workspace is not connected to its database.");
      return;
    }

    try {
      const { data, error: rpcError } = await supabase.rpc("create_public_project_request", {
        p_email: email.trim(),
        p_service: service,
        p_title: title.trim(),
        p_problem: problem.trim(),
        p_requirements: requirements.trim() || null,
        p_budget_range: budget || null,
        p_timeline: timeline.trim() || null,
        p_website: website.trim() || null,
        p_reference: reference.trim() || null,
        p_contact_preference: contact,
      });

      if (rpcError || !data) throw rpcError ?? new Error("The request was not confirmed as saved.");

      setRequestId(data as string);
      setEmail("");
      setTitle("");
      setProblem("");
      setTimeline("");
      setRequirements("");
      setBudget("");
      setWebsite("");
      setReference("");
      setSent(true);
    } catch {
      setError("We could not confirm that your request was saved. Your details are still here. Check your connection and try again.");
    } finally {
      setBusy(false);
    }
  }

  if (sent) {
    return (
      <div className="callout ok" role="status">
        <Icon name="checkCircle" size={18} />
        <div>
          <b>Sent to the studio.</b>
          <p>
            Someone reads it within working hours — Monday to Saturday, 9am to 7pm.
            {requestId ? <><br /><small>Request reference: {requestId}</small></> : null}
          </p>
          <button className="btn sm quiet" type="button" onClick={() => { setRequestId(null); setSent(false); }}>
            Write another
          </button>
        </div>
      </div>
    );
  }

  return (
    <form className="stack" onSubmit={submit}>
      <fieldset className="stack" disabled={busy} style={{ border: 0, padding: 0, margin: 0, minWidth: 0 }}>
        <div className="field">
          <label htmlFor="pub-email">Your email</label>
          <input
            id="pub-email"
            type="email"
            value={email}
            onChange={event => setEmail(event.target.value)}
            placeholder="you@yourbusiness.com"
            required
          />
        </div>

        <div className="field">
          <label htmlFor="pub-service">What is this about</label>
          <select id="pub-service" value={service} onChange={event => setService(event.target.value)}>
            {SERVICES.map(option => <option key={option} value={option}>{option}</option>)}
          </select>
        </div>

        <div className="field">
          <label htmlFor="pub-title">In one line</label>
          <input
            id="pub-title"
            type="text"
            value={title}
            onChange={event => setTitle(event.target.value)}
            placeholder="An online store for my clothing business"
            maxLength={140}
            required
          />
        </div>

        <div className="field">
          <label htmlFor="pub-problem">What is happening, or what you need</label>
          <textarea
            id="pub-problem"
            value={problem}
            onChange={event => setProblem(event.target.value)}
            placeholder="Who will use it? What should they be able to do? What problem will it solve for your business?"
            maxLength={4000}
            required
          />
        </div>

        <div className="field"><label htmlFor="pub-requirements">Features and requirements (optional)</label>
          <textarea id="pub-requirements" value={requirements} maxLength={6000} onChange={event => setRequirements(event.target.value)} placeholder="For example: product catalogue, online payments, order tracking and an admin dashboard." /></div>

        <div className="field"><label htmlFor="pub-budget">Budget preference (optional)</label>
          <select id="pub-budget" value={budget} onChange={event => setBudget(event.target.value)}>
            <option value="">I would like a quote</option>{["Under ₹25,000", "₹25,000–₹50,000", "₹50,000–₹1,00,000", "₹1,00,000–₹3,00,000", "Above ₹3,00,000"].map(value => <option key={value}>{value}</option>)}
          </select><p className="hint">An indication of your budget, not a service price.</p></div>

        <div className="field"><label htmlFor="pub-website">Your current website (optional)</label>
          <input id="pub-website" type="url" value={website} maxLength={500} onChange={event => setWebsite(event.target.value)} placeholder="https://yourbusiness.com" /></div>

        <div className="field"><label htmlFor="pub-reference">Reference links or notes (optional)</label>
          <textarea id="pub-reference" value={reference} maxLength={2000} onChange={event => setReference(event.target.value)} placeholder="Examples you like and what you would change." /></div>

        <div className="field">
          <label htmlFor="pub-timeline">When you need it (optional)</label>
          <input
            id="pub-timeline"
            type="text"
            value={timeline}
            onChange={event => setTimeline(event.target.value)}
            placeholder="Before the launch on the 20th"
            maxLength={120}
          />
        </div>

        <div className="field"><label htmlFor="pub-contact">How should we follow up?</label>
          <select id="pub-contact" value={contact} onChange={event => setContact(event.target.value)}><option value="email">Email</option><option value="phone">Phone</option><option value="video">Discuss a video call</option><option value="chat">Chat</option></select></div>

        {error ? <p className="errortext" role="alert">{error}</p> : null}

        <div>
          <button className="btn primary" type="submit" disabled={busy || !email.trim() || !title.trim() || !problem.trim()}>
            {busy ? "Sending" : "Send project brief"}
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
