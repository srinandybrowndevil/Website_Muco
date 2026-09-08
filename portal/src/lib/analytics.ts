export type TopPath = { path: string; views: number };

export type UtmBreakdown = {
  source: string;
  medium: string;
  campaign: string;
  count: number;
};

export type AnalyticsEvent = {
  id: string;
  event_name: string;
  path: string | null;
  referrer_host: string | null;
  referrer_path: string | null;
  utm_source: string | null;
  utm_medium: string | null;
  utm_campaign: string | null;
  session_id: string | null;
  metadata: Record<string, unknown> | null;
  occurred_at: string;
  created_at: string;
};

export type AnalyticsSummary = {
  period_days: number;
  enquiries_total: number;
  enquiries_new_7d: number;
  page_views: number;
  cta_clicks: number;
  contact_clicks: number;
  signup_clicks: number;
  lead_submits: number;
  top_paths: TopPath[];
  source_breakdown: Record<string, number>;
  utm_breakdown: UtmBreakdown[];
  recent_events: AnalyticsEvent[];
};

export const demoSummary: AnalyticsSummary = {
  period_days: 30,
  enquiries_total: 1,
  enquiries_new_7d: 1,
  page_views: 124,
  cta_clicks: 18,
  contact_clicks: 9,
  signup_clicks: 3,
  lead_submits: 1,
  top_paths: [
    { path: "/", views: 42 },
    { path: "/services", views: 28 },
    { path: "/contact", views: 19 },
    { path: "/work", views: 15 },
    { path: "/pricing", views: 10 },
  ],
  source_breakdown: { direct: 98, google: 18, instagram: 8 },
  utm_breakdown: [
    { source: "direct", medium: "none", campaign: "none", count: 98 },
    { source: "google", medium: "organic", campaign: "none", count: 18 },
    { source: "instagram", medium: "social", campaign: "none", count: 8 },
  ],
  recent_events: [
    {
      id: "demo-event-1",
      event_name: "lead_submit",
      path: "/contact",
      referrer_host: null,
      referrer_path: null,
      utm_source: null,
      utm_medium: null,
      utm_campaign: null,
      session_id: "demo-session",
      metadata: { channel: "whatsapp" },
      occurred_at: new Date().toISOString(),
      created_at: new Date().toISOString(),
    },
    {
      id: "demo-event-2",
      event_name: "page_view",
      path: "/contact",
      referrer_host: "google.com",
      referrer_path: "/",
      utm_source: null,
      utm_medium: null,
      utm_campaign: null,
      session_id: "demo-session",
      metadata: {},
      occurred_at: new Date().toISOString(),
      created_at: new Date().toISOString(),
    },
  ],
};
