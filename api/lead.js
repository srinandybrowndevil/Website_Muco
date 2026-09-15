/**
 * POST /api/lead — receives an enquiry from the public website forms.
 *
 * The website does not use a database. Validation happens server-side and the
 * enquiry is sent directly to the MUCO LABS business email via Resend.
 *
 * Two callers, two response shapes:
 *   - main.js sends JSON and gets JSON back.
 *   - The form itself posts form-encoded when JavaScript is not running, and
 *     gets an HTML confirmation page back. The form declares method and action
 *     so this path exists at all; without them the browser would GET, putting
 *     the customer's details in the URL and losing the enquiry.
 *
 * There is no database and no second mail provider, so a failed send would lose
 * the enquiry. Logging it would make it recoverable but would park a name, phone
 * number and email in a log store nobody consented to, which test-lead.mjs
 * forbids. Instead a failure hands the enquiry back to the person who already
 * has it: the reply carries a WhatsApp link with everything they typed prefilled,
 * so recovering it is one tap. Logs stay non-identifying.
 *
 * Environment variables (Vercel → Settings → Environment Variables):
 *   RESEND_API_KEY       required to send the notification email
 *   LEAD_TO_EMAIL        recipient (default founder@mucolabs.com)
 *   LEAD_FROM_EMAIL      verified sender on your Resend domain
 *   LEAD_ALLOWED_ORIGIN  overrides the origin allowed to post here
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

// The dev server enforces this too, but it has to live here as well: on Vercel
// this handler runs on its own, so a check that exists only in dev-site.mjs
// leaves production with no origin validation at all.
const ALLOWED_ORIGINS = [
  process.env.LEAD_ALLOWED_ORIGIN,
  'https://mucolabs.com',
  'https://www.mucolabs.com'
].filter(Boolean);

// Localhost counts as ours when this is not running on Vercel, so the dev
// server and the browser tests exercise the same code path as production
// instead of a laxer one -- a check that only ever runs in production is a
// check nobody has tested.
const LOCAL_ORIGIN = /^http:\/\/(?:localhost|127\.0\.0\.1)(?::\d+)?$/;

// A browser form post carries an Origin header; curl and server-to-server
// clients usually do not. Reject only a stated origin that is not ours, so
// legitimate non-browser callers are not broken by a header they never send.
const originRejected = (req) => {
  const origin = req.headers.origin;
  if (!origin) return false;
  if (ALLOWED_ORIGINS.includes(origin)) return false;
  return !(!process.env.VERCEL && LOCAL_ORIGIN.test(origin));
};

const wantsHtml = (req) =>
  String(req.headers['content-type'] || '').includes('form-urlencoded');

// Minimal self-contained reply for the no-JavaScript path. It cannot use the
// site's stylesheet, so everything it needs is inline.
function htmlReply(res, status, title, message, detail, handoff) {
  res.status(status).setHeader('Content-Type', 'text/html; charset=utf-8');
  return res.end(`<!doctype html><html lang="en-IN"><meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<meta name="robots" content="noindex">
<title>${esc(title)} — MUCO LABS</title>
<style>:root{color-scheme:light dark}body{margin:0;background:#0e1013;color:#e8ecf1;
font:17px/1.6 system-ui,-apple-system,Segoe UI,sans-serif;display:grid;place-items:center;
min-height:100vh}main{max-width:34rem;padding:2rem 1.25rem}h1{font-size:1.75rem;line-height:1.2;
margin:0 0 .75rem}p{color:#aab4c0;margin:0 0 1rem}a{color:#cf9061}
.row{display:flex;flex-wrap:wrap;gap:.75rem;margin-top:1.5rem}
.row a{display:inline-block;padding:.65rem 1.1rem;border:1px solid #3a414b;border-radius:6px;
text-decoration:none}.row a.primary{background:#cf9061;border-color:#cf9061;color:#14171c;font-weight:600}</style>
<main><h1>${esc(title)}</h1><p>${esc(message)}</p>${detail ? `<p>${esc(detail)}</p>` : ''}
<div class="row">${handoff ? `<a class="primary" href="${esc(handoff)}">Send it on WhatsApp</a>` : '<a href="https://wa.me/916381809844">WhatsApp MUCO LABS</a>'}
<a href="/">Back to the website</a>
<a href="tel:+916381809844">Call +91 63818 09844</a></div></main></html>`);
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ ok: false, error: 'Method not allowed' });
  }

  if (originRejected(req)) {
    console.warn('[lead] rejected cross-origin post', { origin: req.headers.origin });
    return res.status(403).json({ ok: false, error: 'Forbidden' });
  }

  const asHtml = wantsHtml(req);

  const ip =
    (req.headers['x-forwarded-for'] || '').split(',')[0].trim() || 'unknown';
  if (rateLimited(ip)) {
    const tooMany = 'Too many messages. Please try again in a minute.';
    return asHtml
      ? htmlReply(res, 429, 'One moment', tooMany, 'You can reach us straight away on WhatsApp or by phone.')
      : res.status(429).json({ ok: false, error: tooMany });
  }

  let body = req.body;
  if (typeof body === 'string') {
    try {
      body = asHtml ? Object.fromEntries(new URLSearchParams(body)) : JSON.parse(body);
    } catch {
      return asHtml
        ? htmlReply(res, 400, 'We could not read that', 'Something went wrong reading the form.', 'Please try again, or contact us directly.')
        : res.status(400).json({ ok: false, error: 'Could not read the form.' });
    }
  }
  if (!body || typeof body !== 'object') {
    return asHtml
      ? htmlReply(res, 400, 'We could not read that', 'Something went wrong reading the form.', 'Please try again, or contact us directly.')
      : res.status(400).json({ ok: false, error: 'Could not read the form.' });
  }

  // Honeypot: a real person never fills a field they cannot see.
  if (clean(body.company_website, 50)) {
    console.log('[lead] honeypot rejected', { ip });
    return asHtml
      ? htmlReply(res, 200, 'Thank you', 'Your enquiry has been received.')
      : res.status(200).json({ ok: true });
  }

  const lead = {};
  for (const [field, max] of Object.entries(MAX)) lead[field] = clean(body[field], max);

  const errors = {};
  if (!lead.name) errors.name = 'Please enter your name.';
  if (!lead.business) errors.business = 'Please enter your business name.';
  if (!lead.phone || !looksLikePhone(lead.phone))
    errors.phone = 'Please enter a number we can reach you on.';
  if (!lead.service) errors.service = 'Please choose a service.';
  // Required on the project form only: the website review form collects a
  // URL instead of a brief and never renders this field.
  if (clean(body.form_type, 20) !== 'audit' && !lead.message)
    errors.message = 'Please tell us a little about the project.';
  if (!looksLikeEmail(lead.email)) errors.email = 'That email address does not look right.';
  // A form-encoded checkbox arrives as "on", not "true".
  if (body.consent !== true && body.consent !== 'true' && body.consent !== 'on')
    errors.consent = 'Please confirm we may contact you.';

  if (Object.keys(errors).length) {
    return asHtml
      ? htmlReply(res, 400, 'Please check the form',
          Object.values(errors).join(' '),
          'Go back to correct it, or reach us directly using the options below.')
      : res.status(400).json({ ok: false, errors });
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

  // Deliberately non-identifying. Writing the lead itself here would make a
  // failed delivery recoverable from the logs, but it would also put a name,
  // phone number and email into a log store that outlives the enquiry and that
  // nobody consented to -- test-lead.mjs guards against exactly that. The
  // enquiry is kept recoverable instead by handing it back to the person who
  // owns it: see whatsappHandoff below.
  console.log('[lead] received', JSON.stringify({
    service: lead.service || 'unspecified',
    page: meta.page || '/',
    received: meta.received,
    ip: meta.ip
  }));

  const resendKey = process.env.RESEND_API_KEY;
  if (!resendKey) {
    console.error('[lead] RESEND_API_KEY is not configured. The enquiry above was captured in this log and nowhere else.');
    const undelivered = 'We have your enquiry, but our email system is not responding. Please also send it on WhatsApp or call us so we can reply today.';
    return asHtml
      ? htmlReply(res, 503, 'We have your enquiry', undelivered)
      : res.status(503).json({ ok: false, error: undelivered });
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
      console.error('[lead] resend failed — the enquiry above is captured in this log only', r.status, text);
      return undelivered(res, asHtml, lead);
    }
    // recorded stays false on purpose: this site has no store, so the enquiry
    // was emailed, not saved. main.js reads this flag to choose which
    // confirmation to show, and telling a customer their enquiry "has been
    // saved" when no store exists would be untrue.
    return asHtml
      ? htmlReply(res, 200, 'Thank you — your enquiry is on its way',
          'We have received your enquiry and it has been delivered to the MUCO LABS team.',
          'We will review your requirement and contact you about the next step.')
      : res.status(200).json({ ok: true, recorded: false, emailed: true });
  } catch (err) {
    console.error('[lead] resend threw — the enquiry above is captured in this log only', err && err.message);
    return undelivered(res, asHtml, lead);
  }
}

// With no database and no second mail provider, a failed send would simply lose
// the enquiry -- and the obvious fix, logging it, would park personal data in a
// log store instead. So hand it back to the one party who already has it and is
// entitled to it: the customer. This builds a WhatsApp link with their own
// enquiry prefilled, so recovering it is one tap rather than retyping.
function whatsappHandoff(lead) {
  const lines = [
    'Hello MUCO LABS, my enquiry did not go through on the website.',
    '',
    'Name: ' + lead.name,
    'Business: ' + lead.business,
    'Phone: ' + lead.phone
  ];
  if (lead.email) lines.push('Email: ' + lead.email);
  if (lead.service) lines.push('Service: ' + lead.service);
  if (lead.website) lines.push('Website: ' + lead.website);
  if (lead.budget) lines.push('Budget: ' + lead.budget);
  if (lead.timeline) lines.push('Timeline: ' + lead.timeline);
  if (lead.message) lines.push('', lead.message);
  // wa.me truncates very long links, and a truncated message is worse than a
  // short one, so keep the whole thing inside a safe URL length.
  return 'https://wa.me/916381809844?text=' + encodeURIComponent(lines.join('\n').slice(0, 1200));
}

// Delivery failed. Never tell the customer their enquiry was lost -- give them a
// channel that is working, carrying what they already typed.
function undelivered(res, asHtml, lead) {
  const message = 'Your enquiry reached us but our email system is not responding, so we may not see it. Send it on WhatsApp instead — everything you typed is already filled in.';
  const handoff = whatsappHandoff(lead);
  return asHtml
    ? htmlReply(res, 502, 'One more tap and we have it', message, null, handoff)
    : res.status(502).json({ ok: false, error: message, whatsapp: handoff });
}
