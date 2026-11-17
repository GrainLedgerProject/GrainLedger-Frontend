/* Contract/controller tests use fixtures only. No production fallback identities are bundled. */
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const ts = require('typescript');
const root = path.join(__dirname, '..');
const context = vm.createContext({ URL, URLSearchParams, Headers, Response, FormData, Blob, AbortController, AbortSignal,
  fetch, atob, setTimeout, clearTimeout, Error, console });
const cache = new Map();
function load(file) {
  if (cache.has(file)) return cache.get(file).exports;
  const module = { exports: {} }; cache.set(file, module);
  const source = fs.readFileSync(file, 'utf8');
  const compiled = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText;
  vm.runInContext(`(function(require,module,exports){${compiled}\n})`, context)((name) => name.startsWith('.')
    ? load(path.resolve(path.dirname(file), `${name}.ts`)) : require(name), module, module.exports);
  return module.exports;
}
const contracts = load(path.join(root, 'src/features/auth/contracts.ts'));
const { createAuthClient, normalizeOrigin } = load(path.join(root, 'src/features/auth/auth-client.ts'));
const origin = 'https://auth.example.test';
const user = { id: 'fixture-user', email: 'fixture@example.test', displayName: 'Fixture User', phoneNumber: null,
  role: 'MillManager', organizationId: 'fixture-org', organizationName: 'Fixture Organization', isActive: true, permissions: ['lots.read.facility'] };
const jwt = (version, seconds = 3600) => `${Buffer.from('{"alg":"fixture"}').toString('base64url')}.${Buffer.from(JSON.stringify({ exp: Math.floor(Date.now() / 1000) + seconds, jti: version })).toString('base64url')}.fixture-signature`;
const tokens = (version, override = {}) => ({ accessToken: jwt(version), refreshToken: `fixture-refresh-${version}`, tokenType: 'Bearer', expiresIn: 3600, user, ...override });
const json = (value, status = 200, headers = {}) => new Response(JSON.stringify(value), { status, headers: { 'Content-Type': 'application/json', ...headers } });
const deferred = () => { let resolve; const promise = new Promise((done) => { resolve = done; }); return { promise, resolve }; };
function memoryStorage(initial = null) {
  let value = initial;
  return { read: async () => value, write: async (next) => { value = next; }, value: () => value };
}
function setup(handler, storage = memoryStorage()) {
  const calls = [];
  const client = createAuthClient({ origin, storage, fetcher: async (url, init) => {
    const request = new Request(url, init);
    const wire = { method: request.method, credentials: request.credentials, headers: request.headers,
      signal: request.signal, body: request.body === null ? undefined : await request.text() };
    assert.equal(wire.credentials, 'omit');
    assert.equal(wire.headers.get('Cookie'), null);
    const call = { path: new URL(request.url).pathname, init: wire }; calls.push(call);
    return handler(call);
  } });
  return { client, calls, storage };
}
let passed = 0;
async function test(name, run) { await run(); passed++; console.log(`PASS ${name}`); }

async function run() {
  await test('source role aliases, role/permission denial, safe return URLs and login validation', async () => {
    const normalized = contracts.parseUser(user);
    assert.equal(normalized.normalizedRole, 'MILL_MANAGER');
    assert.equal(contracts.hasRole(normalized, ['CUSTOMER_MANAGER']), false);
    assert.equal(contracts.hasRole(normalized, ['MILL_MANAGER']), true);
    assert.equal(contracts.hasAnyPermission(normalized, ['identity.manage']), false);
    assert.equal(contracts.hasAnyPermission(normalized, ['lots.read.facility']), true);
    assert.equal(contracts.hasRole(null), false);
    assert.equal(contracts.normalizeUserRole('PurchasingStaff'), 'CUSTOMER_PROCUREMENT_OFFICER');
    assert.equal(contracts.normalizeUserRole('unrecognized'), 'AUTHORIZED_STOCK_VIEWER');
    assert.equal(contracts.safeReturnPath('https://untrusted.example'), '/home');
    assert.equal(contracts.safeReturnPath('//untrusted.example'), '/home');
    assert.equal(contracts.safeReturnPath('/stock'), '/stock');
    assert.ok(contracts.validateLogin('bad', 'short').email);
  });
  await test('origin configuration cannot leak credentials to an endpoint URL or insecure release origin', async () => {
    assert.equal(normalizeOrigin(`${origin}/`), origin);
    assert.throws(() => normalizeOrigin(`${origin}/api`));
    assert.throws(() => normalizeOrigin('http://localhost:5080'));
    assert.equal(normalizeOrigin('http://localhost:5080', true), 'http://localhost:5080');
    const client = createAuthClient({ origin: '', storage: memoryStorage(), fetcher: () => { throw new Error('Must not call'); } });
    await client.initialize(); assert.equal(client.getSnapshot().status, 'anonymous');
    await assert.rejects(client.login(user.email, 'fixture-password', false), { code: 'configuration' });
  });
  await test('explicit JSON login, bearer session check and refresh-only persistence', async () => {
    const first = tokens(1);
    const { client, calls, storage } = setup(({ path: endpoint, init }) => {
      if (endpoint === '/api/auth/login') {
        assert.equal(init.method, 'POST'); assert.equal(JSON.parse(init.body).email, user.email);
        assert.equal(init.headers.get('Authorization'), null); return json(first);
      }
      assert.equal(endpoint, '/api/auth/session');
      assert.equal(init.headers.get('Authorization'), `Bearer ${first.accessToken}`); return json(user);
    });
    await client.initialize(); await client.login(user.email, 'fixture-password', true); await client.getSession();
    assert.equal(client.getSnapshot().status, 'authenticated');
    const persisted = JSON.parse(storage.value());
    assert.equal(persisted.origin, origin); assert.equal(persisted.refreshToken, first.refreshToken);
    assert.deepEqual(Object.keys(persisted).sort(), ['origin', 'refreshToken', 'version']);
    assert.equal('accessToken' in client.getSnapshot(), false); assert.equal(calls.length, 2);
  });
  await test('HttpOnly/cookie-only login response is rejected rather than treated as SecureStore credentials', async () => {
    const { client, storage } = setup(() => json(user, 200, { 'Set-Cookie': 'fixture-session=opaque; HttpOnly; Secure; SameSite=Lax' }));
    await client.initialize(); await assert.rejects(client.login(user.email, 'fixture-password', true), { code: 'contract' });
    assert.equal(client.getSnapshot().status, 'anonymous'); assert.equal(storage.value(), null);
  });
  await test('inactive, expired and malformed token responses fail closed', async () => {
    for (const body of [tokens(1, { user: { ...user, isActive: false } }), tokens(1, { accessToken: jwt(1, -5) }), tokens(1, { accessToken: 'not-a-jwt' })]) {
      const { client, storage } = setup(() => json(body)); await client.initialize();
      await assert.rejects(client.login(user.email, 'fixture-password', true));
      assert.equal(client.getSnapshot().status, 'anonymous'); assert.equal(storage.value(), null);
    }
  });
  await test('restoration performs backend refresh, rotates durable credential and restores authoritative role', async () => {
    const storage = memoryStorage(JSON.stringify({ version: 1, origin, refreshToken: 'fixture-old' }));
    const { client, calls } = setup(({ path: endpoint, init }) => {
      assert.equal(endpoint, '/api/auth/refresh'); assert.equal(JSON.parse(init.body).refreshToken, 'fixture-old');
      return json(tokens(2, { user: { ...user, role: 'CustomerManager' } }));
    }, storage);
    await Promise.all([client.initialize(), client.initialize()]);
    assert.equal(calls.length, 1); assert.equal(client.getSnapshot().user.normalizedRole, 'CUSTOMER_MANAGER');
    assert.equal(JSON.parse(storage.value()).refreshToken, 'fixture-refresh-2');
  });
  await test('origin mismatch and malformed stored session are removed without transmitting the token', async () => {
    for (const record of ['bad-json', JSON.stringify({ version: 1, origin: 'https://different.example', refreshToken: 'fixture-old' })]) {
      const { client, calls, storage } = setup(() => { throw new Error('Must not transmit'); }, memoryStorage(record));
      await client.initialize(); assert.equal(calls.length, 0); assert.equal(storage.value(), null);
    }
  });
  await test('parallel 401s share one rotating refresh and retry once with the new bearer', async () => {
    const gate = deferred(); let refreshes = 0; const first = tokens(1); const second = tokens(2);
    const { client } = setup(async ({ path: endpoint, init }) => {
      if (endpoint === '/api/auth/login') return json(first);
      if (endpoint === '/api/auth/refresh') { refreshes++; await gate.promise; return json(second); }
      assert.equal(endpoint, '/api/profile');
      return init.headers.get('Authorization') === `Bearer ${first.accessToken}` ? json({ title: 'Expired' }, 401) : json(user);
    });
    await client.initialize(); await client.login(user.email, 'fixture-password', true);
    const requests = [client.request('/api/profile'), client.request('/api/profile')];
    await new Promise((resolve) => setImmediate(resolve)); gate.resolve(); await Promise.all(requests);
    assert.equal(refreshes, 1); assert.equal(client.getSnapshot().status, 'authenticated');
  });
  await test('403 is not retried; a second 401 after rotation clears the session', async () => {
    for (const status of [403, 401]) {
      let refreshes = 0;
      const { client } = setup(({ path: endpoint }) => {
        if (endpoint === '/api/auth/login') return json(tokens(1));
        if (endpoint === '/api/auth/refresh') { refreshes++; return json(tokens(2)); }
        return json({ title: 'Denied' }, status);
      });
      await client.initialize(); await client.login(user.email, 'fixture-password', false);
      await assert.rejects(client.request('/api/profile'), { status });
      assert.equal(refreshes, status === 403 ? 0 : 1);
      assert.equal(client.getSnapshot().status, status === 403 ? 'authenticated' : 'anonymous');
    }
  });
  await test('late refresh after logout cannot resurrect identity or persisted credentials', async () => {
    const gate = deferred();
    const { client, storage } = setup(async ({ path: endpoint }) => {
      if (endpoint === '/api/auth/login') return json(tokens(1));
      if (endpoint === '/api/auth/logout') return new Response(null, { status: 204 });
      await gate.promise; return json(tokens(2));
    });
    await client.initialize(); await client.login(user.email, 'fixture-password', true);
    const refreshing = client.refresh(); const rejection = assert.rejects(refreshing, { code: 'cancelled' });
    await client.logout(); gate.resolve(); await rejection;
    assert.equal(client.getSnapshot().status, 'anonymous'); assert.equal(storage.value(), null);
  });
  await test('remember=false does not persist; logout preserves body contract and reports remote failures', async () => {
    const { client, storage } = setup(({ path: endpoint, init }) => {
      if (endpoint === '/api/auth/login') return json(tokens(1));
      assert.equal(endpoint, '/api/auth/logout'); assert.equal(init.method, 'POST'); assert.equal(init.body, undefined);
      return json({ title: 'Cookie required' }, 401);
    });
    await client.initialize(); await client.login(user.email, 'fixture-password', false); assert.equal(storage.value(), null);
    await client.logout(); assert.equal(client.getSnapshot().status, 'anonymous');
    assert.match(client.getSnapshot().message, /could not be confirmed/);
  });
  await test('storage failure does not silently grant a remembered session', async () => {
    const storage = memoryStorage(); const write = storage.write;
    storage.write = async (value) => { if (value !== null) throw new Error('Fixture secure storage unavailable'); await write(value); };
    const { client } = setup(() => json(tokens(1)), storage); await client.initialize();
    await assert.rejects(client.login(user.email, 'fixture-password', true));
    assert.equal(client.getSnapshot().status, 'anonymous'); assert.equal(storage.value(), null);
  });
  await test('failed backend restoration clears saved credentials and never trusts a cached identity', async () => {
    for (const status of [401, 503]) {
      const storage = memoryStorage(JSON.stringify({ version: 1, origin, refreshToken: 'fixture-old' }));
      const { client } = setup(() => json({ title: 'Refresh unavailable' }, status), storage);
      await client.initialize();
      assert.equal(client.getSnapshot().status, 'anonymous'); assert.equal(client.getSnapshot().user, null);
      assert.equal(storage.value(), null);
    }
  });
  await test('inactive authoritative session revokes local access', async () => {
    const { client, storage } = setup(({ path: endpoint }) => endpoint === '/api/auth/login'
      ? json(tokens(1)) : json({ ...user, isActive: false }));
    await client.initialize(); await client.login(user.email, 'fixture-password', true);
    await assert.rejects(client.getSession(), { code: 'inactive' });
    assert.equal(client.getSnapshot().status, 'anonymous'); assert.equal(storage.value(), null);
  });
  await test('logout cleanup failures are visible and retryable; empty 200 logout is supported', async () => {
    const storage = memoryStorage(); const write = storage.write; let fail = false;
    storage.write = async (value) => { if (fail) throw new Error('Fixture cleanup failure'); await write(value); };
    const { client } = setup(({ path: endpoint }) => endpoint === '/api/auth/login'
      ? json(tokens(1)) : new Response(null, { status: 200 }), storage);
    await client.initialize(); await client.login(user.email, 'fixture-password', true);
    fail = true; await client.logout();
    assert.equal(client.getSnapshot().status, 'anonymous'); assert.equal(client.getSnapshot().cleanupRequired, true);
    fail = false; await client.logout();
    assert.equal(client.getSnapshot().cleanupRequired, false); assert.equal(storage.value(), null);
  });
  console.log(`PASS: ${passed} authentication contract/controller groups. These fixtures do not validate deployed cookies, native SecureStore or backend revocation.`);
}
module.exports = { createAuthClient, memoryStorage, load, contracts };
if (require.main === module) run().catch((error) => { console.error(error); process.exitCode = 1; });
