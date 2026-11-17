/* Fixtures exercise the production Axios fetch adapter, not a mocked service implementation. */
const assert = require('node:assert/strict');
const path = require('node:path');
const http = require('node:http');
const { load, createAuthClient, memoryStorage } = require('./check-auth.cjs');
const moduleAt = (name) => load(path.join(__dirname, '..', name));
const { resolveApiConfiguration } = moduleAt('src/services/api/config.ts');
const { createHttpClient } = moduleAt('src/services/api/http-client.ts');
const { ApiError, normalizeApiError } = moduleAt('src/services/api/errors.ts');
const { createAsyncResource } = moduleAt('src/state/async-resource.ts');
const { createProfileService } = moduleAt('src/services/profile.ts');
const origin = 'https://fixture.example.test';
const user = { id: 'fixture-user', email: 'fixture@example.test', displayName: 'Fixture User', phoneNumber: null,
  role: 'MillManager', organizationId: 'fixture-org', organizationName: 'Fixture Organization', isActive: true, permissions: ['lots.read.facility'] };
const tokens = (version, nextUser = user) => ({ accessToken: `${Buffer.from('{"alg":"fixture"}').toString('base64url')}.${Buffer.from(JSON.stringify({ exp: Math.floor(Date.now() / 1000) + 3600, jti: version })).toString('base64url')}.fixture`,
  refreshToken: `fixture-refresh-${version}`, tokenType: 'Bearer', expiresIn: 3600, user: nextUser });
const json = (data, status = 200, type = 'application/json') => new Response(JSON.stringify(data), { status, headers: { 'Content-Type': type } });
const deferred = () => { let resolve; const promise = new Promise((done) => { resolve = done; }); return { promise, resolve }; };
const fetcherFor = (handler) => async (input, init) => {
  const request = input instanceof Request ? input : new Request(input, init);
  assert.equal(init.credentials, 'omit');
  assert.equal(request.credentials, 'omit');
  assert.equal(request.headers.get('Cookie'), null);
  assert.equal(request.redirect, 'error');
  return handler(request, new URL(request.url));
};
const transport = (handler, options = {}) => createHttpClient({ origin, fetcher: fetcherFor(handler), ...options });
async function session(handler, issued = tokens(1)) {
  const client = createAuthClient({ origin, storage: memoryStorage(), fetcher: fetcherFor((request, url) =>
    url.pathname === '/api/auth/login' ? json(issued) : handler(request, url)) });
  await client.initialize(); await client.login(user.email, 'fixture-password', false);
  return client;
}
let passed = 0;
async function test(name, run) { await run(); passed++; console.log(`PASS ${name}`); }

async function run() {
  await test('environment selection, explicit override, HTTPS and missing/invalid configuration', async () => {
    const input = { isDevelopment: true, developmentUrl: origin, stagingUrl: 'https://staging.example.test', productionUrl: 'https://production.example.test' };
    assert.equal(resolveApiConfiguration(input).origin, origin);
    assert.equal(resolveApiConfiguration({ ...input, environment: 'staging' }).origin, input.stagingUrl);
    assert.equal(resolveApiConfiguration({ ...input, isDevelopment: false }).origin, input.productionUrl);
    assert.equal(resolveApiConfiguration({ ...input, environment: 'staging', baseUrl: origin }).origin, origin);
    assert.equal(resolveApiConfiguration({ isDevelopment: true, developmentUrl: 'http://localhost:5080' }).allowHttp, true);
    for (const config of [{ isDevelopment: false, baseUrl: 'http://localhost:5080' },
      { ...input, environment: 'staging', baseUrl: 'http://localhost:5080' },
      { ...input, environment: 'typo' }, { isDevelopment: false, developmentUrl: origin }]) {
      assert.equal(resolveApiConfiguration(config).configurationError.code, 'configuration');
    }
  });
  await test('origin/path failures never send tokens; caller authorization/cookies cannot override session transport', async () => {
    let calls = 0;
    const api = transport((request) => { calls++; assert.equal(request.headers.get('Authorization'), 'Bearer fixture-actual'); return json(user); });
    for (const endpoint of ['https://other.example/api/profile', '//other.example/api/profile', '/api/../profile', '/api/%2e%2e/profile', '/api/%2Fother', '/api/\\other', '/api/profile#fragment']) {
      await assert.rejects(api.request(endpoint, {}, 'fixture-actual'), { code: 'configuration' });
    }
    assert.equal(calls, 0);
    await api.request('/api/profile', { headers: { authorization: 'Bearer fixture-untrusted', Cookie: 'fixture-cookie' } }, 'fixture-actual');
    assert.equal(calls, 1);
    await assert.rejects(transport(() => { throw new Error('Must not send'); }, { origin: '' }).request('/api/profile'), { code: 'configuration' });
  });
  await test('JSON bodies and source-compatible query arrays, null/empty values, zero and false', async () => {
    const api = transport(async (request, url) => {
      assert.equal(request.method, 'PUT'); assert.equal(request.headers.get('Content-Type'), 'application/json');
      assert.deepEqual(await request.json(), { displayName: 'Fixture Name', phoneNumber: null });
      assert.deepEqual(url.searchParams.getAll('ids'), ['first', 'second']);
      assert.equal(url.searchParams.has('skip'), false); assert.equal(url.searchParams.has('empty'), false);
      assert.equal(url.searchParams.get('page'), '0'); assert.equal(url.searchParams.get('active'), 'false');
      assert.equal(url.searchParams.get('existing'), '1'); return json(user);
    });
    await api.request('/api/profile?existing=1', { method: 'PUT', data: { displayName: 'Fixture Name', phoneNumber: null },
      query: { ids: ['first', 'second'], skip: null, empty: '', page: 0, active: false } });
  });
  await test('multipart boundary is owned by fetch, not a forced JSON content type', async () => {
    const form = new FormData(); form.append('fixture', 'value');
    await transport(async (request) => {
      assert.match(request.headers.get('Content-Type'), /^multipart\/form-data; boundary=/);
      assert.match(await request.text(), /name="fixture"/); return new Response(null, { status: 204 });
    }).request('/api/profile', { method: 'POST', data: form });
  });
  await test('JSON contract failures, empty status responses, explicit text and blob transport', async () => {
    for (const response of [new Response('<html>fallback</html>', { headers: { 'Content-Type': 'text/html' } }),
      new Response('{invalid', { headers: { 'Content-Type': 'application/json' } })]) {
      await assert.rejects(transport(() => response).request('/api/profile'), { code: 'contract' });
    }
    for (const status of [204, 205, 200]) assert.equal(await transport(() => new Response(null, { status })).request('/api/profile'), undefined);
    assert.equal(await transport(() => new Response('fixture text')).request('/api/profile', { responseType: 'text' }), 'fixture text');
    const blob = await transport(() => new Response('fixture file')).request('/api/profile', { responseType: 'blob' });
    assert.equal(await blob.text(), 'fixture file');
  });
  await test('ProblemDetails normalization keeps known fields and actual HTTP status without Axios secrets', async () => {
    const api = transport(() => json({ type: null, title: 'Denied', detail: 'Fixture permission required', status: 'conflicting-body-status',
      instance: '/fixture', arbitrary: 'not part of contract' }, 403, 'application/problem+json'));
    await assert.rejects(api.request('/api/profile'), (error) => {
      assert.ok(error instanceof ApiError); assert.equal(error.status, 403); assert.equal(error.code, 'http');
      assert.equal(error.message, 'Fixture permission required'); assert.equal(error.retryable, false);
      assert.equal(error.problem.type, null); assert.equal(error.problem.arbitrary, undefined);
      for (const key of ['config', 'request', 'response', 'cause']) assert.equal(key in error, false);
      return true;
    });
    assert.equal(normalizeApiError(new Error('fixture-sensitive-internal-message')).message.includes('sensitive'), false);
    await assert.rejects(transport(() => json({ title: 'Unavailable' }, 503)).request('/api/profile'), (error) => error.retryable);
  });
  await test('network failures, timeout and caller cancellation are distinct normalized errors', async () => {
    await assert.rejects(transport(() => { throw new TypeError('Fixture failed fetch'); }).request('/api/profile'), { code: 'network', status: 0 });
    // A real local stalled socket retains fetch's abort chain, unlike an unresolved mock promise.
    const server = http.createServer(() => {});
    await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
    try {
      const localOrigin = `http://127.0.0.1:${server.address().port}`;
      await assert.rejects(createHttpClient({ origin: localOrigin, allowHttp: true, timeoutMs: 30 }).request('/api/profile'), { code: 'timeout' });
      const controller = new AbortController();
      const pending = createHttpClient({ origin: localOrigin, allowHttp: true }).request('/api/profile', { signal: controller.signal });
      controller.abort(); await assert.rejects(pending, { code: 'cancelled' });
    } finally {
      server.closeAllConnections(); await new Promise((resolve) => server.close(resolve));
    }
  });
  await test('profile service uses the real GET path, session bearer and validated SessionUserDto', async () => {
    let invalid = false; const issued = tokens(1);
    const client = await session((request, url) => {
      assert.equal(url.pathname, '/api/profile'); assert.equal(request.method, 'GET');
      assert.equal(request.headers.get('Authorization'), `Bearer ${issued.accessToken}`);
      return json(invalid ? { invented: true } : user);
    }, issued);
    const profile = createProfileService(client.api);
    assert.equal((await profile.getProfile()).id, user.id);
    invalid = true; await assert.rejects(profile.getProfile(), { code: 'contract' });
  });
  await test('shared API requests use one refresh, preserve session scope on rotation and retry with the new bearer', async () => {
    const gate = deferred(); const entered = deferred(); let refreshes = 0;
    const first = tokens(1); const second = tokens(2);
    const client = await session(async (request, url) => {
      if (url.pathname === '/api/auth/refresh') {
        refreshes++; assert.equal((await request.json()).refreshToken, first.refreshToken);
        entered.resolve(); await gate.promise; return json(second);
      }
      return request.headers.get('Authorization') === `Bearer ${first.accessToken}` ? json({ title: 'Expired' }, 401) : json(user);
    }, first);
    const scope = client.getRequestScope();
    const pending = [client.api.request('/api/profile'), client.api.request('/api/profile')];
    await entered.promise; gate.resolve(); await Promise.all(pending);
    assert.equal(refreshes, 1); assert.equal(client.getRequestScope(), scope);
  });
  await test('cancelling a waiter does not abort the shared rotating refresh', async () => {
    const gate = deferred(); const entered = deferred(); let refreshes = 0;
    const first = tokens(1); const second = tokens(2);
    const client = await session(async (request, url) => {
      if (url.pathname === '/api/auth/refresh') {
        refreshes++; entered.resolve(); await gate.promise; assert.equal(request.signal.aborted, false); return json(second);
      }
      return request.headers.get('Authorization') === `Bearer ${first.accessToken}` ? json({ title: 'Expired' }, 401) : json(user);
    }, first);
    const controller = new AbortController();
    const cancelled = client.api.request('/api/profile', { signal: controller.signal });
    const rejection = assert.rejects(cancelled, { code: 'cancelled' });
    const other = client.api.request('/api/profile');
    await entered.promise; controller.abort(); gate.resolve(); await rejection; await other;
    assert.equal(refreshes, 1); assert.equal(client.getSnapshot().status, 'authenticated');
  });
  await test('session scopes change on identity/access changes; late profile responses after logout are rejected', async () => {
    const gate = deferred(); const entered = deferred(); let changed = false;
    const client = await session(async (_, url) => {
      if (url.pathname === '/api/auth/logout') return new Response(null, { status: 204 });
      if (url.pathname === '/api/auth/refresh') { changed = true; return json(tokens(2, { ...user, role: 'CustomerManager' })); }
      entered.resolve(); await gate.promise; return json(user);
    });
    const before = client.getRequestScope(); await client.refresh();
    assert.equal(changed, true); assert.notEqual(client.getRequestScope(), before);
    const pending = client.api.request('/api/profile');
    const rejection = assert.rejects(pending, { code: 'cancelled' });
    await entered.promise; await client.logout(); gate.resolve(); await rejection;
    assert.equal(client.getRequestScope(), null);
    await client.login(user.email, 'fixture-password', false); assert.notEqual(client.getRequestScope(), before);
  });
  await test('resource state resets errors/data, exposes retry and cancellation, and ignores stale completions', async () => {
    const first = deferred(); let attempts = 0; let firstSignal;
    const resource = createAsyncResource(async (signal) => {
      attempts++;
      if (attempts === 1) { firstSignal = signal; await first.promise; return 'stale'; }
      if (attempts === 2) throw new ApiError('Fixture unavailable', 503, 'http');
      return 'fresh';
    });
    const pending = resource.run(); assert.equal(resource.getSnapshot().status, 'loading');
    await resource.run(); assert.equal(firstSignal.aborted, true);
    assert.equal(resource.getSnapshot().status, 'error'); assert.equal(resource.getSnapshot().error.retryable, true);
    assert.equal(resource.getSnapshot().data, null);
    await resource.run(); assert.equal(resource.getSnapshot().data, 'fresh'); assert.equal(resource.getSnapshot().error, null);
    first.resolve(); await pending; assert.equal(resource.getSnapshot().data, 'fresh');
    resource.reset(); assert.equal(resource.getSnapshot().status, 'idle'); assert.equal(resource.getSnapshot().data, null);
    const gate = deferred(); const delayed = createAsyncResource(async () => { await gate.promise; return user; });
    const loading = delayed.run(); delayed.reset(); gate.resolve(); await loading;
    assert.equal(delayed.getSnapshot().status, 'idle'); assert.equal(delayed.getSnapshot().data, null);
    const cancelled = createAsyncResource(async () => { throw new ApiError('Cancelled', 0, 'cancelled'); });
    await cancelled.run(); assert.equal(cancelled.getSnapshot().status, 'idle'); assert.equal(cancelled.getSnapshot().error, null);
  });
  console.log(`PASS: ${passed} API/config/service/state groups. Fixture transport is not deployed-backend or native-device validation.`);
}
// Keep stalled-fixture tests alive and fail explicitly on hangs.
const deadline = setTimeout(() => { console.error('FAIL API fixture suite timed out.'); process.exit(1); }, 15_000);
run().catch((error) => { console.error(error); process.exitCode = 1; }).finally(() => clearTimeout(deadline));
