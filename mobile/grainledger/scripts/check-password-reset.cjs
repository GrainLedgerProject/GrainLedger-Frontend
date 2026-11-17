/* Local fixtures only. Never consumes a real OTP or changes a real account's password. */
const assert = require('node:assert/strict');
const path = require('node:path');
const { createAuthClient, memoryStorage, load } = require('./check-auth.cjs');
const { createPasswordReset, resetPasswordErrors } = load(path.join(__dirname, '../src/features/auth/password-reset.ts'));
const { ApiError } = load(path.join(__dirname, '../src/services/api/errors.ts'));
const input = () => ({ email: ' Person@Company.test ', otp: ' 00-A7 ', newPassword: '  Exact password!  ' });
const json = (body, status = 200) => new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } });
const deferred = () => { let resolve; const promise = new Promise((done) => { resolve = done; }); return { promise, resolve }; };
function setup(handler) {
  const calls = []; const storage = memoryStorage();
  const client = createAuthClient({ origin: 'https://auth.example.test', storage, fetcher: async (source, init) => {
    const request = source instanceof Request ? source : new Request(source, init);
    assert.equal(request.credentials, 'omit'); assert.equal(request.headers.get('Cookie'), null);
    const call = { path: new URL(request.url).pathname, method: request.method, headers: request.headers,
      body: request.body === null ? undefined : JSON.parse(await request.text()) };
    calls.push(call); return handler(call);
  } });
  return { client, storage, calls };
}
let passed = 0;
async function test(name, run) { await run(); passed++; console.log(`PASS ${name}`); }
async function run() {
  await test('blank/invalid fields do not send HTTP; reset-specific policy is left to the server', async () => {
    const { client, calls } = setup(() => new Response(null, { status: 204 }));
    for (const invalid of [{ ...input(), email: '' }, { ...input(), email: 'wrong' }, { ...input(), otp: ' ' }, { ...input(), newPassword: '' }]) {
      assert.ok(Object.keys(resetPasswordErrors(invalid)).length);
      await assert.rejects(client.resetPassword(invalid), { code: 'auth' });
    }
    assert.equal(calls.length, 0);
    assert.equal(Object.keys(resetPasswordErrors({ email: 'Admin@localhost', otp: 'X', newPassword: 'x' })).length, 0,
      'Do not assume OTP length/numeric format or copy invitation/change-password policy into reset.');
  });
  await test('exact source POST contract trims only email and never sends a bearer/cookie', async () => {
    const { client, calls } = setup(() => new Response(null, { status: 204 }));
    assert.equal(await client.resetPassword({ ...input(), unexpected: 'not on wire' }), undefined);
    assert.equal(calls[0].path, '/api/auth/reset-password'); assert.equal(calls[0].method, 'POST');
    assert.deepEqual(calls[0].body, { email: 'Person@Company.test', otp: ' 00-A7 ', newPassword: '  Exact password!  ' });
    assert.equal(calls[0].headers.get('Authorization'), null);
    assert.match(calls[0].headers.get('Content-Type'), /application\/json/);
  });
  await test('void success permits empty 200/202/204; incidental JSON never becomes a session grant', async () => {
    for (const status of [200, 202, 204]) {
      const { client } = setup(() => new Response(null, { status }));
      const operation = createPasswordReset(client.resetPassword); await operation.submit(input());
      assert.equal(operation.getSnapshot().status, 'success');
      assert.deepEqual(Object.keys(operation.getSnapshot()), ['status']);
    }
    const { client, storage } = setup(() => json({ accessToken: 'ignored', user: 'not a login response' }));
    await client.initialize(); await client.resetPassword(input());
    assert.equal(client.getSnapshot().status, 'anonymous'); assert.equal(storage.value(), null);
  });
  await test('HTTP and HTML/malformed JSON failures cannot produce success or automatic retries', async () => {
    for (const status of [400, 401, 403, 404, 422, 429, 500]) {
      const { client, calls } = setup(() => json({ detail: 'Private account/OTP information' }, status));
      const operation = createPasswordReset(client.resetPassword); await operation.submit(input());
      assert.equal(operation.getSnapshot().status, 'error');
      assert.equal(operation.getSnapshot().reason, status === 429 ? 'rate-limit' : 'request');
      assert.equal(JSON.stringify(operation.getSnapshot()).includes('Private'), false); assert.equal(calls.length, 1);
    }
    for (const [body, type] of [['<html>fallback</html>', 'text/html'], ['{bad', 'application/json']]) {
      const { client } = setup(() => new Response(body, { headers: { 'Content-Type': type } }));
      await assert.rejects(client.resetPassword(input()), { code: 'contract' });
    }
  });
  await test('successful/failed public reset leaves an existing session and stored refresh credential unchanged', async () => {
    const accessToken = `e30.${Buffer.from(JSON.stringify({ exp: Math.floor(Date.now() / 1000) + 3600 })).toString('base64url')}.fixture`;
    const user = { id: 'fixture', email: 'person@example.test', displayName: 'Fixture', phoneNumber: null, role: 'MillManager',
      organizationId: 'org', organizationName: 'Fixture', isActive: true, permissions: [] };
    let reject = false;
    const { client, calls, storage } = setup(({ path: endpoint, headers }) => {
      if (endpoint === '/api/auth/login') return json({ accessToken, refreshToken: 'fixture-refresh', tokenType: 'Bearer', expiresIn: 3600, user });
      assert.equal(endpoint, '/api/auth/reset-password'); assert.equal(headers.get('Authorization'), null);
      return reject ? json({ detail: 'Rejected' }, 401) : new Response(null, { status: 204 });
    });
    await client.initialize(); await client.login(user.email, 'fixture-password', true);
    const snapshot = client.getSnapshot(); const saved = storage.value();
    await client.resetPassword(input()); reject = true;
    await assert.rejects(client.resetPassword(input()), { status: 401 });
    assert.equal(client.getSnapshot(), snapshot); assert.equal(storage.value(), saved);
    assert.deepEqual(calls.map((call) => call.path), ['/api/auth/login', '/api/auth/reset-password', '/api/auth/reset-password']);
  });
  await test('invalid and pending states contain no secrets; duplicate taps coalesce with a copied payload', async () => {
    const gate = deferred(); let count = 0; let sent;
    const operation = createPasswordReset(async (body) => { count++; sent = body; await gate.promise; });
    await operation.submit({ email: '', otp: '', newPassword: '' });
    assert.equal(operation.getSnapshot().status, 'invalid');
    assert.deepEqual(Object.keys(operation.getSnapshot().errors).sort(), ['email', 'newPassword', 'otp']);
    const mutable = input(); const task = operation.submit(mutable); mutable.otp = 'changed'; mutable.newPassword = 'changed';
    assert.equal(task, operation.submit(input())); assert.equal(operation.getSnapshot().status, 'loading');
    await Promise.resolve(); assert.equal(count, 1); assert.equal(sent.otp, ' 00-A7 '); assert.equal(sent.newPassword, input().newPassword);
    assert.deepEqual(Object.keys(operation.getSnapshot()), ['status']);
    gate.resolve(); await task; await operation.submit(input()); assert.equal(count, 1);
  });
  await test('manual retry, safe error categories and synchronous failure do not leave stuck pending state', async () => {
    for (const code of ['configuration', 'network', 'timeout', 'unknown']) {
      let count = 0;
      const operation = createPasswordReset(() => { if (++count === 1) throw new ApiError('Secret', 0, code, { detail: input().newPassword }); return Promise.resolve(); });
      await operation.submit(input()); assert.equal(count, 1);
      assert.equal(operation.getSnapshot().reason, code === 'unknown' ? 'request' : code);
      assert.equal(JSON.stringify(operation.getSnapshot()).includes(input().newPassword), false);
      await operation.submit(input()); assert.equal(count, 2); assert.equal(operation.getSnapshot().status, 'success');
    }
  });
  await test('abort and stale response cannot resurrect an abandoned operation; pre-aborted requests never send', async () => {
    const gate = deferred(); let signal; let count = 0;
    const operation = createPasswordReset(async (_, value) => { count++; if (count === 1) { signal = value; await gate.promise; } });
    const old = operation.submit(input()); await Promise.resolve(); operation.reset(); assert.equal(signal.aborted, true);
    await operation.submit(input()); gate.resolve(); await old; assert.equal(operation.getSnapshot().status, 'success');
    operation.reset(); const unsent = operation.submit(input()); operation.reset(); await unsent;
    assert.equal(count, 2); assert.equal(operation.getSnapshot().status, 'idle');
    const { client, calls } = setup(() => { throw new Error('Must not send'); });
    const controller = new AbortController(); controller.abort();
    await assert.rejects(client.resetPassword(input(), controller.signal), { code: 'cancelled' }); assert.equal(calls.length, 0);
    const cancelled = createPasswordReset(async () => { throw new ApiError('Cancelled', 0, 'cancelled'); });
    await cancelled.submit(input()); assert.equal(cancelled.getSnapshot().status, 'idle');
  });
  console.log(`PASS: ${passed} password reset groups. Live OTP/password policy, revocation and device acceptance remain unverified.`);
}
run().catch((error) => { console.error(error); process.exitCode = 1; });
