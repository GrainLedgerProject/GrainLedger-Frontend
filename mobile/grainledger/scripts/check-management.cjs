const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const ts = require('typescript');
const root = path.resolve(__dirname, '../src/services');
const cache = new Map();
function load(file) {
  if (cache.has(file)) return cache.get(file);
  const exports = {};
  cache.set(file, exports);
  const code = ts.transpileModule(fs.readFileSync(file, 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
  }).outputText;
  vm.runInNewContext(code, { exports, URLSearchParams,
    require: (name) => {
      if (name === 'decimal.js') return require(name);
      assert.ok(name.startsWith('.'), 'No native or browser runtime dependency expected');
      return load(path.resolve(path.dirname(file), `${name}.ts`));
    },
  });
  return exports;
}
const management = load(path.join(root, 'management.ts'));
const { createCatalogManager } = load(path.join(root, 'catalogManagement.ts'));

async function run() {
  const user = { id: 'u1', email: 'admin@example.com', isActive: true, etag: 'W/"version-42"' };
  assert.ok(management.isAdminUser(user));
  const update = management.buildAccessUpdate(user, 'MILL_OPERATOR', 'org1', false);
  assert.equal(update.etag, user.etag);
  assert.equal(update.request.isActive, false);
  assert.equal(update.request.role, 'MILL_OPERATOR');
  assert.equal(management.buildAccessUpdate(user, '', '', true).request.organizationId, null);
  for (const etag of [undefined, '', '  ']) assert.throws(() => management.buildAccessUpdate({ ...user, etag }, '', '', true));
  const org = { id: 'org1', name: 'Nhà máy', kind: 'Mill' };
  assert.equal(management.parseManagementList([org], management.isOrganization).length, 1);
  assert.equal(management.parseManagementList({ items: [user] }, management.isAdminUser).length, 1);
  for (const value of [null, {}, [null], [{ ...org, kind: 'Invented' }]]) {
    assert.throws(() => management.parseManagementList(value, management.isOrganization));
  }
  const item = { id: 'i1', code: 'ST25', name: 'Lúa ST25' };
  const calls = [];
  let result = { data: { items: [item] }, error: null, isMock: false };
  const api = createCatalogManager(async (url, options = {}) => { calls.push({ url, ...options }); return result; });
  const paths = { commodities: 'commodities', units: 'measurement-units', substances: 'active-substances', markets: 'markets', varieties: 'rice-varieties', attributes: 'quality-attributes' };
  for (const [kind, endpoint] of Object.entries(paths)) {
    const list = await api.list(kind, ' Lúa & gạo ');
    assert.equal(list[0].code, 'ST25');
    assert.equal(calls.at(-1).url, `/api/${endpoint}?${new URLSearchParams({ q: 'Lúa & gạo' })}`);
    result = { data: null, error: null, isMock: false };
    await api.save(kind, null, ' CODE ', ' Name ', '');
    const created = calls.at(-1);
    assert.equal(created.url, `/api/${endpoint}`);
    assert.equal(created.method, 'POST');
    const payload = JSON.parse(created.body);
    assert.deepEqual(payload, { code: 'CODE', name: 'Name', ...(kind === 'units' ? { quantityKind: 'MASS' } : kind === 'attributes' ? { unit: '%' } : {}) });
    await api.save(kind, 'i1', ' CODE ', ' Updated ', 'COUNT');
    const edited = calls.at(-1);
    assert.equal(edited.url, `/api/${endpoint}/i1`);
    assert.equal(edited.method, 'PATCH');
    assert.deepEqual(JSON.parse(edited.body), kind === 'units' ? { code: 'CODE', name: 'Updated', quantityKind: 'COUNT' }
      : kind === 'attributes' ? { code: 'CODE', name: 'Updated', unit: 'COUNT' } : { name: 'Updated' });
    result = { data: { items: [item] }, error: null, isMock: false };
  }
  for (const kind of ['commodities', 'units', 'substances']) {
    await api.remove(kind, 'i1'); assert.equal(calls.at(-1).method, 'DELETE');
  }
  for (const kind of ['markets', 'varieties', 'attributes']) {
    const before = calls.length;
    await assert.rejects(() => api.remove(kind, 'i1'));
    assert.equal(calls.length, before);
  }
  await assert.rejects(() => api.save('commodities', null, '', 'Name', ''));
  result = { data: null, error: 'HTTP 403', isMock: false };
  await assert.rejects(() => api.save('commodities', null, 'CODE', 'Name', ''), /quyền/);
  assert.throws(() => management.requireResult({ data: null, error: 'HTTP 412: Changed', isMock: false }), /thay đổi/);
  assert.throws(() => management.requireResult({ data: null, error: 'HTTP 401: Unauthorized', isMock: false }), /đăng nhập/);
  result = { data: { items: [{ name: 'missing-id' }] }, error: null, isMock: false };
  await assert.rejects(() => api.list('commodities', ''));
  result = { data: null, error: null, isMock: true };
  await assert.rejects(() => api.list('commodities', ''));
  const mrl = load(path.join(root, 'mrlManagement.ts'));
  assert.equal(mrl.buildMrlVersion('m', 'c', '2028-02-29', ' Source ').effectiveFrom, '2028-02-29T00:00:00.000Z');
  for (const date of ['2026-02-29', '2026-13-01', '2026-04-31', '', '31/10/2026']) {
    assert.throws(() => mrl.buildMrlVersion('m', 'c', date, ''));
  }
  assert.throws(() => mrl.buildMrlVersion('', 'c', '2026-10-31', ''));
  assert.equal(mrl.buildMrlLimit('0,000000000000001', ' mg/kg ').limitValue, '0.000000000000001');
  for (const invalid of ['-1', 'Infinity', 'NaN', '1kg']) assert.throws(() => mrl.buildMrlLimit(invalid, 'mg/kg'));
  const version = { id: 'v1', marketName: 'EU', commodityName: 'Gạo', effectiveFrom: '2026-10-31', isPublished: false };
  assert.equal(mrl.parseMrlVersions([version])[0].status, 'DRAFT');
  assert.equal(mrl.parseMrlVersions({ items: [{ ...version, isPublished: true }] })[0].status, 'PUBLISHED');
  assert.equal(mrl.parseMrlVersions([{ ...version, status: 'ARCHIVED' }])[0].status, 'ARCHIVED');
  assert.throws(() => mrl.parseMrlVersions([{ id: 'v1', effectiveFrom: '2026-10-31' }]));
  const mrlCalls = [];
  const mrlApi = mrl.createMrlManager(async (url, options = {}) => {
    mrlCalls.push({ url, ...options });
    return { data: [], error: null, isMock: false };
  });
  const loaded = await mrlApi.load();
  assert.equal(loaded.versions.length, 0);
  assert.equal(mrlCalls.length, 4);
  await mrlApi.create(mrl.buildMrlVersion('m', 'c', '2026-10-31', 'source'));
  assert.equal(mrlCalls.at(-1).url, '/api/mrl-versions');
  assert.equal(JSON.parse(mrlCalls.at(-1).body).effectiveTo, null);
  await mrlApi.saveLimit('v1', 'sub1', '0.01', 'mg/kg');
  assert.equal(mrlCalls.at(-1).url, '/api/mrl-versions/v1/limits/sub1');
  assert.equal(mrlCalls.at(-1).method, 'PUT');
  assert.equal(JSON.parse(mrlCalls.at(-1).body).limitValue, '0.01');
  await mrlApi.removeLimit('v1', 'sub1');
  assert.equal(mrlCalls.at(-1).method, 'DELETE');
  await mrlApi.publish('v1');
  assert.equal(mrlCalls.at(-1).url, '/api/mrl-versions/v1/publish');
  assert.equal(mrlCalls.at(-1).method, 'POST');
  const imported = { marketId: 'm', commodityId: 'c', effectiveFrom: '2026-01-01', effectiveTo: null, sourceRef: null,
    limits: [{ substanceCode: 'SUB1', limitValue: '0.0000000000000010', unit: 'mg/kg' }] };
  await mrlApi.importVersion(JSON.stringify(imported));
  assert.equal(mrlCalls.at(-1).url, '/api/mrl-versions/import');
  assert.equal(mrlCalls.at(-1).method, 'POST');
  assert.deepEqual(JSON.parse(mrlCalls.at(-1).body), imported);
  assert.equal(mrl.parseMrlImport(JSON.stringify({ ...imported, limits: null })).limits, null);
  for (const invalid of ['{', 'null', '{}', JSON.stringify({ ...imported, limits: [{}] }),
    JSON.stringify({ ...imported, limits: [{ substanceCode: 'SUB1', limitValue: 0.01, unit: 'mg/kg' }] })]) {
    const before = mrlCalls.length;
    await assert.rejects(() => mrlApi.importVersion(invalid));
    assert.equal(mrlCalls.length, before);
  }
  const rejectedMrl = mrl.createMrlManager(async () => ({ data: null, error: 'HTTP 403', isMock: false }));
  await assert.rejects(() => rejectedMrl.publish('v1'), /quyền/);
  console.log('Management checks passed: access concurrency, six catalog CRUD contracts, MRL dates/precision/status/payloads and error handling.');
}
run().catch((error) => { console.error(error); process.exitCode = 1; });
