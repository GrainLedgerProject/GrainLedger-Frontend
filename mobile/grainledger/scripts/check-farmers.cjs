/* Farmer source contracts and offline account isolation. Fixtures never enter the application. */
const assert = require('node:assert/strict');
const path = require('node:path');
const fs = require('node:fs');
const { load, contracts, createAuthClient, memoryStorage } = require('./check-auth.cjs');
const root = path.join(__dirname, '..');
const at = (file) => load(path.join(root, file));
const { parseFarmers, farmerErrors, canManageFarmers, farmerCacheKey, createFarmerCache, createFarmerService } = at('src/features/field/farmers-api.ts');
const { createFarmerActions } = at('src/features/field/farmer-actions.ts');
const { ApiError } = at('src/services/api/errors.ts');
const plain = (value) => JSON.parse(JSON.stringify(value));
const farmer = { id: 'farmer-one', code: 'FARMER-1', name: 'Fixture farmer', contact: 'Contact address', version: 3, totalPlots: 0 };
const user = (role = 'CUSTOMER_PROCUREMENT_OFFICER', extra = {}) => contracts.parseUser({ id: 'fixture-user', email: 'fixture@example.test', displayName: 'Fixture',
  phoneNumber: null, organizationId: 'fixture-org', organizationName: 'Fixture', isActive: true, role, permissions: [], ...extra });
function storage() {
  const values = new Map();
  return { values, getItem: async (key) => values.get(key) ?? null, setItem: async (key, value) => { values.set(key, value); }, removeItem: async (key) => { values.delete(key); } };
}
const deferred = () => { let resolve; const promise = new Promise((done) => { resolve = done; }); return { promise, resolve }; };
const form = { code: ' NEW ', name: ' New farmer ', contact: '  ' };
const timestamp = '2026-11-17T03:00:00.000Z';
function setup(handler, account = user(), db = storage(), current = () => true) {
  const key = farmerCacheKey('https://farmers.example.test', account);
  const cache = createFarmerCache(db, key);
  const calls = [];
  const service = createFarmerService({ request: async (endpoint, options) => {
    calls.push({ endpoint, ...options }); return handler(endpoint, options);
  } }, account, cache, current);
  return { service, calls, cache, db, key };
}
let groups = 0;
async function test(name, run) { await run(); groups++; console.log(`PASS ${name}`); }
async function run() {
  await test('source route roles: only Procurement/Admin; inactive or stale identity cannot request', async () => {
    for (const role of contracts.userRoles) {
      const account = user(role); const allowed = ['CUSTOMER_PROCUREMENT_OFFICER', 'MILL_ADMIN'].includes(role);
      assert.equal(canManageFarmers(account), allowed);
      const s = setup(async () => [farmer], account);
      if (allowed) assert.equal((await s.service.list('')).items.length, 1);
      else { await assert.rejects(s.service.list(''), (e) => e.status === 403); assert.equal(s.calls.length, 0); }
    }
    assert.equal(canManageFarmers({ ...user(), isActive: false }), false);
    const s = setup(async () => [farmer], user(), storage(), () => false);
    await assert.rejects(s.service.list(''), (e) => e.code === 'cancelled'); assert.equal(s.calls.length, 0);
  });
  await test('strict source collection shapes and missing counts stay unknown', () => {
    assert.deepEqual(plain(parseFarmers([farmer])), [farmer]);
    assert.deepEqual(plain(parseFarmers({ items: [] })), []);
    assert.equal(parseFarmers([{ id: 'one', name: 'One', code: '' }])[0].totalPlots, undefined);
    for (const value of [null, {}, { items: null }, [farmer, farmer], [{ ...farmer, version: '3' }], [{ ...farmer, totalPlots: -1 }]]) {
      assert.throws(() => parseFarmers(value), (e) => e.code === 'contract');
    }
  });
  await test('required code/name and unrestricted optional contact follow the source form', () => {
    assert.deepEqual(plain(farmerErrors({ code: ' ', name: ' ', contact: '' })), { code: true, name: true });
    assert.deepEqual(plain(farmerErrors({ code: 'ABC', name: 'One', contact: 'Phone or address, no imposed regex' })), { code: false, name: false });
  });
  await test('GET uses pageSize 50 and opaque search; successful empty unfiltered page replaces stale cache', async () => {
    const s = setup(async () => []);
    await s.cache.save([farmer], timestamp);
    const signal = new AbortController().signal;
    await s.service.list('', signal);
    assert.deepEqual((await s.cache.read()).items.length, 0);
    await s.service.list('Name & Code', signal);
    assert.equal(s.calls[1].endpoint, '/api/farmers'); assert.equal(s.calls[1].signal, signal);
    assert.deepEqual(plain(s.calls[1].query), { pageSize: 50, search: 'Name & Code' });
  });
  await test('cache separates backend, tenant, user, role and permission scope, without offline auth', async () => {
    const account = user(); const db = storage(); const s = setup(async () => { throw new ApiError('Offline', 0, 'network'); }, account, db);
    await s.cache.save([farmer], timestamp);
    for (const other of [user('CUSTOMER_PROCUREMENT_OFFICER', { id: 'another' }), user('CUSTOMER_PROCUREMENT_OFFICER', { organizationId: 'another' }),
      user('MILL_ADMIN'), user('CUSTOMER_PROCUREMENT_OFFICER', { permissions: ['farms.read'] })]) {
      const otherSetup = setup(async () => { throw new ApiError('Offline', 0, 'network'); }, other, db);
      assert.notEqual(otherSetup.key, s.key); await assert.rejects(otherSetup.service.list(''), (e) => e.code === 'network');
    }
    assert.notEqual(farmerCacheKey('https://different.example.test', account), s.key);
    assert.equal((await s.service.list('')).source, 'cache');
  });
  await test('offline search is labeled saved data; filtered responses never poison the reference page', async () => {
    let offline = false;
    const s = setup(async () => { if (offline) throw new ApiError('Offline', 0, 'network'); return [{ ...farmer, id: 'search-result' }]; });
    await s.cache.save([farmer], timestamp);
    await s.service.list('search'); assert.equal((await s.cache.read()).items[0].id, farmer.id);
    offline = true;
    const result = await s.service.list('fixture'); assert.equal(result.source, 'cache'); assert.equal(result.updatedAt, timestamp); assert.equal(result.items[0].id, farmer.id);
    assert.equal((await s.service.list('absent')).items.length, 0);
  });
  await test('403/401/contract failures never fall back to cached identity data', async () => {
    for (const error of [new ApiError('Denied', 403, 'http'), new ApiError('Expired', 401, 'expired'), new ApiError('Bad', 0, 'contract')]) {
      const s = setup(async () => { throw error; }); await s.cache.save([farmer], timestamp);
      await assert.rejects(s.service.list(''), (e) => e === error);
    }
    const malformed = setup(async () => ({})); await malformed.cache.save([farmer], timestamp);
    await assert.rejects(malformed.service.list(''), (e) => e.code === 'contract');
  });
  await test('create exact version-2 envelope, distinct UUIDs, timestamp and trimmed payload', async () => {
    const s = setup(async () => undefined); let counter = 0;
    const actions = createFarmerActions(s.service, () => `fixture-uuid-${++counter}`, () => timestamp);
    assert.equal(await actions.save(form, null), true);
    assert.deepEqual(plain(s.calls[0].data), { deviceId: 'grainledger-mobile', clientOperationId: 'fixture-uuid-1', capturedAt: timestamp, payloadSchemaVersion: 2,
      payload: { entityId: 'fixture-uuid-2', code: 'NEW', name: 'New farmer', contact: '' } });
    assert.equal(s.calls[0].endpoint, '/api/farmers'); assert.equal(s.calls[0].method, 'POST');
    assert.equal(await actions.save({ ...form, name: '' }, null), false); assert.equal(s.calls.length, 1);
  });
  await test('edit/delete preserve source expectedVersion and contact semantics; no implicit delete', async () => {
    const s = setup(async () => undefined); const actions = createFarmerActions(s.service, () => 'unused');
    await actions.save(form, farmer);
    assert.equal(s.calls[0].method, 'PUT'); assert.equal(s.calls[0].endpoint, '/api/farmers/farmer-one');
    assert.deepEqual(plain(s.calls[0].data), { code: 'NEW', name: 'New farmer', contact: null, expectedVersion: 3 });
    await actions.remove(farmer); assert.deepEqual(plain(s.calls[1].data), { version: 3 }); assert.equal(s.calls[1].method, 'DELETE');
    await actions.remove({ ...farmer, version: undefined }); assert.equal(s.calls[2].data.version, 1);
    for (const id of ['.', '..', '../other', 'a/b', 'a\\b', 'a%2Fb', ' ']) {
      await assert.rejects(s.service.execute({ kind: 'delete', id, data: { version: 3 } }), (e) => e.code === 'contract');
    }
    assert.equal(s.calls.length, 3);
  });
  await test('uncertain create retry reuses operation/entity IDs and capture time; no automatic retry', async () => {
    let fail = true; let counter = 0;
    const s = setup(async () => { if (fail) throw new ApiError('Uncertain', 0, 'timeout'); });
    const actions = createFarmerActions(s.service, () => `id-${++counter}`, () => timestamp);
    assert.equal(await actions.save(form, null), false); assert.equal(s.calls.length, 1);
    fail = false; assert.equal(await actions.save(form, null), true);
    assert.deepEqual(plain(s.calls[0].data), plain(s.calls[1].data)); assert.equal(counter, 2);
    assert.equal(actions.getSnapshot().status, 'success');
  });
  await test('double submission coalesces; dispose aborts and ignores a late mutation result', async () => {
    const wait = deferred(); const s = setup(async () => wait.promise);
    const actions = createFarmerActions(s.service, () => 'fixture');
    const first = actions.save(form, null); const second = actions.save(form, null);
    assert.equal(first, second); assert.equal(s.calls.length, 1);
    actions.reset(); assert.equal(s.calls[0].signal.aborted, true);
    wait.resolve(undefined); assert.equal(await first, false); assert.equal(actions.getSnapshot().status, 'idle');
  });
  await test('late list cannot restore invalidated cache; cache failure cannot negate accepted write', async () => {
    const wait = deferred(); const s = setup(async (_, options) => options.method ? undefined : wait.promise);
    const list = s.service.list(''); await s.service.execute({ kind: 'delete', id: farmer.id, data: { version: 3 } });
    wait.resolve([farmer]); await list; assert.equal(await s.cache.read(), null);
    const broken = createFarmerCache({ getItem: async () => null, setItem: async () => { throw new Error('storage'); }, removeItem: async () => { throw new Error('storage'); } }, 'fixture');
    const service = createFarmerService({ request: async () => [farmer] }, user(), broken);
    assert.equal((await service.list('')).cacheWarning, true);
    assert.equal((await service.execute({ kind: 'delete', id: farmer.id, data: { version: 3 } })).cacheWarning, true);
  });
  await test('actual authenticated transport uses bearer, source mutation bodies, and backend conflict errors', async () => {
    const account = user(); const requests = []; let conflict = false;
    const token = `${Buffer.from('{}').toString('base64url')}.${Buffer.from(JSON.stringify({ exp: Math.floor(Date.now()/1000)+3600 })).toString('base64url')}.fixture`;
    const client = createAuthClient({ origin: 'https://farmers.example.test', storage: memoryStorage(), fetcher: async (url, options) => {
      const request = new Request(url, options); const route = new URL(request.url);
      if (route.pathname === '/api/auth/login') return new Response(JSON.stringify({ accessToken: token, refreshToken: 'fixture-refresh', tokenType: 'Bearer', expiresIn: 3600, user: account }), { headers: { 'Content-Type': 'application/json' } });
      assert.equal(request.credentials, 'omit'); assert.equal(request.headers.get('Authorization'), `Bearer ${token}`);
      requests.push({ path: route.pathname, search: route.searchParams.get('search'), method: request.method, body: request.body ? await request.json() : null });
      return new Response(JSON.stringify(conflict ? { title: 'Conflict' } : { items: [farmer] }), { status: conflict ? 409 : 200, headers: { 'Content-Type': 'application/json' } });
    } });
    await client.initialize(); await client.login(account.email, 'fixture-password', false);
    const service = createFarmerService(client.api, account, createFarmerCache(storage(), 'fixture'));
    await service.list('Name & Code'); assert.equal(requests[0].search, 'Name & Code');
    conflict = true;
    await assert.rejects(service.execute({ kind: 'delete', id: farmer.id, data: { version: 3 } }), (e) => e.status === 409);
    assert.deepEqual(requests[1].body, { version: 3 }); assert.equal(requests.length, 2);
  });
  await test('route is mounted/authenticated, Home entry and safe return exist; other Field screens absent', () => {
    assert.ok(fs.existsSync(path.join(root, 'src/app/field/farmers/new.tsx')));
    const layout = fs.readFileSync(path.join(root, 'src/app/_layout.tsx'), 'utf8');
    assert.match(layout, /<Stack\.Screen name="field"/);
    assert.equal(contracts.safeReturnPath('/field/farmers/new'), '/field/farmers/new');
    assert.equal(contracts.safeReturnPath('/field/farmers/new?redirect=other'), '/home');
    const home = fs.readFileSync(path.join(root, 'src/features/dashboard/DashboardScreen.tsx'), 'utf8');
    assert.match(home, /router\.push\('\/field\/farmers\/new'\)/);
    for (const route of ['plots/new.tsx', 'declarations/new.tsx', 'receipts/new.tsx', 'samples/new.tsx', 'sync.tsx']) assert.equal(fs.existsSync(path.join(root, 'src/app/field', route)), false);
  });
  console.log(`PASS: ${groups} farmer groups. Live backend/device/offline restart acceptance is separate.`);
}
run().catch((error) => { console.error(error); process.exitCode = 1; });
