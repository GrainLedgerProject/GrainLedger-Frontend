/* Source-contract fixtures only: never sends recovery email to a real account. */
const assert = require('node:assert/strict');
const path = require('node:path');
const { createAuthClient, memoryStorage, load } = require('./check-auth.cjs');
const { createPasswordRecovery, recoveryEmailError } = load(path.join(__dirname, '../src/features/auth/password-recovery.ts'));
const { ApiError } = load(path.join(__dirname, '../src/services/api/errors.ts'));
const json = (body, status = 200) => new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } });
const deferred = () => { let resolve; const promise = new Promise((done) => { resolve = done; }); return { promise, resolve }; };
function setup(handler) {
  const calls = [];
  const storage = memoryStorage();
  const client = createAuthClient({ origin: 'https://auth.example.test', storage, fetcher: async (input, init) => {
    const request = input instanceof Request ? input : new Request(input, init);
    assert.equal(request.credentials, 'omit');
    assert.equal(request.headers.get('Cookie'), null);
    const call = { path: new URL(request.url).pathname, method: request.method, headers: request.headers,
      body: request.body === null ? undefined : JSON.parse(await request.text()) };
    calls.push(call);
    return handler(call);
  } });
  return { client, storage, calls };
}
let passed = 0;
async function test(name, run) { await run(); passed++; console.log(`PASS ${name}`); }
async function run() {
  await test('required HTML email rules and source trim/case semantics', async () => {
    for (const email of ['', '  ']) assert.equal(recoveryEmailError(email), 'required');
    for (const email of ['plain', '@domain.test', 'a b@domain.test', 'a@-domain.test']) assert.equal(recoveryEmailError(email), 'format');
    for (const email of ['Admin@localhost', '  First.Last+tag@Company.test  ']) assert.equal(recoveryEmailError(email), undefined);
    const { client, calls } = setup(() => new Response(null, { status: 204 }));
    for (const email of ['', 'bad']) await assert.rejects(client.forgotPassword({ email }), { code: 'auth' });
    assert.equal(calls.length, 0);
    await client.forgotPassword({ email: '  First.Last+tag@Company.test  ' });
    assert.equal(calls[0].path, '/api/auth/forgot-password');
    assert.equal(calls[0].method, 'POST');
    assert.deepEqual(calls[0].body, { email: 'First.Last+tag@Company.test' });
    assert.equal(calls[0].headers.get('Authorization'), null);
    assert.match(calls[0].headers.get('Content-Type'), /application\/json/);
  });
  await test('empty 200/202/204 accepted responses need no invented payload', async () => {
    for (const status of [200, 202, 204]) {
      const { client } = setup(() => new Response(null, { status }));
      assert.equal(await client.forgotPassword({ email: 'person@example.test' }), undefined);
    }
    for (const body of [{ exists: true }, { exists: false }, { anything: 'ignored' }]) {
      const { client } = setup(() => json(body));
      const operation = createPasswordRecovery(client.forgotPassword);
      await operation.submit('person@example.test');
      assert.equal(operation.getSnapshot().status, 'success');
      assert.deepEqual(Object.keys(operation.getSnapshot()).sort(), ['status', 'submittedEmail']);
    }
  });
  await test('HTTP failures and HTML fallback never become accepted success or refresh retries', async () => {
    for (const status of [400, 401, 403, 404, 429, 500]) {
      const { client, calls } = setup(() => json({ detail: 'Account existence must not be rendered' }, status));
      const operation = createPasswordRecovery(client.forgotPassword);
      await operation.submit('person@example.test');
      assert.equal(operation.getSnapshot().status, 'error');
      assert.equal(operation.getSnapshot().reason, status === 429 ? 'rate-limit' : 'request');
      assert.equal(JSON.stringify(operation.getSnapshot()).includes('existence'), false);
      assert.equal(calls.length, 1);
    }
    const { client } = setup(() => new Response('<html>fallback</html>', { headers: { 'Content-Type': 'text/html' } }));
    await assert.rejects(client.forgotPassword({ email: 'person@example.test' }), { code: 'contract' });
  });
  await test('anonymous recovery does not change an existing session or persisted refresh credential', async () => {
    const accessToken = `e30.${Buffer.from(JSON.stringify({ exp: Math.floor(Date.now() / 1000) + 3600 })).toString('base64url')}.fixture`;
    const user = { id: 'fixture', email: 'person@example.test', displayName: 'Fixture', phoneNumber: null, role: 'MillManager',
      organizationId: 'org', organizationName: 'Fixture', isActive: true, permissions: [] };
    const { client, calls, storage } = setup(({ path: endpoint, headers }) => {
      if (endpoint === '/api/auth/login') return json({ accessToken, refreshToken: 'fixture-refresh', tokenType: 'Bearer', expiresIn: 3600, user });
      assert.equal(endpoint, '/api/auth/forgot-password');
      assert.equal(headers.get('Authorization'), null);
      return json({ detail: 'Unauthorized' }, 401);
    });
    await client.initialize(); await client.login(user.email, 'fixture-password', true);
    const session = client.getSnapshot(); const persisted = storage.value();
    await assert.rejects(client.forgotPassword({ email: user.email }), { status: 401 });
    assert.equal(client.getSnapshot(), session); assert.equal(storage.value(), persisted);
    assert.deepEqual(calls.map((call) => call.path), ['/api/auth/login', '/api/auth/forgot-password']);
  });
  await test('invalid/empty state makes no request; pending submissions coalesce and retain submitted email', async () => {
    const gate = deferred(); let count = 0; let submitted;
    const operation = createPasswordRecovery(async (body) => { count++; submitted = body.email; await gate.promise; });
    assert.equal(operation.getSnapshot().status, 'idle');
    await operation.submit(''); assert.equal(operation.getSnapshot().fieldError, 'required');
    await operation.submit('wrong'); assert.equal(operation.getSnapshot().fieldError, 'format'); assert.equal(count, 0);
    const first = operation.submit(' First@Company.test '); const duplicate = operation.submit('other@company.test');
    assert.equal(first, duplicate); assert.equal(operation.getSnapshot().status, 'loading');
    await Promise.resolve(); assert.equal(count, 1); assert.equal(submitted, 'First@Company.test');
    gate.resolve(); await first;
    assert.equal(operation.getSnapshot().submittedEmail, 'First@Company.test');
    await operation.submit('other@company.test'); assert.equal(count, 1);
  });
  await test('errors expose safe categories only, permit explicit retry and never retry automatically', async () => {
    for (const code of ['configuration', 'network', 'timeout', 'unknown']) {
      let count = 0;
      const operation = createPasswordRecovery(async () => { if (++count === 1) throw new ApiError('Private account detail', 0, code, { detail: 'Secret' }); });
      await operation.submit('person@example.test');
      assert.equal(operation.getSnapshot().reason, code === 'unknown' ? 'request' : code);
      assert.equal(JSON.stringify(operation.getSnapshot()).includes('Secret'), false); assert.equal(count, 1);
      await operation.submit('person@example.test'); assert.equal(count, 2); assert.equal(operation.getSnapshot().status, 'success');
    }
  });
  await test('synchronous failure is caught without leaving a stuck pending promise', async () => {
    let count = 0;
    const operation = createPasswordRecovery(() => { count++; throw new Error('Do not render this'); });
    await operation.submit('person@example.test'); await operation.submit('person@example.test');
    assert.equal(count, 2); assert.equal(operation.getSnapshot().status, 'error');
  });
  await test('leaving aborts in-flight work and stale completions cannot overwrite the next submission', async () => {
    const gate = deferred(); let signal; let count = 0;
    const operation = createPasswordRecovery(async (_, nextSignal) => { count++; if (count === 1) { signal = nextSignal; await gate.promise; } });
    const old = operation.submit('old@example.test'); await Promise.resolve();
    operation.reset(); assert.equal(signal.aborted, true); assert.equal(operation.getSnapshot().status, 'idle');
    await operation.submit('new@example.test');
    gate.resolve(); await old;
    assert.equal(operation.getSnapshot().submittedEmail, 'new@example.test');
    operation.reset(); const pending = operation.submit('unsent@example.test'); operation.reset(); await pending;
    assert.equal(count, 2); assert.equal(operation.getSnapshot().status, 'idle');
  });
  await test('explicit transport cancellation is not displayed as a server rejection', async () => {
    const operation = createPasswordRecovery(async () => { throw new ApiError('Cancelled', 0, 'cancelled'); });
    await operation.submit('person@example.test'); assert.equal(operation.getSnapshot().status, 'idle');
  });
  console.log(`PASS: ${passed} password recovery groups. Live email delivery, privacy policy and device navigation remain unverified.`);
}
run().catch((error) => { console.error(error); process.exitCode = 1; });
