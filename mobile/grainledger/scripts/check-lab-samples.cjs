/* Lab sample read contracts only. No real account, specimen registration or handover write. */
const assert = require('node:assert/strict');
const path = require('node:path');
const { load, contracts, createAuthClient, memoryStorage } = require('./check-auth.cjs');
const root = path.join(__dirname, '..');
const at = (file) => load(path.join(root, file));
const { canViewLabSamples, parseLabSamplePage, parseSampleHandovers, filterLabSamples, labSampleStats,
  sampleDate, createLabSamplesService } = at('src/features/compliance/lab-samples-api.ts');
const { ApiError } = at('src/services/api/errors.ts');
const { createAsyncResource } = at('src/state/async-resource.ts');
const plain = (value) => JSON.parse(JSON.stringify(value));
const sample = { id: 'sample-one', sourceLotId: 'source-lot-one', code: 'SAMPLE-ONE', sealCode: 'SEAL-1',
  collectedAt: '2026-11-17T03:00:00.000Z', handoverCount: 1, materialDescription: 'Fixture grain' };
const handover = { id: 'handover-one', fromParty: 'Fixture company', toParty: 'Fixture recipient',
  handedOverAt: '2026-11-17T04:00:00.000Z', sealCondition: null, evidenceRef: null, laboratoryName: null };
const user = (role = 'CUSTOMER_MANAGER') => contracts.parseUser({ id: 'fixture-user', email: 'fixture@example.test', displayName: 'Fixture',
  phoneNumber: null, organizationId: 'fixture-org', organizationName: 'Fixture', isActive: true, role, permissions: [] });
const deferred = () => { let resolve; const promise = new Promise((done) => { resolve = done; }); return { promise, resolve }; };
function setup(handler = async () => [sample], owner = user(), current = () => true) {
  const calls = [];
  const service = createLabSamplesService({ request: async (endpoint, options) => {
    calls.push({ endpoint, ...options }); assert.equal(options.method, undefined); assert.equal(options.data, undefined);
    return handler(endpoint, options);
  } }, owner, current);
  return { service, calls };
}
let groups = 0;
async function test(name, run) { await run(); groups++; console.log(`PASS ${name}`); }
async function run() {
  await test('CM-only route/service policy denies six other roles including Admin without reads', async () => {
    for (const role of contracts.userRoles) {
      const account = user(role); const s = setup(undefined, account);
      assert.equal(canViewLabSamples(account), role === 'CUSTOMER_MANAGER');
      if (role === 'CUSTOMER_MANAGER') assert.equal((await s.service.list(1)).items.length, 1);
      else {
        await assert.rejects(s.service.list(1), (e) => e.status === 403);
        await assert.rejects(s.service.handovers(sample.id), (e) => e.status === 403);
        assert.equal(s.calls.length, 0);
      }
    }
    assert.equal(canViewLabSamples(null), false);
    assert.equal(canViewLabSamples({ ...user(), isActive: false }), false);
  });
  await test('source array/items/hasMore paging contract and explicit empty success', () => {
    assert.deepEqual(plain(parseLabSamplePage([sample], 1)), { items: [sample], hasMore: false });
    assert.equal(parseLabSamplePage({ items: [sample], hasMore: true }, 1).hasMore, true);
    assert.deepEqual(plain(parseLabSamplePage({ items: [], page: 2, hasMore: false }, 2)), { items: [], hasMore: false });
    assert.equal(parseLabSamplePage({ items: [sample] }, 1).hasMore, false);
    for (const value of [null, {}, { items: null }, [sample, sample], [{ ...sample, handoverCount: undefined }],
      [{ ...sample, handoverCount: -1 }], { items: [sample], hasMore: 'false' }, { items: [sample], page: 2 }, { items: [], hasMore: true }]) {
      assert.throws(() => parseLabSamplePage(value, 1), (e) => e.code === 'contract');
    }
  });
  await test('page-local trimmed/lowercase search covers four source fields and preserves status predicates', () => {
    const inStore = { ...sample, id: 'sample-two', code: 'TWO', sealCode: null, sourceLotId: 'lot-two', handoverCount: 0, materialDescription: null };
    const items = [sample, inStore];
    for (const search of [' sample-one ', ' SEAL-1 ', 'source-LOT-one', 'GRAIN']) assert.equal(filterLabSamples(items, search, 'ALL')[0].id, sample.id);
    assert.deepEqual(plain(filterLabSamples(items, '', 'IN_STORE')), [inStore]);
    assert.deepEqual(plain(filterLabSamples(items, '', 'HANDED_OVER')), [sample]);
    assert.equal(filterLabSamples(items, 'absent', 'ALL').length, 0);
    assert.equal(filterLabSamples(items, 'TWO', 'HANDED_OVER').length, 0);
    assert.deepEqual(plain(labSampleStats(items)), { total: 2, sealed: 1, handedOver: 1, inStore: 1 });
    assert.equal(items[1].sealCode, null); // Never substitute a seal or a synthetic status.
  });
  await test('handover envelopes retain null evidence/seal/lab data and source ordering', () => {
    const noId = { ...handover, id: undefined, handedOverAt: '2026-11-16T01:00:00Z' };
    const result = parseSampleHandovers({ items: [handover, noId] });
    assert.equal(result[0].id, handover.id); assert.equal(result[0].sealCondition, null);
    assert.equal(result[0].laboratoryName, null); assert.equal(result[1].id, undefined);
    assert.deepEqual(plain(parseSampleHandovers([])), []);
    for (const value of [null, {}, { items: null }, [handover, handover], [{ handedOverAt: '2026-11-17' }]]) {
      assert.throws(() => parseSampleHandovers(value), (e) => e.code === 'contract');
    }
    assert.equal(sampleDate('invalid-server-date', 'en'), 'invalid-server-date');
    assert.equal(sampleDate('', 'vi'), 'Chưa được cung cấp');
  });
  await test('exact GET page/pageSize 20 and encoded handover resource; no search/status query or writes', async () => {
    const id = 'mẫu & #?'; const signal = new AbortController().signal;
    const s = setup(async (endpoint) => endpoint.endsWith('/handovers') ? [handover] : { items: [sample], page: 3, hasMore: true });
    await s.service.list(3, signal); await s.service.handovers(id, signal);
    assert.equal(s.calls[0].endpoint, '/api/samples');
    assert.deepEqual(plain(s.calls[0].query), { page: 3, pageSize: 20 });
    assert.equal(s.calls[1].endpoint, `/api/samples/${encodeURIComponent(id)}/handovers`);
    assert.equal(s.calls[1].query, undefined); assert.equal(s.calls[1].signal, signal);
    for (const invalid of [0, -1, 1.5, NaN]) await assert.rejects(s.service.list(invalid), (e) => e.code === 'configuration');
    for (const invalid of ['', ' ', '.', '..', 'a/b', 'a\\b', '%2f', 'a\n']) await assert.rejects(s.service.handovers(invalid), (e) => e.code === 'contract');
    assert.equal(s.calls.length, 2);
  });
  await test('HTTP/contract/network failures remain errors without an empty fallback or auto-retry', async () => {
    for (const error of [new ApiError('Denied', 403, 'http'), new ApiError('Missing', 404, 'http'), new ApiError('Offline', 0, 'network')]) {
      const s = setup(async () => { throw error; });
      await assert.rejects(s.service.list(1), (e) => e === error);
      await assert.rejects(s.service.handovers(sample.id), (e) => e === error);
      assert.equal(s.calls.length, 2);
    }
    const bad = setup(async () => ({}));
    await assert.rejects(bad.service.list(1), (e) => e.code === 'contract');
    await assert.rejects(bad.service.handovers(sample.id), (e) => e.code === 'contract');
  });
  await test('stale identity/abort before and after response cannot expose sample data', async () => {
    const wait = deferred(); let current = true;
    const s = setup(async () => wait.promise, user(), () => current);
    const task = s.service.list(1); current = false; wait.resolve([sample]);
    await assert.rejects(task, (e) => e.code === 'cancelled');
    await assert.rejects(s.service.handovers(sample.id), (e) => e.code === 'cancelled'); assert.equal(s.calls.length, 1);
    const controller = new AbortController(); controller.abort();
    const fresh = setup(); await assert.rejects(fresh.service.list(1, controller.signal), (e) => e.code === 'cancelled'); assert.equal(fresh.calls.length, 0);
  });
  await test('rapid page/selection changes and modal exit suppress older results; explicit retry recovers', async () => {
    const waits = [];
    const resource = createAsyncResource((signal) => { const wait = deferred(); waits.push({ ...wait, signal }); return wait.promise; });
    const old = resource.run(); const next = resource.run();
    assert.equal(waits[0].signal.aborted, true);
    waits[1].resolve([handover]); await next;
    waits[0].resolve([]); await old; assert.equal(resource.getSnapshot().data.length, 1);
    const leaving = resource.run(); resource.reset(); waits[2].resolve([handover]); await leaving;
    assert.equal(waits[2].signal.aborted, true); assert.equal(resource.getSnapshot().status, 'idle');
    let fail = true;
    const retry = createAsyncResource(async () => { if (fail) throw new ApiError('Offline', 0, 'network'); return []; });
    await retry.run(); assert.equal(retry.getSnapshot().status, 'error');
    fail = false; await retry.run(); assert.equal(retry.getSnapshot().status, 'success'); assert.equal(retry.getSnapshot().data.length, 0);
  });
  await test('actual bearer Axios uses GET-only samples and handovers with cookie omission', async () => {
    const owner = user(); const calls = [];
    const token = `${Buffer.from('{}').toString('base64url')}.${Buffer.from(JSON.stringify({ exp: Math.floor(Date.now()/1000)+3600 })).toString('base64url')}.fixture`;
    const client = createAuthClient({ origin: 'https://samples.example.test', storage: memoryStorage(), fetcher: async (url, options) => {
      const req = new Request(url, options); const route = new URL(req.url);
      if (route.pathname === '/api/auth/login') return new Response(JSON.stringify({ accessToken: token, refreshToken: 'fixture', tokenType: 'Bearer', expiresIn: 3600, user: owner }), { headers: { 'Content-Type': 'application/json' } });
      assert.equal(req.method, 'GET'); assert.equal(req.credentials, 'omit'); assert.equal(req.headers.get('Authorization'), `Bearer ${token}`);
      calls.push(route.pathname);
      if (route.pathname === '/api/samples') { assert.equal(route.searchParams.get('pageSize'), '20'); return new Response(JSON.stringify({ items: [sample], hasMore: false }), { headers: { 'Content-Type': 'application/json' } }); }
      assert.equal(route.pathname, '/api/samples/sample-one/handovers'); return new Response(JSON.stringify([handover]), { headers: { 'Content-Type': 'application/json' } });
    } });
    await client.initialize(); await client.login(owner.email, 'fixture-password', false);
    const scope = client.getRequestScope(); const service = createLabSamplesService(client.api, owner, () => client.getRequestScope() === scope);
    assert.equal((await service.list(1)).items[0].id, sample.id);
    assert.equal((await service.handovers(sample.id))[0].id, handover.id); assert.equal(calls.length, 2);
  });
  await test('safe sign-in return permits the exact sample destination without a broad compliance allowlist', () => {
    assert.equal(contracts.safeReturnPath('/compliance/lab-samples'), '/compliance/lab-samples');
    assert.equal(contracts.safeReturnPath('/compliance/lab-samples?next=other'), '/home');
    for (const route of ['/compliance/lab-samples/edit', '/compliance/unknown', '/compliance/residue-profiles/new',
      'https://untrusted.test/compliance/lab-samples', '//untrusted.test/compliance/lab-samples']) {
      assert.equal(contracts.safeReturnPath(route), '/home');
    }
  });
  console.log(`PASS: ${groups} lab-sample read groups. Live company grants, data and native interaction remain unverified.`);
}
run().catch((error) => { console.error(error); process.exitCode = 1; });
