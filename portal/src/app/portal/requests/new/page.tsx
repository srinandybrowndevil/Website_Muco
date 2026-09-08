"use client";

import Link from "next/link";
import { FormEvent, useEffect, useState } from "react";
import { CustomerShell } from "@/components/portal/CustomerShell";
import { createClient } from "@/lib/supabase/client";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import {
  budgetRangeOptions,
  contactPreferenceLabel,
  formatFileSize,
  serviceOptions,
  timelineOptions,
  type RequestAttachment,
} from "@/lib/requests";

export default function NewRequestPage() {
  return (
    <CustomerShell>
      <NewRequestForm />
    </CustomerShell>
  );
}

type CustomerRef = { id: string; organization_id: string };

function NewRequestForm() {
  const [service, setService] = useState("");
  const [title, setTitle] = useState("");
  const [problem, setProblem] = useState("");
  const [requirements, setRequirements] = useState("");
  const [budgetRange, setBudgetRange] = useState("");
  const [timeline, setTimeline] = useState("");
  const [website, setWebsite] = useState("");
  const [reference, setReference] = useState("");
  const [contactPreference, setContactPreference] = useState<keyof typeof contactPreferenceLabel | "">("");
  const [files, setFiles] = useState<File[]>([]);
  const [customer, setCustomer] = useState<CustomerRef | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    async function loadCustomer() {
      if (!isSupabaseConfigured) {
        setLoading(false);
        return;
      }
      const supabase = createClient();
      if (!supabase) {
        setError("Supabase is not configured.");
        setLoading(false);
        return;
      }
      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser();
      if (userError || !user) {
        setError("Please sign in before submitting a request.");
        setLoading(false);
        return;
      }
      const { data, error: fetchError } = await supabase
        .from("customers")
        .select("id, organization_id")
        .eq("auth_user_id", user.id)
        .maybeSingle();
      if (fetchError || !data) {
        setError("Customer profile not found. Please complete onboarding first.");
      } else {
        setCustomer(data as CustomerRef);
      }
      setLoading(false);
    }
    void loadCustomer();
  }, []);

  function validate(): string | null {
    if (!title.trim()) return "Project title is required.";
    if (title.trim().length > 200) return "Title must be 200 characters or less.";
    if (!service) return "Please choose a service.";
    if (!problem.trim()) return "Please describe the problem or goal.";
    if (!contactPreference) return "Please choose a contact preference.";
    if (website.trim() && !/^https?:\/\/.+/.test(website.trim())) return "Website must start with http:// or https://.";
    return null;
  }

  async function handleFiles(): Promise<RequestAttachment[]> {
    return files.map((f) => ({ name: f.name, size: f.size, type: f.type || "application/octet-stream" }));
  }

  async function submit(event: FormEvent) {
    event.preventDefault();
    setError(null);
    const validation = validate();
    if (validation) {
      setError(validation);
      return;
    }
    setSaving(true);

    const attachments = await handleFiles();

    if (!isSupabaseConfigured) {
      setSaving(false);
      setSuccess(true);
      return;
    }

    if (!customer) {
      setError("Customer profile not found. Please complete onboarding first.");
      setSaving(false);
      return;
    }

    const supabase = createClient();
    if (!supabase) {
      setError("Supabase client is unavailable.");
      setSaving(false);
      return;
    }

    const { error: insertError } = await supabase.from("project_requests").insert([
      {
        organization_id: customer.organization_id,
        customer_id: customer.id,
        status: "new",
        service,
        title: title.trim(),
        problem: problem.trim(),
        requirements: requirements.trim(),
        budget_range: budgetRange || null,
        timeline: timeline || null,
        website: website.trim() || null,
        reference: reference.trim() || null,
        contact_preference: contactPreference || null,
        attachments,
      },
    ]);

    setSaving(false);
    if (insertError) {
      setError(insertError.message);
      return;
    }
    setSuccess(true);
  }

  if (success) {
    return (
      <div className="panel success">
        <h2>Request received.</h2>
        <p>The MUCO LABS team will review it and contact you through your preferred method.</p>
        <Link className="primary" href="/portal/requests">View your requests</Link>
      </div>
    );
  }

  if (loading) {
    return <p className="loading">Loading your profile…</p>;
  }

  return (
    <>
      <div className="pagehead customerhead">
        <div>
          <h1>New project request.</h1>
          <p>Tell us what you need. Fields marked with an asterisk are required.</p>
        </div>
      </div>

      <form className="requestform" onSubmit={submit} noValidate>
        {error && (
          <div className="panel error" role="alert" aria-live="assertive">
            {error}
          </div>
        )}

        <div className="formgrid">
          <label htmlFor="request-service">
            Service type *
            <select
              id="request-service"
              required
              value={service}
              onChange={(e) => setService(e.target.value)}
            >
              {serviceOptions.map((o) => (
                <option key={o.value} value={o.value}>{o.label}</option>
              ))}
            </select>
          </label>

          <label htmlFor="request-title">
            Project title *
            <input
              id="request-title"
              type="text"
              required
              maxLength={200}
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="E.g. GST billing web app"
            />
          </label>

          <label htmlFor="request-budget">
            Budget range
            <select
              id="request-budget"
              value={budgetRange}
              onChange={(e) => setBudgetRange(e.target.value)}
            >
              {budgetRangeOptions.map((o) => (
                <option key={o.value} value={o.value}>{o.label}</option>
              ))}
            </select>
          </label>

          <label htmlFor="request-timeline">
            Expected timeline
            <select
              id="request-timeline"
              value={timeline}
              onChange={(e) => setTimeline(e.target.value)}
            >
              {timelineOptions.map((o) => (
                <option key={o.value} value={o.value}>{o.label}</option>
              ))}
            </select>
          </label>

          <label htmlFor="request-website">
            Website / reference URL
            <input
              id="request-website"
              type="url"
              value={website}
              onChange={(e) => setWebsite(e.target.value)}
              placeholder="https://example.com"
            />
          </label>

          <label htmlFor="request-reference">
            How did you hear about us?
            <input
              id="request-reference"
              type="text"
              value={reference}
              onChange={(e) => setReference(e.target.value)}
              placeholder="Google, referral, WhatsApp…"
            />
          </label>

          <label htmlFor="request-contact">
            Preferred contact method *
            <select
              id="request-contact"
              required
              value={contactPreference}
              onChange={(e) => setContactPreference(e.target.value as keyof typeof contactPreferenceLabel)}
            >
              <option value="">Select contact preference</option>
              {Object.entries(contactPreferenceLabel).map(([value, label]) => (
                <option key={value} value={value}>{label}</option>
              ))}
            </select>
          </label>
        </div>

        <label htmlFor="request-problem">
          Problem / goal *
          <textarea
            id="request-problem"
            required
            rows={5}
            value={problem}
            onChange={(e) => setProblem(e.target.value)}
            placeholder="Describe the business problem you want to solve."
          />
        </label>

        <label htmlFor="request-requirements">
          Requirements / scope
          <textarea
            id="request-requirements"
            rows={5}
            value={requirements}
            onChange={(e) => setRequirements(e.target.value)}
            placeholder="Specific features, integrations, design references, compliance needs, etc."
          />
        </label>

        <label htmlFor="request-attachments">
          Attachments
          <input
            id="request-attachments"
            type="file"
            multiple
            onChange={(e) => setFiles(Array.from(e.target.files ?? []))}
          />
        </label>
        <p className="fieldhint">
          {isSupabaseConfigured
            ? "Files are stored as metadata only until Supabase Storage is configured. The team will request files separately if needed."
            : "Demo mode: file names and sizes are shown for preview but nothing is uploaded."}
        </p>

        {files.length > 0 && (
          <ul className="filepreview" aria-label="Selected attachments">
            {files.map((f) => (
              <li key={f.name}>
                <span className="fileicon">{f.name.split(".").pop()?.toUpperCase().slice(0, 3) ?? "FILE"}</span>
                <span>
                  <b>{f.name}</b>
                  <small>{formatFileSize(f.size)}</small>
                </span>
              </li>
            ))}
          </ul>
        )}

        <div className="formactions">
          <Link className="secondary" href="/portal/requests">Cancel</Link>
          <button className="primary" type="submit" disabled={saving || loading}>
            {saving ? "Submitting…" : "Submit request"}
          </button>
        </div>
      </form>
    </>
  );
}
