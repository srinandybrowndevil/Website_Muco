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

await check('accepts a complete enquiry', quiet(async () => {
  const r = await call(valid);
  eq(r.code, 200, 'status');
  eq(r.body.ok, true, 'ok');
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
  eq((await call({ ...valid, email: '' })).code, 200, 'status');
}));

await check('rejects a missing consent', quiet(async () => {
  eq((await call({ ...valid, consent: false })).code, 400, 'status');
}));

await check('accepts consent sent as the string "true"', quiet(async () => {
  eq((await call({ ...valid, consent: 'true' })).code, 200, 'status');
}));

await check('rejects a null body', quiet(async () => {
  eq((await call(null)).code, 400, 'status');
}));

await check('rejects a non-JSON string body', quiet(async () => {
  eq((await call('this is not json')).code, 400, 'status');
}));

await check('parses a JSON string body', quiet(async () => {
  eq((await call(JSON.stringify(valid))).code, 200, 'status');
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
  eq(r.code, 200, 'status');
  eq(JSON.parse(logged.replace('[lead] ', '')).message.length, 4000, 'stored message length');
});

await check('strips control characters, so a field cannot forge a mail header', async () => {
  const injected = 'Test Person' + String.fromCharCode(13, 10) + 'Bcc: attacker@example.com';
  capture();
  await call({ ...valid, name: injected });
  const logged = release();
  const name = JSON.parse(logged.replace('[lead] ', '')).name;
  const CONTROL = new RegExp('[' + String.fromCharCode(0) + '-' + String.fromCharCode(31) + String.fromCharCode(127) + ']');
  if (CONTROL.test(name)) {
    throw new Error('control characters survived: ' + JSON.stringify(name));
  }
});

await check('rate-limits a flood from one address', quiet(async () => {
  const ip = '203.0.113.9';
  let last = 0;
  for (let i = 0; i < 6; i++) last = (await call(valid, { ip })).code;
  eq(last, 429, 'status on the sixth post inside a minute');
}));

console.log(`\n${pass} passed, ${failures.length} failed`);
process.exit(failures.length ? 1 : 0);
