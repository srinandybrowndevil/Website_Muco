/**
 * POST /api/lead — receives an enquiry from the public website forms.
 *
 * The website does not use a database. Validation happens server-side and the
 * enquiry is sent directly to the MUCO LABS business email via Resend.
 *
 * Environment variables (Vercel → Settings → Environment Variables):
 *   RESEND_API_KEY    required to send the notification email
 *   LEAD_TO_EMAIL     recipient (default founder@mucolabs.com)
 *   LEAD_FROM_EMAIL   verified sender on your Resend domain
 */

const MAX = {
  name: 100,
  business: 120,
  phone: 32,
  email: 160,
  location: 100,
  service: 80,
  website: 300,
  budget: 60,
  timeline: 60,
  message: 4000
};

// Per-instance, best-effort rate limit. Stops casual flooding; a determined
// attacker needs a shared store, which is not justified for a static site.
const seen = new Map();
const WINDOW_MS = 60 * 1000;
const MAX_PER_WINDOW = 5;

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

const looksLikeEmail = (v) => !v || /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(v);
const looksLikePhone = (v) => (v.match(/\d/g) || []).length >= 7;

const esc = (s) =>
  String(s).replace(/[&<>"']/g, (c) =>
    ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c])
  );

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ ok: false, error: 'Method not allowed' });
  }

  const ip =
    (req.headers['x-forwarded-for'] || '').split(',')[0].trim() || 'unknown';
  if (rateLimited(ip)) {
    return res
      .status(429)
      .json({ ok: false, error: 'Too many messages. Please try again in a minute.' });
  }

  let body = req.body;
  if (typeof body === 'string') {
    try {
      body = JSON.parse(body);
    } catch {
      return res.status(400).json({ ok: false, error: 'Could not read the form.' });
    }
  }
  if (!body || typeof body !== 'object') {
    return res.status(400).json({ ok: false, error: 'Could not read the form.' });
  }

  // Honeypot: a real person never fills a field they cannot see.
  if (clean(body.company_website, 50)) {
    console.log('[lead] honeypot rejected', { ip });
    return res.status(200).json({ ok: true });
  }

  const lead = {};
  for (const [field, max] of Object.entries(MAX)) lead[field] = clean(body[field], max);

  const errors = {};
  if (!lead.name) errors.name = 'Please enter your name.';
  if (!lead.business) errors.business = 'Please enter your business name.';
  if (!lead.phone || !looksLikePhone(lead.phone))
    errors.phone = 'Please enter a number we can reach you on.';
  if (!lead.service) errors.service = 'Please choose a service.';
  if (!looksLikeEmail(lead.email)) errors.email = 'That email address does not look right.';
  if (body.consent !== true && body.consent !== 'true')
    errors.consent = 'Please confirm we may contact you.';

  if (Object.keys(errors).length) {
    return res.status(400).json({ ok: false, errors });
  }

  const meta = {
    received: new Date().toISOString(),
    page: clean(body.page, 200),
    referrer: clean(body.referrer, 300),
    utm_source: clean(body.utm_source, 100),
    utm_medium: clean(body.utm_medium, 100),
    utm_campaign: clean(body.utm_campaign, 100),
    ip
  };

  console.log('[lead] received', JSON.stringify({
    service: lead.service || 'unspecified',
    page: meta.page || '/',
    received: meta.received,
    ip: meta.ip
  }));

  const resendKey = process.env.RESEND_API_KEY;
  if (!resendKey) {
    console.error('[lead] RESEND_API_KEY is not configured.');
    return res.status(503).json({ ok: false, error: 'Email delivery is not configured. Please use WhatsApp or phone instead.' });
  }

  const rows = [
    ['Name', lead.name],
    ['Business', lead.business],
    ['Phone / WhatsApp', lead.phone],
    ['Email', lead.email || '—'],
    ['Location', lead.location || '—'],
    ['Service', lead.service || '—'],
    ['Current website', lead.website || 'None'],
    ['Budget', lead.budget || 'Not decided'],
    ['Timeline', lead.timeline || 'Not decided'],
    ['Came from', meta.page || '—'],
    ['Referrer', meta.referrer || 'direct'],
    ['Campaign', [meta.utm_source, meta.utm_medium, meta.utm_campaign].filter(Boolean).join(' · ') || '—']
  ];

  const html =
    '<h2>New enquiry from ' + esc(lead.name) + '</h2>' +
    '<table cellpadding="6" style="border-collapse:collapse;font-family:sans-serif;font-size:14px">' +
    rows
      .map(([k, v]) =>
        '<tr><td style="color:#666;vertical-align:top"><b>' + esc(k) + '</b></td><td>' + esc(v) + '</td></tr>'
      )
      .join('') +
    '</table>' +
    '<h3>What they want to build</h3><p style="white-space:pre-wrap;font-family:sans-serif">' +
    esc(lead.message || '—') +
    '</p>';

  try {
    const r = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: { Authorization: 'Bearer ' + resendKey, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        from: process.env.LEAD_FROM_EMAIL || 'MUCO LABS <onboarding@resend.dev>',
        to: [process.env.LEAD_TO_EMAIL || 'founder@mucolabs.com'],
        reply_to: lead.email || undefined,
        subject: 'MUCO LABS Enquiry — ' + (lead.service || 'General') + ' — ' + lead.name,
        html
      })
    });
    if (!r.ok) {
      const text = await r.text();
      console.error('[lead] resend failed', r.status, text);
      return res.status(502).json({ ok: false, error: 'We could not send the email. Please try again.' });
    }
    return res.status(200).json({ ok: true, recorded: true, emailed: true });
  } catch (err) {
    console.error('[lead] resend threw', err && err.message);
    return res.status(502).json({ ok: false, error: 'We could not send the email. Please try again.' });
  }
}
