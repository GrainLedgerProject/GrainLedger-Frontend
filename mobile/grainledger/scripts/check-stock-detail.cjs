/* Source-contract fixtures only; no real backend origin or account is used. */
const assert = require('node:assert/strict');
const path = require('node:path');
const fs = require('node:fs');
const { load, createAuthClient, memoryStorage, contracts } = require('./check-auth.cjs');
const root = path.join(__dirname, '..');
const moduleAt = (file) => load(path.join(root, file));
const { createStockDetailService, parseStockDetail, readLotId } = moduleAt('src/features/stock/stock-detail-api.ts');
const { formatMass } = moduleAt('src/features/stock/stock-api.ts');
const { createAsyncResource } = moduleAt('src/state/async-resource.ts');
const { ApiError } = moduleAt('src/services/api/errors.ts');
const plain = (value) => JSON.parse(JSON.stringify(value));
const detail = {
  id: 'fixture-lot', code: 'FIXTURE-LOT', stage: 'PADDY', status: 'HOLD', quantityKg: '0.300001',
  availableKg: '0.100001', reservedKg: '0.1', quarantinedKg: '0.1', moisturePercent: 12.5,
  positions: [{ facilityId: 'fixture-facility', locationId: 'fixture-location', quantityKg: '0.300001', availableKg: '0.100001' }],
  restrictions: ['HOLD', 'SOURCE_RESTRICTION'],
  composition: [{ farmerName: 'Fixture farmer', plotCode: 'FIXTURE-PLOT', percentage: 30.5, massKg: '0.090001' }],
};
const deferred = () => { let resolve; const promise = new Promise((done) => { resolve = done; }); return { promise, resolve }; };
let passed = 0;
async function test(name, run) { await run(); passed++; console.log(`PASS ${name}`); }

async function run() {
  await test('real summary/composition/positions/restrictions preserved without demo expansion', () => {
    assert.deepEqual(plain(parseStockDetail(detail, detail.id)), detail);
    assert.equal(parseStockDetail(detail, detail.id).composition.length, 1);
    assert.equal(formatMass(detail.positions[0].quantityKg, 6, 'vi'), '0,300001');
    assert.equal(formatMass(detail.composition[0].massKg, 6, 'en'), '0.090001');
  });
  await test('source position-based lots keep missing summary/status unknown', () => {
    const positionsOnly = { id: detail.id, code: detail.code, stage: 'RAW_PADDY', positions: detail.positions, restrictions: [] };
    const result = parseStockDetail(positionsOnly, detail.id);
    assert.equal(result.quantityKg, undefined); assert.equal(result.status, undefined);
    assert.equal(result.positions[0].locationId, 'fixture-location');
    assert.equal(result.composition, undefined);
  });
  await test('missing/null, explicit empty sections and genuinely empty response stay distinct', () => {
    for (const key of ['positions', 'composition', 'restrictions']) {
      const missing = { ...detail }; delete missing[key];
      assert.equal(parseStockDetail(missing, detail.id)[key], undefined);
      assert.equal(parseStockDetail({ ...detail, [key]: null }, detail.id)[key], null);
      assert.deepEqual(plain(parseStockDetail({ ...detail, [key]: [] }, detail.id)[key]), []);
    }
    assert.equal(parseStockDetail(null, detail.id), null);
    assert.equal(parseStockDetail(undefined, detail.id), null);
  });
  await test('wrong identity, malformed rows/masses and non-finite percentages cannot succeed', () => {
    for (const value of [{}, [], { items: [detail] }, { ...detail, id: 'other-lot' }, { ...detail, quantityKg: 0.3 },
      { ...detail, positions: [{ ...detail.positions[0], availableKg: 'NaN' }] },
      { ...detail, positions: [{ quantityKg: '1', availableKg: '1' }] },
      { ...detail, composition: [{ ...detail.composition[0], percentage: Infinity }] },
      { ...detail, composition: [{ ...detail.composition[0], massKg: 1 }] }, { ...detail, restrictions: [{}] }]) {
      assert.throws(() => parseStockDetail(value, detail.id), (error) => error.code === 'contract');
    }
  });
  await test('opaque identifier encoding, exact GET resource, signal and invalid-link no-request', async () => {
    const calls = [];
    const id = 'lô & #?'; const signal = new AbortController().signal;
    const service = createStockDetailService({ request: async (endpoint, options) => {
      calls.push({ endpoint, options }); return { ...detail, id };
    } });
    assert.equal((await service.getDetail(id, signal)).id, id);
    assert.equal(calls[0].endpoint, `/api/ledger/lots/${encodeURIComponent(id)}`);
    assert.equal(calls[0].options.signal, signal);
    assert.equal(calls[0].options.method, undefined); assert.equal(calls[0].options.data, undefined);
    for (const invalid of [null, undefined, [], ['fixture-lot'], '', '  ', '.', '..', '../lot', 'a/b', 'a\\b', 'a\n', '%2f', '%252e']) {
      assert.equal(readLotId(invalid), null);
      await assert.rejects(service.getDetail(invalid), (error) => error.code === 'configuration');
    }
    assert.equal(calls.length, 1);
  });
  await test('403/404/network/contract failures propagate without summary fallback or service retry', async () => {
    for (const error of [new ApiError('fixture', 403, 'http'), new ApiError('fixture', 404, 'http'),
      new ApiError('fixture', 0, 'network'), new ApiError('fixture', 0, 'contract')]) {
      let calls = 0;
      const service = createStockDetailService({ request: async () => { calls++; throw error; } });
      await assert.rejects(service.getDetail(detail.id), (failure) => failure === error);
      assert.equal(calls, 1);
    }
  });
  await test('changed lot, auth reset and failed refresh clear prior detail; explicit retry succeeds', async () => {
    const pending = [];
    const resource = createAsyncResource((signal) => { const request = deferred(); pending.push({ ...request, signal }); return request.promise; });
    const old = resource.run(); const current = resource.run();
    assert.equal(pending[0].signal.aborted, true);
    pending[1].resolve({ ...detail, id: 'new-lot' }); await current;
    pending[0].resolve(detail); await old;
    assert.equal(resource.getSnapshot().data.id, 'new-lot');
    const leaving = resource.run(); assert.equal(resource.getSnapshot().data, null);
    resource.reset(); assert.equal(pending[2].signal.aborted, true);
    pending[2].resolve(detail); await leaving; assert.equal(resource.getSnapshot().status, 'idle');
    let fail = true;
    const retry = createAsyncResource(async () => { if (fail) throw new ApiError('fixture', 403, 'http'); return detail; });
    await retry.run(); assert.equal(retry.getSnapshot().status, 'error'); assert.equal(retry.getSnapshot().data, null);
    fail = false; await retry.run(); assert.equal(retry.getSnapshot().data.id, detail.id);
  });
  await test('all seven authenticated roles use the existing bearer transport and backend grant enforcement', async () => {
    for (const role of contracts.userRoles) {
      const calls = []; let denied = false;
      const user = { id: `fixture-${role}`, email: 'fixture@example.test', displayName: 'Fixture', phoneNumber: null,
        organizationId: 'fixture-org', organizationName: 'Fixture org', role, isActive: true, permissions: [] };
      const token = `${Buffer.from('{}').toString('base64url')}.${Buffer.from(JSON.stringify({ exp: Math.floor(Date.now() / 1000) + 3600 })).toString('base64url')}.fixture`;
      const client = createAuthClient({ origin: 'https://stock.example.test', storage: memoryStorage(), fetcher: async (url, options) => {
        const request = new Request(url, options); const endpoint = new URL(request.url).pathname;
        calls.push(endpoint); assert.equal(request.credentials, 'omit');
        if (endpoint === '/api/auth/login') return new Response(JSON.stringify({ accessToken: token, refreshToken: 'fixture', tokenType: 'Bearer', expiresIn: 3600, user }), { headers: { 'Content-Type': 'application/json' } });
        assert.equal(endpoint, `/api/ledger/lots/${detail.id}`);
        assert.equal(request.method, 'GET'); assert.equal(request.headers.get('Authorization'), `Bearer ${token}`);
        return new Response(JSON.stringify(denied ? { title: 'Denied' } : detail), { status: denied ? 403 : 200, headers: { 'Content-Type': 'application/json' } });
      } });
      await client.initialize(); await client.login(user.email, 'fixture-password', false);
      const service = createStockDetailService(client.api);
      assert.equal((await service.getDetail(detail.id)).id, detail.id);
      denied = true; await assert.rejects(service.getDetail(detail.id), (error) => error.status === 403);
      assert.deepEqual(calls, ['/api/auth/login', `/api/ledger/lots/${detail.id}`, `/api/ledger/lots/${detail.id}`]);
    }
  });
  await test('mounted dynamic route, list entry/back and safe post-login return destinations', () => {
    const route = fs.readFileSync(path.join(root, 'src/app/(tabs)/stock/lots/[lotId].tsx'), 'utf8');
    assert.match(route, /StockLotDetailScreen/);
    const screen = fs.readFileSync(path.join(root, 'src/features/stock/StockLotDetailScreen.tsx'), 'utf8');
    assert.match(screen, /router\.dismissTo\('\/stock'\)/);
    const list = fs.readFileSync(path.join(root, 'src/features/stock/StockScreen.tsx'), 'utf8');
    assert.match(list, /pathname: '\/stock\/lots\/\[lotId\]'/);
    assert.match(list, /lotId: lot\.id, lang: locale/);
    assert.equal(contracts.safeReturnPath('/stock/lots/fixture-lot'), '/stock/lots/fixture-lot');
    assert.equal(contracts.safeReturnPath('/stock/lots/l%C3%B4%20%26%20%23%3F'), '/stock/lots/l%C3%B4%20%26%20%23%3F');
    for (const invalid of ['https://untrusted.test/stock/lots/a', '//untrusted.test/stock/lots/a', '/stock/lots/..',
      '/stock/lots/a/extra', '/stock/lots/a?redirect=other', '/stock/lots/%2F', '/stock/lots/%252F', '/stock/lots/%', '/stock/lots/%2E%2E']) {
      assert.equal(contracts.safeReturnPath(invalid), '/home');
    }
  });
  console.log(`PASS: ${passed} stock-detail groups. Live DTOs/grants/native interaction remain unverified.`);
}
run().catch((error) => { console.error(error); process.exitCode = 1; });
