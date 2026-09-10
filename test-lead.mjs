/**
 * Contract tests for POST /api/lead.
 *
 *   node test-lead.mjs
 *
 * No network and no mail send: RESEND_API_KEY is left unset, which is the path
 * where the lead is still accepted and written to the function log. Each case
 * uses its own IP, because the endpoint rate-limits per address and reusing one
 * would make later cases fail for the wrong reason.
 */
import handler from './api/lead.js';

let ipCounter = 0;
const nextIp = () => `10.0.${Math.floor(ipCounter / 250)}.${(ipCounter++ % 250) + 1}`;

function fakeRes() {
  const r = { code: 0, body: null, headers: {} };
  r.status = (c) => ((r.code = c), r);
  r.json = (b) => ((r.body = b), r);
  r.setHeader = (k, v) => void (r.headers[k] = v);
  r.end = () => r;
  return r;
}

const call = (body, { method = 'POST', ip = nextIp() } = {}) =>
  handler({ method, body, headers: { 'x-forwarded-for': ip } }, fakeRes());

const valid = {
  name: 'Test Person',
  phone: '+91 9876543210',
  message: 'We run a textile unit in Erode and want to track jobwork.',
  consent: true
};

let pass = 0;
const failures = [];

async function check(label, fn) {
  try {
    await fn();
    pass++;
    console.log('  ok    ' + label);
  } catch (e) {
    failures.push(label);
    console.log('  FAIL  ' + label + ' - ' + e.message);
  }
}

const eq = (got, want, what) => {
  if (got !== want) {
    throw new Error(`${what}: got ${JSON.stringify(got)}, want ${JSON.stringify(want)}`);
  }
};

// The endpoint logs every accepted lead. Capture it instead of printing it, so
// the results stay readable and the log line itself can be asserted on.
const realLog = console.log;
let captured = '';
function capture() {
  captured = '';
  console.log = (...a) => { captured += a.join(' '); };
}
function release() {
  console.log = realLog;
  return captured;
}
const quiet = (fn) => async () => {
  capture();
  try {
    return await fn();
  } finally {
    release();
  }
};

console.log('POST /api/lead\n');

await check('rejects any method but POST', quiet(async () => {
  const r = await call(valid, { method: 'GET' });
  eq(r.code, 405, 'status');
  eq(r.headers.Allow, 'POST', 'Allow header');
}));

await check('rejects a complete enquiry when no delivery path accepts it', quiet(async () => {
  const r = await call(valid);
  eq(r.code, 503, 'status');
  eq(r.body.ok, false, 'ok');
  eq(r.body.recorded, false, 'recorded');
  eq(r.body.emailed, false, 'emailed, with no key configured');
}));

for (const field of ['name', 'phone', 'message']) {
  await check(`rejects a missing ${field}`, quiet(async () => {
    const r = await call({ ...valid, [field]: '' });
    eq(r.code, 400, 'status');
    eq(typeof r.body.errors[field], 'string', `${field} error message`);
  }));
}

await check('rejects a phone with too few digits', quiet(async () => {
  eq((await call({ ...valid, phone: '12345' })).code, 400, 'status');
}));

await check('rejects a malformed email', quiet(async () => {
  eq((await call({ ...valid, email: 'not-an-address' })).code, 400, 'status');
}));

await check('accepts an omitted email', quiet(async () => {
  eq((await call({ ...valid, email: '' })).code, 503, 'status');
}));

await check('rejects a missing consent', quiet(async () => {
  eq((await call({ ...valid, consent: false })).code, 400, 'status');
}));

await check('accepts consent sent as the string "true"', quiet(async () => {
  eq((await call({ ...valid, consent: 'true' })).code, 503, 'status');
}));

await check('rejects a null body', quiet(async () => {
  eq((await call(null)).code, 400, 'status');
}));

await check('rejects a non-JSON string body', quiet(async () => {
  eq((await call('this is not json')).code, 400, 'status');
}));

await check('parses a JSON string body', quiet(async () => {
  eq((await call(JSON.stringify(valid))).code, 503, 'status');
}));

await check('answers the honeypot with a silent 200', quiet(async () => {
  const r = await call({ ...valid, company_website: 'http://spam.example' });
  eq(r.code, 200, 'status');
  eq(r.body.emailed, undefined, 'the lead was not processed');
}));

await check('truncates an oversized field rather than rejecting it', async () => {
  // Someone who writes an essay should not be told off; the field is capped.
  capture();
  const r = await call({ ...valid, message: 'x'.repeat(20000) });
  const logged = release();
  eq(r.code, 503, 'status');
  if (!logged.includes('[lead] received')) throw new Error('operational receipt log missing');
});

await check('strips control characters, so a field cannot forge a mail header', async () => {
  const injected = 'Test Person' + String.fromCharCode(13, 10) + 'Bcc: attacker@example.com';
  capture();
  await call({ ...valid, name: injected });
  const logged = release();
  if (logged.includes('Bcc: attacker@example.com')) throw new Error('PII escaped into logs');
});

await check('rate-limits a flood from one address', quiet(async () => {
  const ip = '203.0.113.9';
  let last = 0;
  for (let i = 0; i < 6; i++) last = (await call(valid, { ip })).code;
  eq(last, 429, 'status on the sixth post inside a minute');
}));

const realFetch = global.fetch;
function restoreMocks() {
  global.fetch = realFetch;
  delete process.env.NEXT_PUBLIC_SUPABASE_URL;
  delete process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
  delete process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
}
function mockOkFetch() {
  global.fetch = async () => ({ ok: true, status: 200, text: async () => '' });
}
function mockFailFetch() {
  global.fetch = async () => ({ ok: false, status: 503, text: async () => 'service unavailable' });
}

await check('records the enquiry when CRM ingestion succeeds', async () => {
  try {
    process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://test.supabase.co';
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY = 'test-publishable-key-12345';
    mockOkFetch();
    capture();
    const r = await call(valid);
    const logged = release();
    eq(r.code, 200, 'status');
    eq(r.body.ok, true, 'ok');
    eq(r.body.recorded, true, 'recorded');
    eq(r.body.emailed, false, 'emailed, with no Resend key configured');
    if (logged.includes('test-publishable-key-12345')) {
      throw new Error('Supabase key leaked to function logs');
    }
    if (JSON.stringify(r.body).includes('test-publishable-key-12345')) {
      throw new Error('Supabase key leaked to response body');
    }
  } finally {
    restoreMocks();
  }
});

await check('wraps enquiry data in the named RPC payload argument', async () => {
  try {
    process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://test.supabase.co';
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY = 'test-publishable-key-12345';
    let sent;
    global.fetch = async (_url, options) => {
      sent = JSON.parse(options.body);
      return { ok: true, status: 200, text: async () => '' };
    };
    await call(valid);
    eq(typeof sent.payload, 'object', 'named payload argument');
    eq(sent.payload.name, valid.name, 'lead name');
    eq(sent.payload.message, valid.message, 'lead message');
  } finally {
    restoreMocks();
  }
});

await check('reports a durable delivery failure when CRM ingestion fails', async () => {
  try {
    process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://test.supabase.co';
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY = 'test-publishable-key-12345';
    mockFailFetch();
    const r = await call(valid);
    eq(r.code, 503, 'status');
    eq(r.body.ok, false, 'ok');
    eq(r.body.recorded, false, 'recorded is false when CRM ingestion fails');
    eq(r.body.emailed, false, 'emailed, with no Resend key configured');
  } finally {
    restoreMocks();
  }
});

await check('does not send the Supabase key to the browser on failed validation', async () => {
  try {
    process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://test.supabase.co';
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY = 'test-publishable-key-12345';
    mockOkFetch();
    const r = await call({ ...valid, name: '' });
    eq(r.code, 400, 'status');
    if (JSON.stringify(r.body).includes('test-publishable-key-12345')) {
      throw new Error('Supabase key leaked in validation error response');
    }
  } finally {
    restoreMocks();
  }
});

console.log(`\n${pass} passed, ${failures.length} failed`);
process.exit(failures.length ? 1 : 0);
