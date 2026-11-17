/* Stock source-contract fixtures only; never used as application fallback data. */
const assert = require('node:assert/strict');
const path = require('node:path');
const { load } = require('./check-auth.cjs');
const moduleAt = (file) => load(path.join(__dirname, '..', file));
const { createStockService, parseStockPage, stockTotals, formatMass, stockStages } = moduleAt('src/features/stock/stock-api.ts');
const { createAsyncResource } = moduleAt('src/state/async-resource.ts');
const { ApiError } = moduleAt('src/services/api/errors.ts');
const lot = (id, mass = '0.1') => ({ id, code: id, stage: 'PADDY', status: 'ACTIVE', quantityKg: mass,
  availableKg: mass, reservedKg: '0', quarantinedKg: '0' });
const plain = (value) => JSON.parse(JSON.stringify(value));
const deferred = () => { let resolve; const promise = new Promise((done) => { resolve = done; }); return { promise, resolve }; };
async function run() {
  const legacy = parseStockPage([lot('a')]);
  assert.equal(legacy.paging, null);
  assert.equal(parseStockPage({ items: [lot('a')] }).items.length, 1);
  assert.equal(parseStockPage({ items: [], hasMore: true }).paging, null);
  assert.equal(parseStockPage([]).items.length, 0);
  console.log('PASS array/items envelopes, empty success, honest unknown paging');

  for (const value of [null, {}, { items: null }, [lot('a'), lot('a')], [{ ...lot('a'), quantityKg: 1 }],
    [{ ...lot('a'), quantityKg: 'NaN' }], [{ ...lot('a'), availableKg: '' }], [{ ...lot('a'), code: '' }]]) {
    assert.throws(() => parseStockPage(value), (error) => error.code === 'contract');
  }
  assert.throws(() => parseStockPage([lot('a')], 2), (error) => error.code === 'contract');
  console.log('PASS malformed/duplicate/unsafe mass rows cannot become empty stock or zero totals');

  const first = { items: [lot('a')], page: 1, pageSize: 1, totalCount: 2, hasMore: true };
  assert.equal(parseStockPage(first).paging.hasMore, true);
  assert.equal(parseStockPage({ ...first, page: 2, hasMore: false }, 2).paging.page, 2);
  for (const value of [{ ...first, page: 2 }, { ...first, hasMore: false }, { ...first, pageSize: 0 },
    { ...first, items: [] }, { ...first, totalCount: 0 }]) {
    assert.throws(() => parseStockPage(value), (error) => error.code === 'contract');
  }
  console.log('PASS confirmed paging and inconsistent/stale page rejection');

  assert.equal(stockTotals([lot('a'), lot('b', '0.2')]).quantityKg, '0.3');
  assert.equal(stockTotals([{ ...lot('a'), reservedKg: undefined }]).reservedKg, null);
  assert.equal(stockTotals([{ ...lot('a'), availableKg: null }]).availableKg, null);
  assert.equal(stockTotals([]).quantityKg, '0');
  assert.equal(formatMass('1234567890123.123456', 6, 'vi'), '1.234.567.890.123,123456');
  assert.equal(formatMass('0.3', 3, 'en'), '0.300');
  assert.equal(parseStockPage([{ ...lot('a'), status: 'CONSUMED', stage: 'RAW_PADDY' }]).items[0].status, 'CONSUMED');
  console.log('PASS exact decimal totals, missing vs zero, VI/EN formatting, raw server stage/status');

  const calls = [];
  const signal = new AbortController().signal;
  const service = createStockService({ request: async (endpoint, options) => {
    calls.push({ endpoint, options });
    return options.query.page === 2 ? { items: [lot('b')], page: 2, pageSize: 1, totalCount: 2, hasMore: false } : first;
  } });
  for (const stage of stockStages) await service.list({ stage, search: 'A & B', page: 1 }, signal);
  assert.equal(calls.length, 6);
  for (let i = 0; i < calls.length; i++) {
    assert.equal(calls[i].endpoint, '/api/ledger/lots');
    assert.equal(calls[i].options.signal, signal);
    assert.deepEqual(plain(calls[i].options.query), { ...(stockStages[i] ? { stage: stockStages[i] } : {}), search: 'A & B', pageSize: 50 });
  }
  await service.list({ stage: '', search: '', page: 2 });
  assert.equal(calls.at(-1).options.query.page, 2);
  console.log('PASS exact endpoint, five source filters, opaque search, pageSize 50 and abort forwarding');

  for (const status of [401, 403, 500]) {
    const error = new ApiError('fixture rejection', status, 'http');
    const denied = createStockService({ request: async () => { throw error; } });
    await assert.rejects(denied.list({ stage: '', search: '', page: 1 }), (failure) => failure === error);
  }
  console.log('PASS access/server failures propagate without a success fallback or service retry');

  const pending = [];
  const resource = createAsyncResource((signal) => { const request = deferred(); pending.push({ ...request, signal }); return request.promise; });
  const old = resource.run();
  const current = resource.run();
  assert.equal(pending[0].signal.aborted, true);
  pending[1].resolve(parseStockPage([lot('new')])); await current;
  pending[0].resolve(parseStockPage([lot('old')])); await old;
  assert.equal(resource.getSnapshot().data.items[0].id, 'new');
  const exiting = resource.run(); resource.reset();
  assert.equal(pending[2].signal.aborted, true);
  pending[2].resolve(parseStockPage([lot('old-owner')])); await exiting;
  assert.equal(resource.getSnapshot().status, 'idle');
  console.log('PASS superseded filters/unmount reset cannot publish stale stock');
  console.log('PASS: 7 stock fixture groups. Live grants, response shape and native navigation remain unverified.');
}
run().catch((error) => { console.error(error); process.exitCode = 1; });
