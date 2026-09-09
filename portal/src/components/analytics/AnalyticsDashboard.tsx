"use client";

import { useState } from "react";
import { Icon } from "@/components/Icon";
import { EmptyState } from "@/components/EmptyState";
import type { AnalyticsSummary } from "@/lib/analytics";

function formatDate(iso: string | null | undefined) {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("en-IN", {
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function Metric({
  label,
  value,
  icon,
}: {
  label: string;
  value: string | number;
  icon: string;
}) {
  return (
    <article className="metriccard">
      <span className="metricicon">
        <Icon name={icon} />
      </span>
      <div>
        <span>{label}</span>
        <b>{value}</b>
      </div>
    </article>
  );
}

export function AnalyticsDashboard({
  summary,
  error,
  isConfigured,
}: {
  summary: AnalyticsSummary | null;
  error: string | null;
  isConfigured: boolean;
}) {
  const [tab, setTab] = useState<"overview" | "paths" | "sources" | "events">("overview");

  if (error) {
    return (
      <div className="page">
        <div className="pagehead">
          <div>
            <p className="eyebrow">Workspace / ANALYTICS</p>
            <h1>Website analytics.</h1>
            <p>First-party metrics from the public website.</p>
          </div>
        </div>
        <div className="panel error" role="alert">
          {error}
        </div>
      </div>
    );
  }

  if (!summary) {
    return (
      <div className="page">
        <div className="pagehead">
          <div>
            <p className="eyebrow">Workspace / ANALYTICS</p>
            <h1>Website analytics.</h1>
          </div>
        </div>
        <div className="panel">
          <EmptyState
            icon="chart"
            title="No visits recorded yet"
            body="Page views, referrers and campaign links from mucolabs.com collect here as first-party events. If the site is live and this stays empty, the analytics script is not reaching the recorder."
            note="Google Analytics reports separately and will show its own totals."
          />
        </div>
      </div>
    );
  }

  return (
    <div className="page">
      <div className="pagehead">
        <div>
          <p className="eyebrow">Workspace / ANALYTICS</p>
          <h1>Website analytics.</h1>
          <p>
            First-party metrics from the public website · last {summary.period_days} days
          </p>
        </div>
      </div>

      {!isConfigured && (
        <p className="demopill" aria-live="polite">
          Preview mode — data is not saved.
        </p>
      )}

      <section className="metrics four" aria-label="Key analytics metrics">
        <Metric label="Page views" value={summary.page_views} icon="barChart" />
        <Metric label="CTA clicks" value={summary.cta_clicks} icon="target" />
        <Metric label="Contact clicks" value={summary.contact_clicks} icon="mail" />
        <Metric label="Lead submissions" value={summary.lead_submits} icon="check" />
      </section>

      <section className="panel wide">
        <div className="panelhead">
          <div className="tabs" role="tablist" aria-label="Analytics sections">
            {[
              ["overview", "Overview"],
              ["paths", "Popular paths"],
              ["sources", "Sources"],
              ["events", "Recent events"],
            ].map(([key, label]) => (
              <button
                key={key}
                role="tab"
                aria-selected={tab === key}
                className={tab === key ? "selected" : ""}
                onClick={() => setTab(key as typeof tab)}
                type="button"
              >
                {label}
              </button>
            ))}
          </div>
        </div>

        {tab === "overview" && (
          <div className="analyticsummary">
            <div className="summarygrid">
              <article>
                <span>Total enquiries</span>
                <b>{summary.enquiries_total}</b>
              </article>
              <article>
                <span>New enquiries (7d)</span>
                <b>{summary.enquiries_new_7d}</b>
              </article>
              <article>
                <span>Sign-up clicks</span>
                <b>{summary.signup_clicks}</b>
              </article>
              <article>
                <span>Lead submissions</span>
                <b>{summary.lead_submits}</b>
              </article>
            </div>
            <p className="notetext">
              These totals use recorded first-party events. Google Analytics reports separately and may show different totals.
            </p>
          </div>
        )}

        {tab === "paths" && (
          <div className="tablewrap">
            <table>
              <caption className="visually-hidden">Popular paths by page views</caption>
              <thead>
                <tr>
                  <th scope="col">Path</th>
                  <th scope="col">Page views</th>
                </tr>
              </thead>
              <tbody>
                {summary.top_paths.length === 0 && (
                  <tr>
                    <td colSpan={2}>No page views recorded in this period yet.</td>
                  </tr>
                )}
                {summary.top_paths.map((p) => (
                  <tr key={p.path}>
                    <td>{p.path}</td>
                    <td>{p.views}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {tab === "sources" && (
          <div className="tablewrap">
            <table>
              <caption className="visually-hidden">UTM source breakdown</caption>
              <thead>
                <tr>
                  <th scope="col">Source</th>
                  <th scope="col">Medium</th>
                  <th scope="col">Campaign</th>
                  <th scope="col">Events</th>
                </tr>
              </thead>
              <tbody>
                {summary.utm_breakdown.length === 0 && (
                  <tr>
                    <td colSpan={4}>No tagged campaign links have been visited yet.</td>
                  </tr>
                )}
                {summary.utm_breakdown.map((u, i) => (
                  <tr key={`${u.source}-${u.medium}-${u.campaign}-${i}`}>
                    <td>{u.source}</td>
                    <td>{u.medium}</td>
                    <td>{u.campaign}</td>
                    <td>{u.count}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {tab === "events" && (
          <div className="tablewrap">
            <table>
              <caption className="visually-hidden">Recent analytics events</caption>
              <thead>
                <tr>
                  <th scope="col">Event</th>
                  <th scope="col">Path</th>
                  <th scope="col">Occurred</th>
                </tr>
              </thead>
              <tbody>
                {summary.recent_events.length === 0 && (
                  <tr>
                    <td colSpan={3}>No recent events.</td>
                  </tr>
                )}
                {summary.recent_events.slice(0, 25).map((e) => (
                  <tr key={e.id}>
                    <td>
                      <em className="status onboarding planning draft sent">{e.event_name}</em>
                    </td>
                    <td>{e.path ?? "—"}</td>
                    <td>{formatDate(e.occurred_at)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}
