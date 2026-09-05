/**
 * POST /api/lead — receives an enquiry from the contact form.
 *
 * Until this existed, the form only opened WhatsApp or a mail client. If that
 * failed — no WhatsApp on desktop, no mail client configured, a blocked popup,
 * or the visitor simply not pressing send — the enquiry vanished with no trace
 * and nobody knew a lead had been lost. This endpoint records it first, so the
 * WhatsApp hand-off becomes a convenience rather than the only path.
 *
 * Validation is server-side because the browser's is only a courtesy: anything
 * arriving here is treated as untrusted, whatever the form did.
 *
 * Configuration (Vercel → Settings → Environment Variables, see .env.example):
 *   RESEND_API_KEY   send the notification email. Without it the lead is still
 *                    accepted and written to the function log, so nothing is
 *                    lost while the key is being set up.
 *   LEAD_TO_EMAIL    where notifications go (default founder@mucolabs.com)
 *   LEAD_FROM_EMAIL  verified sender on your Resend domain
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

// Per-instance, best-effort. Vercel may run several instances, so this stops
// casual flooding rather than a determined attacker — that needs a shared
// store, which is not worth adding before there is traffic to justify it.
const seen = new Map();
const WINDOW_MS = 60 * 1000;
const MAX_PER_WINDOW = 5;

function rateLimited(ip) {
  const now = Date.now();
  const hits = (seen.get(ip) || []).filter((t) => now - t < WINDOW_MS);
  hits.push(now);
  seen.set(ip, hits);
  if (seen.size > 5000) seen.clear(); // crude bound on memory
  return hits.length > MAX_PER_WINDOW;
}

// Strip control characters -- they have no place in a form field and can
// break log lines and mail headers -- then trim and bound the length.
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

  // Honeypot: a real person never fills a field they cannot see. Answer 200 so
  // a bot cannot tell it was rejected and retry with the field left blank.
  if (clean(body.company_website, 50)) {
    console.log('[lead] honeypot rejected', { ip });
    return res.status(200).json({ ok: true });
  }

  const lead = {};
  for (const [field, max] of Object.entries(MAX)) lead[field] = clean(body[field], max);

  const errors = {};
  if (!lead.name) errors.name = 'Please enter your name.';
  if (!lead.phone || !looksLikePhone(lead.phone))
    errors.phone = 'Please enter a number we can reach you on.';
  if (!lead.message) errors.message = 'Please tell us a little about the project.';
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

  // Written before the email is attempted, so a lead is never lost to a
  // provider outage or a missing key — the Vercel function log is the backstop.
  console.log('[lead]', JSON.stringify({ ...lead, ...meta }));

  const key = process.env.RESEND_API_KEY;
  let emailed = false;

  if (key) {
    const rows = [
      ['Name', lead.name],
      ['Business', lead.business || '—'],
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
      `<h2>New enquiry from ${esc(lead.name)}</h2>` +
      '<table cellpadding="6" style="border-collapse:collapse;font-family:sans-serif;font-size:14px">' +
      rows
        .map(
          ([k, v]) =>
            `<tr><td style="color:#666;vertical-align:top"><b>${esc(k)}</b></td><td>${esc(v)}</td></tr>`
        )
        .join('') +
      '</table>' +
      `<h3>What they want to build</h3><p style="white-space:pre-wrap;font-family:sans-serif">${esc(
        lead.message
      )}</p>`;

    try {
      const r = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: { Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          from: process.env.LEAD_FROM_EMAIL || 'MUCO LABS <onboarding@resend.dev>',
          to: [process.env.LEAD_TO_EMAIL || 'founder@mucolabs.com'],
          reply_to: lead.email || undefined,
          subject: `Enquiry — ${lead.service || 'General'} — ${lead.name}`,
          html
        })
      });
      emailed = r.ok;
      if (!r.ok) console.error('[lead] resend failed', r.status, await r.text());
    } catch (err) {
      console.error('[lead] resend threw', err && err.message);
    }
  }

  // The lead is recorded either way, so the visitor is told it arrived.
  // Telling them it failed because our email provider is down would be a lie
  // that costs us the enquiry.
  return res.status(200).json({ ok: true, emailed });
}
