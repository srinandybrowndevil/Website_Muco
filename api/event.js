/**
 * POST /api/event — no-op analytics endpoint.
 *
 * The public website does not use a first-party analytics database.
 * Google Analytics 4 and GTM events are sent from the browser directly.
 * This endpoint accepts the legacy payload and returns 200 so existing
 * analytics.js calls fail silently without writing to a database.
 */

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ ok: false, error: 'Method not allowed' });
  }
  return res.status(200).json({ ok: true, recorded: false });
}
