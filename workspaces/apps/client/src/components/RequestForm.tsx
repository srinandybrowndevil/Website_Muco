"use client";

import { useRouter } from "next/navigation";
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
}: {
  organizationId: string;
  customerId: string;
}) {
  const router = useRouter();
  const [service, setService] = useState(SERVICES[SERVICES.length - 1]);
  const [title, setTitle] = useState("");
  const [problem, setProblem] = useState("");
  const [timeline, setTimeline] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sent, setSent] = useState(false);

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

    const { error: failure } = await supabase.from("project_requests").insert({
      organization_id: organizationId,
      customer_id: customerId,
      status: "new",
      service,
      title: title.trim(),
      problem: problem.trim(),
      timeline: timeline.trim() || null,
    });

    setBusy(false);
    if (failure) {
      setError("That could not be sent: " + failure.message);
      return;
    }
    setTitle("");
    setProblem("");
    setTimeline("");
    setSent(true);
    router.refresh();
  }

  if (sent) {
    return (
      <div className="callout ok" role="status">
        <Icon name="checkCircle" size={18} />
        <div>
          <b>Sent to the studio.</b>
          <p>
            It appears in the list below straight away and someone reads it within working hours —
            Monday to Saturday, 9am to 7pm.{" "}
            <button className="btn sm quiet" type="button" onClick={() => setSent(false)}>
              Write another
            </button>
          </p>
        </div>
      </div>
    );
  }

  return (
    <form className="stack" onSubmit={submit}>
      <div className="field">
        <label htmlFor="req-service">What is this about</label>
        <select id="req-service" value={service} onChange={event => setService(event.target.value)}>
          {SERVICES.map(option => <option key={option} value={option}>{option}</option>)}
        </select>
      </div>

      <div className="field">
        <label htmlFor="req-title">In one line</label>
        <input
          id="req-title"
          type="text"
          value={title}
          onChange={event => setTitle(event.target.value)}
          placeholder="The contact form is sending twice"
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
          placeholder="What you expected, what happened instead, and when you first noticed. Detail here saves a round of questions."
          required
        />
      </div>

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
          {busy ? "Sending" : "Send to the studio"}
        </button>
      </div>

      <p className="hint">
        Sending this is not an order and not an acceptance of a quote. If it turns into work, you
        get a written scope and a price first.
      </p>
    </form>
  );
}
