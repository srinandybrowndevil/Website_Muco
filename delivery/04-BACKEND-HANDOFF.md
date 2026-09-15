# Station 4 — Backend Handoff (Loop 3)

**Date:** 15 September 2026

## API endpoints

- `api/lead.js` — `POST /api/lead`
  - Validates name, business, phone, service, email and consent server-side.
  - Cleans control characters and bounds field lengths.
  - Honeypot field silently rejects bots with HTTP 200.
  - Best-effort per-IP rate limiting in memory.
  - Sends email through Resend when `RESEND_API_KEY` is configured.
  - Returns `{ok: true, recorded: true, emailed: true}` on success or `{ok: false, error: ...}` / `{ok: false, errors: {...}}` on failure.
  - No database write.

- `api/event.js` — `POST /api/event`
  - Accepts any POST and returns `{ok: true, recorded: false}`.
  - No database, no Supabase, no persistent storage.

## Environment variables

- `RESEND_API_KEY`
- `LEAD_TO_EMAIL` (default `founder@mucolabs.com`)
- `LEAD_FROM_EMAIL` (verified Resend sender)

## Security boundaries

- Server-side validation is the authority; browser validation is a courtesy.
- Email credentials are read from environment variables only.
- No secret is logged or returned to the browser.
- Control characters are stripped to prevent log and header injection.
- Rate limiting is per-instance, suitable for current traffic.

## Deployment requirements

Add the three Resend variables in Vercel. No database migration or auth callback is needed.
