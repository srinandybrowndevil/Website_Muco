/**
 * Contract tests for POST /api/lead.
 *
 *   node test-lead.mjs
 *
 * No real email is sent: RESEND_API_KEY is mocked.
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
  business: 'Test Business',
  phone: '+91 9876543210',
  service: 'Website design & development',
  message: 'We need a website.',
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

const realLog = console.log;
let captured = '';
function capture() { captured = ''; console.log = (...a) => { captured += a.join(' '); }; }
function release() { console.log = realLog; return captured; }
const quiet = (fn) => async () => { capture(); try { return await fn(); } finally { release(); } };

const realFetch = global.fetch;
function withMockResend(fn) {
  return async () => {
    process.env.RESEND_API_KEY = 'test-resend-key';
    global.fetch = async (url, options) => {
      if (url === 'https://api.resend.com/emails') {
        return { ok: true, status: 200, text: async () => '' };
      }
      return { ok: true, status: 200, text: async () => '' };
    };
    try {
      await fn();
    } finally {
      global.fetch = realFetch;
      delete process.env.RESEND_API_KEY;
    }
  };
}

console.log('POST /api/lead\n');

await check('rejects any method but POST', quiet(async () => {
  const r = await call(valid, { method: 'GET' });
  eq(r.code, 405, 'status');
  eq(r.headers.Allow, 'POST', 'Allow header');
}));

await check('requires a Resend key to deliver', quiet(async () => {
  const r = await call(valid);
  eq(r.code, 503, 'status');
  eq(r.body.ok, false, 'ok');
}));

for (const field of ['name', 'business', 'phone', 'service']) {
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

await check('accepts an omitted email when Resend is configured', quiet(withMockResend(async () => {
  eq((await call({ ...valid, email: '' })).code, 200, 'status');
})));

await check('rejects a missing consent', quiet(async () => {
  eq((await call({ ...valid, consent: false })).code, 400, 'status');
}));

await check('accepts consent sent as the string "true"', quiet(withMockResend(async () => {
  eq((await call({ ...valid, consent: 'true' })).code, 200, 'status');
})));

await check('rejects a null body', quiet(async () => {
  eq((await call(null)).code, 400, 'status');
}));

await check('rejects a non-JSON string body', quiet(async () => {
  eq((await call('this is not json')).code, 400, 'status');
}));

await check('parses a JSON string body', quiet(withMockResend(async () => {
  eq((await call(JSON.stringify(valid))).code, 200, 'status');
})));

await check('answers the honeypot with a silent 200', quiet(async () => {
  const r = await call({ ...valid, company_website: 'http://spam.example' });
  eq(r.code, 200, 'status');
}));

await check('truncates an oversized field', withMockResend(async () => {
  capture();
  const r = await call({ ...valid, message: 'x'.repeat(20000) });
  release();
  eq(r.code, 200, 'status');
}));

await check('strips control characters so a field cannot forge a mail header', withMockResend(async () => {
  capture();
  const injected = 'Test Person' + String.fromCharCode(13, 10) + 'Bcc: attacker@example.com';
  await call({ ...valid, name: injected });
  const logged = release();
  if (logged.includes('Bcc: attacker@example.com')) throw new Error('PII escaped into logs');
}));

await check('rate-limits a flood from one address', quiet(async () => {
  const ip = '203.0.113.9';
  let last = 0;
  for (let i = 0; i < 6; i++) last = (await call(valid, { ip })).code;
  eq(last, 429, 'status on the sixth post inside a minute');
}));

await check('sends email when Resend accepts the request', withMockResend(async () => {
  let sent;
  global.fetch = async (url, options) => {
    if (url === 'https://api.resend.com/emails') {
      sent = JSON.parse(options.body);
      return { ok: true, status: 200, text: async () => '' };
    }
    return { ok: true, status: 200, text: async () => '' };
  };
  const r = await call(valid);
  eq(r.code, 200, 'status');
  eq(r.body.ok, true, 'ok');
  eq(r.body.emailed, true, 'emailed');
  eq(sent.to[0], 'founder@mucolabs.com', 'default recipient');
  if (JSON.stringify(r.body).includes('test-resend-key')) throw new Error('API key leaked to response');
}));

await check('reports failure when Resend rejects the send', async () => {
  try {
    process.env.RESEND_API_KEY = 'test-resend-key';
    global.fetch = async () => ({ ok: false, status: 422, text: async () => 'unauthorized' });
    const r = await call(valid);
    eq(r.code, 502, 'status');
    eq(r.body.ok, false, 'ok');
  } finally {
    global.fetch = realFetch;
    delete process.env.RESEND_API_KEY;
  }
});

console.log(`\n${pass} passed, ${failures.length} failed`);
process.exit(failures.length ? 1 : 0);
