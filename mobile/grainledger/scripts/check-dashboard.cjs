/* Dashboard source contracts and permission/aggregation behavior; fixtures are never bundled in the app. */
const assert = require('node:assert/strict');
const path = require('node:path');
const { load, createAuthClient, memoryStorage, contracts } = require('./check-auth.cjs');
const moduleAt = (file) => load(path.join(__dirname, '..', file));
const { createDashboardService, parseDashboardCollection, dashboardSources, dashboardShortcuts } = moduleAt('src/features/dashboard/api/dashboardApi.ts');
const model = moduleAt('src/features/dashboard/model/dashboardData.ts');
const { dashboardConfig } = moduleAt('src/features/dashboard/model/dashboardConfig.ts');
const { ApiError } = moduleAt('src/services/api/errors.ts');
const { createAsyncResource } = moduleAt('src/state/async-resource.ts');
const plain = (value) => JSON.parse(JSON.stringify(value));
const deferred = () => { let resolve; const promise = new Promise((done) => { resolve = done; }); return { promise, resolve }; };
const permissions = ['identity.manage', 'platform.configure', 'platform.read', 'lots.read.facility', 'lots.receive',
  'corrections.reconcile', 'holds.manage', 'conversions.write', 'farms.read', 'purchases.write', 'lab.read', 'export-orders.read'];
const user = (role, grants = permissions) => contracts.parseUser({ id: 'fixture-user', email: 'fixture@example.test', displayName: 'Fixture',
  isActive: true, phoneNumber: null, organizationId: 'fixture-org', organizationName: 'Fixture Org', role, permissions: grants });
const now = new Date('2026-11-16T18:00:00Z'); // 17 November in Vietnam, not the UTC date.
const fixtures = {
  organizations: [{ id: 'org', name: 'Customer', kind: 'Customer' }],
  users: [{ id: 'u1', email: 'one@example.test', isActive: true, role: 'MillManager' }, { id: 'u2', email: 'two@example.test', isActive: false, role: null }],
  setup: { facilities: [{ id: 'a', name: 'A' }], locations: [{ id: 'location', name: 'Store' }], equipment: [{ id: 'equipment', name: 'Scale' }] },
  stock: [{ id: 'lot1', code: 'LOT1', stage: 'RAW_PADDY', restrictions: ['HOLD'], positions: [
    { facilityId: 'a', quantityKg: '0.1', availableKg: '0.01' }, { facilityId: 'b', quantityKg: '100', availableKg: '90' }] },
    { id: 'lot2', code: 'LOT2', stage: 'RAW_PADDY', restrictions: [], positions: [{ facilityId: 'a', quantityKg: '0.2', availableKg: '0.02' }] }],
  receiving: [{ id: 'r1', code: 'R1', status: 'AWAITING_MANAGER_REVIEW', expectedTotalKg: '10' }, { id: 'r2', code: 'R2', status: 'PENDING_ARRIVAL', expectedTotalKg: '20' }],
  operations: [{ id: 'op1', kind: 'DRYING', status: 'DRAFT' }, { id: 'op2', kind: 'MILLING', status: 'COMMITTED' }],
  corrections: [{ id: 'c1', status: 'REQUESTED', reason: 'Fixture correction' }],
  holds: [{ id: 'h1', status: 'ACTIVE', lotCode: 'LOT1' }], farmers: [{ id: 'f1', code: 'F1', name: 'Farmer' }], plots: [{ id: 'p1', code: 'P1' }],
  procurements: [{ id: 'pr1', code: 'PR1', totalNetMassKg: '0.2', receivedAt: '2026-11-17T01:00:00Z' }],
  labs: [{ id: 'lab1', reportNumber: 'LAB1', status: 'DRAFT', confirmedAt: null, assessmentStatus: 'PENDING' }],
  samples: [{ id: 's1', code: 'S1', handoverCount: 0 }],
  orders: [{ id: 'order1', code: 'ORDER1', requiredMassKg: '0.3', shippingFrom: '2026-11-17', shippingTo: '2026-11-20' }],
};
const paths = { organizations: '/api/admin/organizations', users: '/api/admin/users', setup: '/api/ledger/setup', stock: '/api/ledger/lots',
  receiving: '/api/ledger/receiving-tasks', operations: '/api/ledger/operations', corrections: '/api/ledger/corrections', holds: '/api/ledger/holds',
  farmers: '/api/farmers', plots: '/api/plots', procurements: '/api/procurements', labs: '/api/lab-reports', samples: '/api/samples', orders: '/api/export-orders' };
function setup(role, grants = permissions, handler) {
  const calls = [];
  const api = { request: async (endpoint, init = {}) => {
    calls.push({ path: endpoint, ...init });
    if (handler) return handler(endpoint, init);
    if (endpoint === '/api/ledger/lookups') return { facilities: [{ id: 'a', name: 'A' }, { id: 'b', name: 'B' }] };
    const source = Object.keys(paths).find((name) => paths[name] === endpoint);
    assert.ok(source, `Unexpected endpoint: ${endpoint}`); return fixtures[source];
  } };
  return { service: createDashboardService(api, user(role, grants)), calls };
}
let passed = 0;
async function test(name, run) { await run(); passed++; console.log(`PASS ${name}`); }

async function run() {
  await test('all seven roles request only mapped sources with exact paths, paging and sort semantics', async () => {
    const expected = { MILL_ADMIN: ['organizations', 'users', 'setup'], MILL_MANAGER: ['receiving', 'corrections', 'holds', 'stock', 'operations'],
      MILL_OPERATOR: ['receiving', 'operations', 'stock'], CUSTOMER_PROCUREMENT_OFFICER: ['procurements', 'farmers', 'plots'],
      CUSTOMER_MANAGER: ['labs', 'samples', 'holds', 'stock'], CUSTOMER_EXPORT_OFFICER: ['orders', 'stock'], AUTHORIZED_STOCK_VIEWER: ['stock'] };
    for (const [role, sources] of Object.entries(expected)) {
      const { service, calls } = setup(role); const result = await service.loadOverview();
      assert.deepEqual(Array.from(result.sources), sources); assert.deepEqual(Object.keys(result.data).sort(), [...sources].sort());
      assert.ok(result.updatedAt > 0); assert.equal(Object.keys(result.errors).length, 0);
      assert.equal(calls.length, sources.length + (role === 'MILL_MANAGER' || role === 'MILL_OPERATOR' ? 1 : 0));
      for (const source of sources) {
        const call = calls.find((entry) => entry.path === paths[source]); assert.ok(call);
        if (['organizations', 'users', 'setup'].includes(source)) assert.equal(call.query, undefined);
        else { assert.equal(call.query.page, 1); assert.equal(call.query.pageSize, 25); }
        if (source === 'stock') { assert.equal(call.query.sortBy, 'quantity'); assert.equal(call.query.sortDirection, 'desc'); }
        if (source === 'operations') assert.equal(call.query.sortBy, 'occurredAt');
      }
    }
  });
  await test('permission denial makes no data requests; stock viewer retains backend-scoped exception; shortcuts use source OR policy', async () => {
    for (const role of contracts.userRoles.filter((entry) => entry !== 'AUTHORIZED_STOCK_VIEWER')) {
      const { service, calls } = setup(role, []); const result = await service.loadOverview();
      assert.equal(Object.keys(result.data).length, 0); assert.equal(calls.length, 0); assert.equal(result.updatedAt, 0);
    }
    const viewer = setup('AUTHORIZED_STOCK_VIEWER', []); await viewer.service.loadOverview(); assert.equal(viewer.calls[0].path, paths.stock);
    assert.equal(dashboardSources(user('MILL_ADMIN', ['lots.read.all'])).length, 0);
    assert.equal(dashboardShortcuts(user('CUSTOMER_MANAGER', ['lab.read'])).length, 0);
    assert.equal(dashboardShortcuts(user('CUSTOMER_MANAGER', ['trace.read.tenant']))[0].path, '/risk/traceback');
    await assert.rejects(setup('CUSTOMER_MANAGER').service.loadDashboardSource('users'), { status: 403 });
  });
  await test('mill scope waits for lookup permission/assignment, selects current assigned facilities and filters stock positions', async () => {
    const denied = setup('MILL_MANAGER', ['lots.read.facility']); const blocked = await denied.service.loadOverview();
    assert.equal(denied.calls.length, 0); assert.equal(blocked.facilityError.status, 403);
    const { service, calls } = setup('MILL_MANAGER');
    const first = await service.loadOverview('previous-owner-facility'); assert.equal(first.facilityId, 'a');
    const second = await service.loadOverview('b'); assert.equal(second.facilityId, 'b');
    assert.equal(first.data.stock.items[0].positions.length, 1); assert.equal(first.data.stock.items[0].positions[0].facilityId, 'a');
    assert.equal(model.stockMass(first.data.stock.items, 'availableKg').toString(), '0.03');
    for (const call of calls.filter((entry) => entry.path !== '/api/ledger/lookups')) assert.ok(['a', 'b'].includes(call.query.facilityId));
    for (const response of [{ facilities: [] }, { invented: [] }]) {
      const sample = setup('MILL_OPERATOR', permissions, () => response); const result = await sample.service.loadOverview();
      assert.equal(sample.calls.length, 1); assert.equal(Object.keys(result.data).length, 0); assert.equal(result.facilityId, undefined);
    }
    await assert.rejects(service.loadDashboardSource('receiving'), { code: 'configuration' });
  });
  await test('strict row/decimal schemas reject malformed data rather than manufacturing zero', async () => {
    for (const [source, value] of [['stock', [{ id: 'bad' }]], ['stock', [{ ...fixtures.stock[0], positions: [{ facilityId: 'a', quantityKg: 1, availableKg: '0' }] }]],
      ['orders', [{ ...fixtures.orders[0], requiredMassKg: 'NaN' }]], ['users', { items: fixtures.users, totalCount: -1 }]]) {
      assert.throws(() => parseDashboardCollection(source, value), { code: 'contract' });
    }
    const empty = parseDashboardCollection('stock', []); assert.equal(empty.totalCount, 0);
    assert.equal(model.getMetrics('AUTHORIZED_STOCK_VIEWER', {}, 'en', null, now)[0].value, null);
    assert.equal(model.getMetrics('AUTHORIZED_STOCK_VIEWER', { stock: empty }, 'en', null, now)[0].value, '0');
  });
  await test('counts, mass and partial labels distinguish loaded samples from server totals', async () => {
    const partial = parseDashboardCollection('orders', { items: fixtures.orders, totalCount: 100, hasMore: true });
    const metrics = model.getMetrics('CUSTOMER_EXPORT_OFFICER', { orders: partial }, 'en', null, now);
    assert.equal(metrics[0].value, '100'); assert.equal(metrics[2].value, '0.300'); assert.match(metrics[2].detail, /1\/100.*partial/);
    const unknown = parseDashboardCollection('orders', { items: fixtures.orders, hasMore: true });
    assert.equal(unknown.totalCount, null); assert.match(model.scopeNote(unknown, 'en'), /Sample of 1 records/);
    const full = parseDashboardCollection('stock', fixtures.stock);
    assert.equal(model.stockMass(full.items, 'quantityKg').toString(), '100.3');
    assert.equal(model.getMetrics('AUTHORIZED_STOCK_VIEWER', { stock: full }, 'vi', null, now)[2].value, '90,030');
  });
  await test('status-driven role metrics, bounded priorities/lists and admin setup flattening preserve web rules', async () => {
    const data = {};
    for (const [source, value] of Object.entries(fixtures)) if (source !== 'setup') data[source] = parseDashboardCollection(source, value);
    data.setup = (await setup('MILL_ADMIN').service.loadOverview()).data.setup;
    const expected = { MILL_ADMIN: ['1', '1', '1', '1'], MILL_MANAGER: ['1', '1', '1', '90.030'], MILL_OPERATOR: ['1', '1', '1', '90.030'],
      CUSTOMER_PROCUREMENT_OFFICER: ['1', '0.200', '1', null], CUSTOMER_MANAGER: ['1', '1', '1', '90.030'],
      CUSTOMER_EXPORT_OFFICER: ['1', '1', '0.300', '90.030'], AUTHORIZED_STOCK_VIEWER: ['2', '100.300', '90.030', '1'] };
    for (const [role, values] of Object.entries(expected)) {
      assert.deepEqual(Array.from(model.getMetrics(role, data, 'en', null, now), (metric) => metric.value), values);
      assert.ok(model.getPriorities(role, data, 'en', null, now).length <= 5); assert.ok(model.getList(role, data, 'en').length <= 6);
      assert.ok(dashboardConfig[role].title[1]);
    }
    assert.deepEqual(Array.from(data.setup.items, (row) => row.setupKind), ['facility', 'location', 'equipment']);
    const queue = model.getMetrics('CUSTOMER_PROCUREMENT_OFFICER', data, 'en', null, now)[3];
    assert.equal(queue.value, null); assert.match(queue.detail, /not available/);
    assert.equal(model.getPriorities('CUSTOMER_PROCUREMENT_OFFICER', data, 'en', null, now).some((item) => item.id === 'offline'), false);
  });
  await test('Vietnam calendar boundaries drive shipping buckets and 7-day procurement chart without floating point mass', async () => {
    assert.equal(model.shippingBucket(fixtures.orders[0], now), 'current');
    assert.equal(model.shippingBucket({ shippingFrom: '2026-11-24', shippingTo: '2026-11-25' }, now), 'soon');
    assert.equal(model.shippingBucket({ shippingFrom: '2026-11-16', shippingTo: '2026-11-16' }, now), 'past');
    const chart = model.getChart('CUSTOMER_PROCUREMENT_OFFICER', { procurements: parseDashboardCollection('procurements', fixtures.procurements) }, 'en', now);
    assert.equal(chart.length, 7); assert.equal(chart.at(-1).label, '17/11'); assert.equal(chart.at(-1).value, '0.2');
  });
  await test('one failed source preserves other data; next refresh never reuses a previous successful value as current', async () => {
    let failed = false;
    const { service } = setup('CUSTOMER_EXPORT_OFFICER', permissions, (endpoint) => {
      if (endpoint === paths.orders && failed) throw new ApiError('Fixture denied', 403, 'http');
      return endpoint === paths.orders ? fixtures.orders : fixtures.stock;
    });
    assert.ok((await service.loadOverview()).data.orders); failed = true;
    const next = await service.loadOverview(); assert.equal(next.data.orders, undefined); assert.ok(next.data.stock);
    assert.equal(next.errors.orders.status, 403); assert.equal(next.updatedAt, 0);
    assert.equal(model.getMetrics('CUSTOMER_EXPORT_OFFICER', next.data, 'en', null, now)[0].value, null);
    assert.equal(model.getMetrics('CUSTOMER_EXPORT_OFFICER', next.data, 'en', null, now)[3].value, '90.030');
  });
  await test('facility switches abort/ignore old results and keep late completions out of the current resource', async () => {
    const gate = deferred(); const entered = deferred(); let selected = 'a';
    const { service } = setup('MILL_OPERATOR', permissions, async (endpoint, init) => {
      if (endpoint === '/api/ledger/lookups') return { facilities: [{ id: 'a', name: 'A' }, { id: 'b', name: 'B' }] };
      if (init.query.facilityId === 'a') { entered.resolve(); await gate.promise; }
      return fixtures[Object.keys(paths).find((source) => paths[source] === endpoint)];
    });
    const resource = createAsyncResource((signal) => service.loadOverview(selected, signal));
    const old = resource.run(); await entered.promise; selected = 'b'; await resource.run();
    assert.equal(resource.getSnapshot().data.facilityId, 'b'); gate.resolve(); await old;
    assert.equal(resource.getSnapshot().data.facilityId, 'b'); resource.reset(); assert.equal(resource.getSnapshot().data, null);
  });
  await test('dashboard example reads through authenticated Axios with actual endpoint/query and cookie omission', async () => {
    const viewer = user('AUTHORIZED_STOCK_VIEWER', []); const calls = [];
    const accessToken = `${Buffer.from('{"alg":"fixture"}').toString('base64url')}.${Buffer.from(JSON.stringify({ exp: Math.floor(Date.now() / 1000) + 3600 })).toString('base64url')}.fixture`;
    const client = createAuthClient({ origin: 'https://fixture.example.test', storage: memoryStorage(), fetcher: async (input, init) => {
      const request = input instanceof Request ? input : new Request(input, init); const url = new URL(request.url); calls.push(url.pathname);
      assert.equal(init.credentials, 'omit'); assert.equal(request.headers.get('Cookie'), null);
      let body;
      if (url.pathname === '/api/auth/login') body = { accessToken, refreshToken: 'fixture-refresh', tokenType: 'Bearer', expiresIn: 3600, user: viewer };
      else { assert.equal(url.pathname, paths.stock); assert.equal(request.headers.get('Authorization'), `Bearer ${accessToken}`);
        assert.equal(url.searchParams.get('pageSize'), '25'); assert.equal(url.searchParams.get('sortBy'), 'quantity'); body = fixtures.stock; }
      return new Response(JSON.stringify(body), { headers: { 'Content-Type': 'application/json' } });
    } });
    await client.initialize(); await client.login(viewer.email, 'fixture-password', false);
    const result = await createDashboardService(client.api, client.getSnapshot().user).loadOverview();
    assert.equal(result.data.stock.items.length, 2); assert.deepEqual(calls, ['/api/auth/login', paths.stock]);
    assert.deepEqual(plain(Object.keys(result.errors)), []);
  });
  console.log(`PASS: ${passed} dashboard contract/permission/aggregation groups; deployed data and native UI remain unverified.`);
}
run().catch((error) => { console.error(error); process.exitCode = 1; });
