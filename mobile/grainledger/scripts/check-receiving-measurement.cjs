/* Measurement source-contract fixtures. No backend account or ledger mutation is used. */
const assert = require('node:assert/strict');
const path = require('node:path');
const { load, contracts, createAuthClient, memoryStorage } = require('./check-auth.cjs');
const at = (file) => load(path.join(__dirname, '..', file));
const { validateMeasurement, canRecordMeasurement, createMeasurementService, createMeasurementAction } = at('src/features/mill/receiving-measurement.ts');
const { parseReceivingTaskDetail } = at('src/features/mill/receiving-api.ts');
const { ApiError } = at('src/services/api/errors.ts');
const plain = (value) => JSON.parse(JSON.stringify(value));
const account = (role = 'MILL_OPERATOR') => contracts.parseUser({ id: 'fixture-operator', email: 'fixture@example.test', displayName: 'Fixture',
  phoneNumber: null, organizationId: 'fixture-org', organizationName: 'Fixture', isActive: true, role, permissions: [] });
const context = { id: 'task-one', facilityId: 'assigned-facility', receivingVersion: 4, actualTotalKg: null };
const fields = { weight: ' 12345,67 ', moisture: '14,5' };
const time = '2026-11-17T05:00:00.000Z';
const expectedBody = { operationId: 'fixture-operation', expectedReceivingVersion: 4, capturedAt: time,
  observations: 'Số cân thực tế bến nhà máy: 12345.67 kg, độ ẩm: 14.5%',
  items: [{ procurementItemId: 'task-one', measuredValue: '12345.67', measuredUnit: 'KG' }],
  grossWeightKg: '12345.67', tareWeightKg: '0.000', netWeightKg: '12345.67', moisturePercent: '14.5', measuredAt: time };
const deferred = () => { let resolve; const promise = new Promise((done) => { resolve = done; }); return { promise, resolve }; };
function setup(handler = async () => undefined, user = account(), current = () => true) {
  const calls = [];
  const service = createMeasurementService({ request: async (endpoint, options) => { calls.push({ endpoint, ...options }); return handler(endpoint, options); } }, user, current);
  const action = createMeasurementAction(service, context, () => 'fixture-operation', () => time);
  return { calls, service, action };
}
let groups = 0;
async function test(name, run) { await run(); groups++; console.log(`PASS ${name}`); }
async function run() {
  await test('required finite inputs, source step rules and exact comma/dot decimal normalization', () => {
    assert.deepEqual(plain(validateMeasurement(fields).values), { weight: '12345.67', moisture: '14.5' });
    assert.equal(validateMeasurement({ weight: '999999999999999999.99', moisture: '14.5' }).values.weight, '999999999999999999.99');
    assert.equal(validateMeasurement({ weight: '1e3', moisture: '14.50' }).values.weight, '1000');
    assert.deepEqual(plain(validateMeasurement({ weight: '', moisture: ' ' }).errors), { weight: 'required', moisture: 'required' });
    assert.equal(validateMeasurement({ weight: '0.001', moisture: '14.5' }).errors.weight, 'step');
    assert.equal(validateMeasurement({ weight: '1', moisture: '14.51' }).errors.moisture, 'step');
    for (const weight of ['NaN', 'Infinity', '1e999', '1,2,3', '1 000', '0x10']) assert.equal(validateMeasurement({ weight, moisture: '14.5' }).errors.weight, 'number');
    // There is no min/max in the source input; server policy remains authoritative.
    assert.ok(validateMeasurement({ weight: '0', moisture: '0' }).values);
    assert.ok(validateMeasurement({ weight: '-1', moisture: '101' }).values);
  });
  await test('source role/no-actual-mass visibility, including zero mass and no invented state list', async () => {
    for (const role of contracts.userRoles) {
      const user = account(role); const allowed = role === 'MILL_OPERATOR' || role === 'MILL_ADMIN';
      assert.equal(canRecordMeasurement(user, context), allowed);
      const s = setup(undefined, user);
      if (allowed) assert.equal(await s.action.submit(fields), true);
      else { assert.equal(await s.action.submit(fields), false); assert.equal(s.action.getSnapshot().error.status, 403); assert.equal(s.calls.length, 0); }
    }
    assert.equal(canRecordMeasurement({ ...account(), isActive: false }, context), false);
    assert.equal(canRecordMeasurement(account(), { ...context, actualTotalKg: '0' }), false);
    const s = setup();
    await assert.rejects(s.service.record({ ...context, actualTotalKg: '0' }, expectedBody), (e) => e.status === 409);
    assert.equal(s.calls.length, 0);
  });
  await test('exact single-item web payload, version, KG, gross/net/tare, observations and timestamps', async () => {
    const s = setup(); assert.equal(await s.action.submit(fields), true);
    assert.equal(s.calls[0].endpoint, '/api/ledger/receiving/task-one/measurements'); assert.equal(s.calls[0].method, 'POST');
    assert.deepEqual(plain(s.calls[0].data), expectedBody);
    assert.equal(s.calls[0].signal.aborted, false);
    // A successful action cannot be submitted again while the same form is alive.
    assert.equal(await s.action.submit(fields), false); assert.equal(s.calls.length, 1);
  });
  await test('invalid input/context/version/path and stale access do not send a measurement', async () => {
    const s = setup(); assert.equal(await s.action.submit({ weight: '', moisture: '' }), false);
    assert.equal(s.action.getSnapshot().status, 'invalid'); assert.equal(s.calls.length, 0);
    for (const task of [{ ...context, id: '../other' }, { ...context, id: '.' }, { ...context, facilityId: '' }, { ...context, receivingVersion: -1 }]) {
      await assert.rejects(s.service.record(task, expectedBody), (e) => e.code === 'contract');
    }
    await assert.rejects(s.service.record(context, { ...expectedBody, expectedReceivingVersion: 99 }), (e) => e.code === 'contract');
    const stale = setup(undefined, account(), () => false); assert.equal(await stale.action.submit(fields), false);
    assert.equal(stale.calls.length, 0); assert.equal(stale.action.getSnapshot().error.code, 'cancelled');
    assert.equal(s.calls.length, 0);
  });
  await test('double taps coalesce; changed fields after submission cannot mutate the request', async () => {
    const wait = deferred(); const s = setup(async () => wait.promise);
    const input = { ...fields };
    const first = s.action.submit(input); const second = s.action.submit(input);
    input.weight = '999'; assert.equal(first, second); assert.equal(s.calls.length, 1);
    assert.equal(s.calls[0].data.netWeightKg, '12345.67'); wait.resolve(); assert.equal(await first, true);
  });
  await test('uncertain manual retry keeps operation/version/time; conflicts are errors, never auto-success', async () => {
    let fail = true;
    const s = setup(async () => { if (fail) throw new ApiError('Uncertain', 0, 'timeout'); });
    assert.equal(await s.action.submit(fields), false); assert.equal(s.calls.length, 1); assert.equal(s.action.getSnapshot().status, 'error');
    fail = false; assert.equal(await s.action.submit({ weight: '12345.670', moisture: '14.50' }), true);
    assert.deepEqual(plain(s.calls[1].data), plain(s.calls[0].data));
    for (const status of [403, 409, 412, 422]) {
      const rejected = setup(async () => { throw new ApiError('Fixture rejection', status, 'http', { detail: 'Fixture validation detail' }); });
      assert.equal(await rejected.action.submit(fields), false); assert.equal(rejected.calls.length, 1);
      assert.equal(rejected.action.getSnapshot().error.status, status);
      assert.equal(rejected.action.getSnapshot().error.problem.detail, 'Fixture validation detail');
    }
  });
  await test('context is copied and abort/session replacement suppress late acknowledgments', async () => {
    const wait = deferred(); let current = true;
    const s = setup(async () => wait.promise, account(), () => current);
    const task = { ...context };
    const action = createMeasurementAction(s.service, task, () => 'fixture-operation', () => time);
    task.id = 'another'; task.receivingVersion = 100;
    const operation = action.submit(fields);
    assert.equal(s.calls[0].data.expectedReceivingVersion, 4); assert.equal(s.calls[0].data.items[0].procurementItemId, 'task-one');
    action.reset(); current = false; wait.resolve();
    assert.equal(await operation, false); assert.equal(s.calls[0].signal.aborted, true); assert.equal(action.getSnapshot().status, 'idle');
  });
  await test('origin moisture is preserved for prefilling; missing version retains source fallback zero', () => {
    const base = { id: 'task-one', code: 'FIXTURE', facilityId: 'assigned-facility', status: 'PENDING_ARRIVAL', expectedTotalKg: '100' };
    assert.equal(parseReceivingTaskDetail({ ...base, originMoisturePercent: '12.3' }, 'task-one').originMoisturePercent, '12.3');
    assert.equal(parseReceivingTaskDetail({ ...base, originMoisturePercent: '' }, 'task-one').originMoisturePercent, '');
    assert.equal(parseReceivingTaskDetail(base, 'task-one').originMoisturePercent, undefined);
    assert.equal(parseReceivingTaskDetail(base, 'task-one').receivingVersion, 0);
  });
  await test('actual bearer transport accepts 204 and shared 401 replay retains the same operation payload', async () => {
    const user = account(); let version = 1; let posts = 0; const requests = [];
    const token = (v) => `${Buffer.from('{}').toString('base64url')}.${Buffer.from(JSON.stringify({ exp: Math.floor(Date.now()/1000)+3600, jti: v })).toString('base64url')}.fixture`;
    const tokens = () => ({ accessToken: token(version), refreshToken: `fixture-refresh-${version}`, tokenType: 'Bearer', expiresIn: 3600, user });
    const client = createAuthClient({ origin: 'https://measurement.example.test', storage: memoryStorage(), fetcher: async (url, options) => {
      const req = new Request(url, options); const route = new URL(req.url).pathname;
      if (route === '/api/auth/login') return new Response(JSON.stringify(tokens()), { headers: { 'Content-Type': 'application/json' } });
      if (route === '/api/auth/refresh') { version++; return new Response(JSON.stringify(tokens()), { headers: { 'Content-Type': 'application/json' } }); }
      assert.equal(route, '/api/ledger/receiving/task-one/measurements'); assert.equal(req.method, 'POST');
      assert.equal(req.credentials, 'omit'); assert.equal(req.headers.get('Authorization'), `Bearer ${token(version)}`);
      requests.push(await req.json()); posts++;
      return new Response(null, { status: posts === 1 ? 401 : 204 });
    } });
    await client.initialize(); await client.login(user.email, 'fixture-password', false);
    const scope = client.getRequestScope();
    const action = createMeasurementAction(createMeasurementService(client.api, user, () => client.getRequestScope() === scope), context, () => 'fixture-operation', () => time);
    assert.equal(await action.submit(fields), true); assert.equal(posts, 2);
    assert.deepEqual(requests[0], expectedBody); assert.deepEqual(requests[0], requests[1]);
  });
  console.log(`PASS: ${groups} receiving-measurement groups. Live item linkage, policies and native interaction remain unverified.`);
}
run().catch((error) => { console.error(error); process.exitCode = 1; });
