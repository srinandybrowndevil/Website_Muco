/**
 * Contract tests for POST /api/event.
 *
 *   node test-event.mjs
 *
 * No network calls: Supabase RPC is mocked so we can test validation, the
 * allowlist, rate limiting and the guarantee that failures stay internal.
 */
import handler from './api/event.js';

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
  event_name: 'page_view',
  path: '/contact',
  session_id: 'aaaaaaaa-aaaa-4aaa-aaaa-aaaaaaaaaaaa'
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

console.log('POST /api/event\n');

await check('rejects any method but POST', async () => {
  const r = await call(valid, { method: 'GET' });
  eq(r.code, 405, 'status');
  eq(r.headers.Allow, 'POST', 'Allow header');
});

await check('records an allowlisted event when Supabase RPC succeeds', async () => {
  try {
    process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://test.supabase.co';
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY = 'test-publishable-key-12345';
    mockOkFetch();
    const r = await call(valid);
    eq(r.code, 200, 'status');
    eq(r.body.ok, true, 'ok');
    eq(r.body.recorded, true, 'recorded');
  } finally {
    restoreMocks();
  }
});

await check('returns a soft failure when Supabase RPC fails', async () => {
  try {
    process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://test.supabase.co';
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY = 'test-publishable-key-12345';
    mockFailFetch();
    const r = await call(valid);
    eq(r.code, 200, 'status');
    eq(r.body.ok, false, 'ok is false');
    eq(r.body.recorded, false, 'recorded is false');
  } finally {
    restoreMocks();
  }
});

await check('rejects an event not on the allowlist', async () => {
  const r = await call({ ...valid, event_name: 'custom_event' });
  eq(r.code, 400, 'status');
});

await check('rejects a missing event name', async () => {
  const r = await call({ path: '/' });
  eq(r.code, 400, 'status');
});

await check('rejects a non-JSON string body', async () => {
  const r = await call('this is not json');
  eq(r.code, 400, 'status');
});

await check('rejects a null body', async () => {
  const r = await call(null);
  eq(r.code, 400, 'status');
});

await check('rate-limits a flood from one address', async () => {
  const ip = '203.0.113.20';
  let last = 0;
  for (let i = 0; i < 31; i++) last = (await call(valid, { ip })).code;
  eq(last, 429, 'status on the 31st event inside a minute');
});

await check('wraps event data in the named RPC payload argument', async () => {
  try {
    process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://test.supabase.co';
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY = 'test-publishable-key-12345';
    let sent;
    global.fetch = async (_url, options) => {
      sent = JSON.parse(options.body);
      return { ok: true, status: 200, text: async () => '' };
    };
    await call({ ...valid, referrer: 'https://example.com/source' });
    eq(typeof sent.payload, 'object', 'named payload argument');
    eq(sent.payload.event_name, 'page_view', 'event name');
    eq(sent.payload.referrer_host, 'example.com', 'referrer host');
  } finally {
    restoreMocks();
  }
});

await check('does not leak the Supabase key in the response or logs', async () => {
  try {
    process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://test.supabase.co';
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY = 'test-publishable-key-12345';
    mockOkFetch();
    const r = await call(valid);
    eq(r.code, 200, 'status');
    const body = JSON.stringify(r.body);
    if (body.includes('test-publishable-key-12345')) {
      throw new Error('Supabase key leaked to response body');
    }
  } finally {
    restoreMocks();
  }
});

console.log(`\n${pass} passed, ${failures.length} failed`);
process.exit(failures.length ? 1 : 0);
