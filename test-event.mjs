/**
 * Contract tests for POST /api/event.
 *
 *   node test-event.mjs
 *
 * The endpoint is intentionally a no-op because the public website does not
 * use a first-party analytics database.
 */
import handler from './api/event.js';

function fakeRes() {
  const r = { code: 0, body: null, headers: {} };
  r.status = (c) => ((r.code = c), r);
  r.json = (b) => ((r.body = b), r);
  r.setHeader = (k, v) => void (r.headers[k] = v);
  r.end = () => r;
  return r;
}

const call = (body, { method = 'POST' } = {}) =>
  handler({ method, body, headers: {} }, fakeRes());

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

console.log('POST /api/event\n');

await check('rejects any method but POST', async () => {
  const r = await call({}, { method: 'GET' });
  eq(r.code, 405, 'status');
  eq(r.headers.Allow, 'POST', 'Allow header');
});

await check('returns a no-op success for any valid POST', async () => {
  const r = await call({ event_name: 'page_view' });
  eq(r.code, 200, 'status');
  eq(r.body.ok, true, 'ok');
  eq(r.body.recorded, false, 'recorded is false because no database is used');
});

await check('returns a no-op success even for unexpected payloads', async () => {
  const r = await call({ any: 'payload' });
  eq(r.code, 200, 'status');
  eq(r.body.ok, true, 'ok');
});

console.log(`\n${pass} passed, ${failures.length} failed`);
process.exit(failures.length ? 1 : 0);
