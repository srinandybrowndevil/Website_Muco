/**
 * POST /api/event — receives a privacy-conscious first-party analytics event.
 *
 * This endpoint is deliberately minimal:
 *   - no cookies or persistent identifiers are used or set
 *   - no IP address or fingerprint is stored
 *   - the session id is a random UUID held only in sessionStorage by the browser
 *   - events are allowlisted and bounded in length
 *   - calls are best-effort: failure here never breaks the page
 *
 * Configuration (Vercel → Settings → Environment Variables):
 *   NEXT_PUBLIC_SUPABASE_URL
 *   NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY / NEXT_PUBLIC_SUPABASE_ANON_KEY
 */

const ALLOWED_EVENTS = [
  'page_view',
  'cta_click',
  'contact_click',
  'signup_click',
  'form_start',
  'lead_submit',
  'whatsapp_click',
  'phone_click',
  'email_click',
  'instagram_click',
  'faq_open',
  'project_detail_open'
];

const MAX = {
  event_name: 40,
  path: 200,
  referrer: 300,
  utm: 100,
  session_id: 64,
  metadata: 2000
};

const WINDOW_MS = 60 * 1000;
const MAX_PER_WINDOW = 30;
const seen = new Map();

function rateLimited(ip) {
  const now = Date.now();
  const hits = (seen.get(ip) || []).filter((t) => now - t < WINDOW_MS);
  hits.push(now);
  seen.set(ip, hits);
  if (seen.size > 5000) seen.clear();
  return hits.length > MAX_PER_WINDOW;
}

const CONTROL_CHARS = /[\x00-\x1F\x7F]/g;
const clean = (v, max) =>
  typeof v === 'string' ? v.replace(CONTROL_CHARS, ' ').trim().slice(0, max) : '';

function safeReferrerParts(raw) {
  const value = clean(raw, MAX.referrer);
  if (!value) return { host: '', path: '' };
  try {
    const url = new URL(value);
    return { host: url.hostname.slice(0, 100), path: (url.pathname + url.search).slice(0, 200) };
  } catch {
    // Not a valid URL: keep the raw string bounded as the path, no host.
    return { host: '', path: value.slice(0, 200) };
  }
}

function isValidISODate(v) {
  if (typeof v !== 'string' || v.length > 40) return false;
  const d = new Date(v);
  return !isNaN(d.getTime());
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ ok: false, error: 'Method not allowed' });
  }

  const ip =
    (req.headers['x-forwarded-for'] || '').split(',')[0].trim() || 'unknown';
  if (rateLimited(ip)) {
    return res.status(429).json({ ok: false, error: 'Slow down.' });
  }

  let body = req.body;
  if (typeof body === 'string') {
    try {
      body = JSON.parse(body);
    } catch {
      return res.status(400).json({ ok: false, error: 'Could not read the event.' });
    }
  }
  if (!body || typeof body !== 'object') {
    return res.status(400).json({ ok: false, error: 'Could not read the event.' });
  }

  const eventName = clean(body.event_name, MAX.event_name).toLowerCase();
  if (!eventName || !ALLOWED_EVENTS.includes(eventName)) {
    return res.status(400).json({ ok: false, error: 'Event not recognized.' });
  }

  const rawPath = clean(body.path, MAX.path);
  const path = rawPath.startsWith('/') ? rawPath : '/' + rawPath;
  const referrer = safeReferrerParts(body.referrer);
  const sessionId = clean(body.session_id, MAX.session_id);

  const utmSource = clean(body.utm_source, MAX.utm);
  const utmMedium = clean(body.utm_medium, MAX.utm);
  const utmCampaign = clean(body.utm_campaign, MAX.utm);

  let metadata = {};
  if (body.metadata && typeof body.metadata === 'object' && !Array.isArray(body.metadata)) {
    try {
      const s = JSON.stringify(body.metadata);
      if (s.length <= MAX.metadata) metadata = body.metadata;
    } catch {
      /* ignore malformed metadata */
    }
  }

  const occurredAt = isValidISODate(body.occurred_at) ? body.occurred_at : new Date().toISOString();

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseKey =
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ??
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseKey) {
    return res.status(200).json({ ok: false, recorded: false });
  }

  const rpcUrl = `${supabaseUrl.replace(/\/$/, '')}/rest/v1/rpc/ingest_analytics_event`;
  const payload = {
    event_name: eventName,
    path,
    referrer_host: referrer.host,
    referrer_path: referrer.path,
    utm_source: utmSource,
    utm_medium: utmMedium,
    utm_campaign: utmCampaign,
    session_id: sessionId,
    metadata,
    occurred_at: occurredAt
  };

  try {
    const r = await fetch(rpcUrl, {
      method: 'POST',
      headers: {
        apikey: supabaseKey,
        Authorization: `Bearer ${supabaseKey}`,
        'Content-Type': 'application/json',
        Prefer: 'return=minimal'
      },
      body: JSON.stringify({ payload })
    });
    if (!r.ok) {
      console.error('[event] crm ingest failed', r.status, await r.text());
      return res.status(200).json({ ok: false, recorded: false });
    }
    return res.status(200).json({ ok: true, recorded: true });
  } catch (err) {
    console.error('[event] crm ingest threw', err && err.message);
    return res.status(200).json({ ok: false, recorded: false });
  }
}
