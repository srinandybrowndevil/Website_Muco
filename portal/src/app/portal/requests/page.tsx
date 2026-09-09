"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { CustomerShell } from "@/components/portal/CustomerShell";
import { EmptyState } from "@/components/EmptyState";
import { createClient } from "@/lib/supabase/client";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import {
  demoRequest,
  formatDate,
  type ProjectRequest,
  requestStatusLabel,
  requestStatusTone,
} from "@/lib/requests";

export default function CustomerRequestsPage() {
  return (
    <CustomerShell>
      <CustomerRequests />
    </CustomerShell>
  );
}

function CustomerRequests() {
  const [requests, setRequests] = useState<ProjectRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function load() {
      if (!isSupabaseConfigured) {
        setRequests([demoRequest]);
        setLoading(false);
        return;
      }
      const supabase = createClient();
      if (!supabase) {
        setError("Supabase is not configured.");
        setLoading(false);
        return;
      }
      const { data, error: fetchError } = await supabase
        .from("project_requests")
        .select("*, customers(name, company)")
        .order("created_at", { ascending: false });
      if (fetchError) {
        setError(fetchError.message);
      } else {
        setRequests((data as ProjectRequest[]) ?? []);
      }
      setLoading(false);
    }
    void load();
  }, []);

  return (
    <>
      <div className="pagehead customerhead">
        <div>
          <h1>Your requests.</h1>
          <p>Track everything you have sent to the MUCO LABS team.</p>
        </div>
        <Link className="primary" href="/portal/requests/new">
          New request
        </Link>
      </div>

      {loading && <p className="loading">Loading requests…</p>}

      {!loading && error && (
        <div className="panel error" role="alert">
          <p>Could not load requests: {error}</p>
        </div>
      )}

      {!loading && !error && requests.length === 0 && (
        <div className="panel">
          <EmptyState
            icon="bolt"
            title="You have not sent a request yet"
            body="Describe what you want built and we read it ourselves. Everything after that -- our questions, the scope, the proposal and the work itself -- stays attached to the request so nothing gets lost in a chat thread."
            action={{ label: "Submit your first request", href: "/portal/requests/new" }}
            secondary={{ label: "Ask a question first", href: "/portal/contact" }}
          />
        </div>
      )}

      {!loading && !error && requests.length > 0 && (
        <ul className="requestlist" aria-label="Your project requests">
          {requests.map((r) => (
            <li key={r.id} className="requestcard">
              <header>
                <div>
                  <h2>{r.title}</h2>
                  <small>
                    {r.customers?.name ?? "You"}
                    {r.customers?.company ? ` · ${r.customers.company}` : ""} ·{" "}
                    {formatDate(r.created_at)}
                  </small>
                </div>
                <span className={`status ${requestStatusTone(r.status)}`}>
                  {requestStatusLabel[r.status]}
                </span>
              </header>
              <div className="requestbody">
                {r.service && (
                  <p>
                    <b>Service:</b> {r.service}
                  </p>
                )}
                {r.budget_range && (
                  <p>
                    <b>Budget:</b> {r.budget_range}
                  </p>
                )}
                {r.timeline && (
                  <p>
                    <b>Timeline:</b> {r.timeline}
                  </p>
                )}
                {r.problem && <p>{r.problem}</p>}
              </div>
              {r.status === "needs_info" && (
                <footer className="requestfoot">
                  The team has asked for more information. Reply by creating a new request or
                  emailing your contact.
                </footer>
              )}
            </li>
          ))}
        </ul>
      )}

      {!isSupabaseConfigured && requests.length > 0 && (
        <p className="demopill" aria-live="polite">
          Preview mode — data is not saved.
        </p>
      )}
    </>
  );
}
