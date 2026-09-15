/**
 * POST /api/event — no-op analytics endpoint.
 *
 * The public website does not use a first-party analytics database.
 * Google Analytics 4 and GTM events are sent from the browser directly.
 *
 * analytics.js no longer posts here at all. This file survives only so that a
 * tab which loaded the previous analytics.js, before the new fingerprinted URL
 * was served, does not spray 404s until it is reloaded. After one deploy cycle
 * this file, test-event.mjs and the /api/event branches in scripts/dev-site.mjs
 * can all be deleted.
 */

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ ok: false, error: 'Method not allowed' });
  }
  return res.status(200).json({ ok: true, recorded: false });
}
