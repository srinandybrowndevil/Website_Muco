import type { Metadata } from "next";
import { requireAccount } from "@muco/core/server";
import { formatDateTime } from "@muco/core";
import { Bar, EmptyState, Icon } from "@muco/ui";

export const metadata: Metadata = { title: "Analytics" };

type Summary = {
  period_days: number;
  enquiries_total: number;
  enquiries_new_7d: number;
  page_views: number;
  cta_clicks: number;
  contact_clicks: number;
  signup_clicks: number;
  lead_submits: number;
  top_paths: { path: string; views: number }[];
  source_breakdown: Record<string, number>;
  utm_breakdown: { source: string; medium: string; campaign: string; count: number }[];
  recent_events: { id: string; event_name: string; path: string; occurred_at: string }[];
};

// What the public website did, read through one SECURITY DEFINER function.
//
// The function is the whole access story: it resolves the caller's own
// organisation, refuses anybody whose membership is switched off, and returns
// aggregates. There is no way to ask it about a different organisation,
// because it takes no organisation argument.
export default async function AnalyticsPage({
  searchParams,
}: {
  searchParams: Promise<{ days?: string }>;
}) {
  const { days = "30" } = await searchParams;
  const { supabase } = await requireAccount("admin");

  const { data, error } = await supabase.rpc("get_website_analytics_summary", {
    p_days: Number(days) || 30,
  });
  const summary = data as Summary | null;

  if (error || !summary) {
    return (
      <div className="page">
        <div className="page-head">
          <h1>Analytics</h1>
        </div>
        <EmptyState icon="chart" title="No analytics available">
          The summary could not be read. That is usually a membership that has been switched off
          rather than a missing table.
        </EmptyState>
      </div>
    );
  }

  const conversion = summary.page_views > 0
    ? Math.round((summary.lead_submits / summary.page_views) * 1000) / 10
    : 0;
  const topViews = Math.max(1, ...(summary.top_paths ?? []).map(row => row.views));

  return (
    <div className="page">
      <div className="page-head">
        <div className="split">
          <div className="stack-sm">
            <span className="eyebrow">Last {summary.period_days} days</span>
            <h1>Website analytics</h1>
          </div>
          <div className="cluster">
            {["7", "30", "90"].map(option => (
              <a className="chip" key={option} href={"/analytics?days=" + option}
                aria-current={days === option ? "true" : undefined}>
                {option} days
              </a>
            ))}
          </div>
        </div>
        <p className="lede">
          What mucolabs.com did. Counted from events the site sends itself, not from a third-party
          script — nothing here is shared outside the studio.
        </p>
      </div>

      <section className="grid">
        <div className="metric">
          <span className="k">Page views</span>
          <span className="v">{summary.page_views.toLocaleString("en-IN")}</span>
        </div>
        <div className="metric">
          <span className="k">Enquiries submitted</span>
          <span className="v">{summary.lead_submits}</span>
          <span className="n">{conversion}% of views</span>
        </div>
        <div className="metric">
          <span className="k">Contact clicks</span>
          <span className="v">{summary.contact_clicks}</span>
          <span className="n">Phone, email, WhatsApp</span>
        </div>
        <div className="metric">
          <span className="k">Enquiries in the last 7 days</span>
          <span className="v">{summary.enquiries_new_7d}</span>
          <span className="n">{summary.enquiries_total} in total</span>
        </div>
      </section>

      <section className="grid-main">
        <section className="panel">
          <div className="panel-head"><h2>Most read pages</h2></div>
          {(summary.top_paths ?? []).length === 0 ? (
            <EmptyState icon="chart" title="No page views in this window" />
          ) : (
            <div className="list">
              {(summary.top_paths ?? []).map(row => (
                <div className="item" key={row.path} style={{ alignItems: "stretch" }}>
                  <span className="item-main stack-sm">
                    <b className="mono truncate">{row.path}</b>
                    <Bar value={row.views} max={topViews} label={row.path} />
                  </span>
                  <span className="tabular hint">{row.views}</span>
                </div>
              ))}
            </div>
          )}
        </section>

        <section className="panel">
          <div className="panel-head"><h2>Where they came from</h2></div>
          {Object.keys(summary.source_breakdown ?? {}).length === 0 ? (
            <EmptyState icon="target" title="No sources recorded" />
          ) : (
            <div className="list">
              {Object.entries(summary.source_breakdown ?? {})
                .sort((a, b) => b[1] - a[1])
                .map(([source, count]) => (
                  <div className="item" key={source}>
                    <span className="item-main"><b>{source}</b></span>
                    <span className="tabular hint">{count}</span>
                  </div>
                ))}
            </div>
          )}
        </section>
      </section>

      <section className="panel">
        <div className="panel-head"><h2>Most recent events</h2></div>
        {(summary.recent_events ?? []).length === 0 ? (
          <EmptyState icon="bolt" title="Nothing recent" />
        ) : (
          <div className="tablewrap">
            <table>
              <caption className="sr-only">Recent analytics events</caption>
              <thead>
                <tr>
                  <th scope="col">When</th>
                  <th scope="col">Event</th>
                  <th scope="col">Path</th>
                </tr>
              </thead>
              <tbody>
                {(summary.recent_events ?? []).map(row => (
                  <tr key={row.id}>
                    <td>{formatDateTime(row.occurred_at)}</td>
                    <td>{row.event_name.replace(/_/g, " ")}</td>
                    <td className="mono">{row.path}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <p className="notice">
        <Icon name="shield" size={14} />
        <span>
          Events are aggregated and expire on a retention schedule. No visitor is identified, and
          nothing here is joined to a customer record.
        </span>
      </p>
    </div>
  );
}
