const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const ts = require('typescript');
const compiled = ts.transpileModule(fs.readFileSync(path.resolve(__dirname, '../src/services/corrections.ts'), 'utf8'), {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, esModuleInterop: true },
}).outputText;
const exportsObject = {};
vm.runInNewContext(compiled, { exports: exportsObject, require });
const { buildCorrectionRequest, parseCorrections, submitCorrection } = exportsObject;

async function run() {
  const audit = {};
  const auditCode = ts.transpileModule(fs.readFileSync(path.resolve(__dirname, '../src/services/audit.ts'), 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
  }).outputText;
  vm.runInNewContext(auditCode, { exports: audit });
  const event = { id: 'e1', eventType: 'HOLD_ISSUED', entityType: 'Lot', entityId: 'lot-1', timestamp: '2026-10-31', version: 1, actorEmail: 'test@example.com' };
  for (const value of [[event], { items: [event] }, { events: [event] }]) {
    assert.equal(audit.parseAuditEvents(value)[0].id, 'e1');
  }
  assert.equal(audit.filterAuditEvents([event], ' HOLD ').length, 1);
  assert.equal(audit.filterAuditEvents([event], 'TEST@EXAMPLE.COM').length, 1);
  assert.equal(audit.filterAuditEvents([event], 'missing').length, 0);
  assert.equal(audit.parseAuditEvents({ events: [] }).length, 0);
  for (const value of [null, {}, { events: 'invalid' }, [{ ...event, version: NaN }], [{ ...event, entityId: 1 }]]) {
    assert.throws(() => audit.parseAuditEvents(value));
  }
  const request = buildCorrectionRequest(' op-1 ', ' Lệch cân ', '9007199254740993,125', ' Kiểm tra lại ');
  assert.equal(request.operationId, 'op-1');
  assert.equal(request.reason, 'Lệch cân');
  assert.equal(request.reconciliationNotes, 'Chênh lệch đề nghị: 9007199254740993.125 kg\nKiểm tra lại');
  assert.equal(buildCorrectionRequest('op', 'reason', '-0.25', '').reconciliationNotes, 'Chênh lệch đề nghị: -0.25 kg');
  for (const variance of ['', 'NaN', 'Infinity', '1.2.3', '12kg']) {
    assert.throws(() => buildCorrectionRequest('op', 'reason', variance, ''));
  }
  assert.throws(() => buildCorrectionRequest('', 'reason', '1', ''));
  assert.throws(() => buildCorrectionRequest('op', '', '1', ''));
  const item = { id: 'c1', operationId: 'op', reason: 'reason', status: 'RECONCILED', createdAt: '2026-10-31' };
  assert.equal(parseCorrections([item])[0].id, 'c1');
  assert.equal(parseCorrections({ items: [item] })[0].status, 'RECONCILED');
  assert.equal(parseCorrections({ items: [] }).length, 0);
  for (const value of [null, {}, { items: 'invalid' }, [null], [{ ...item, status: 'UNKNOWN' }], [{ ...item, operationId: 7 }]]) {
    assert.throws(() => parseCorrections(value));
  }
  let calls = 0;
  await submitCorrection(request, async (url, options) => {
    calls++;
    assert.equal(url, '/api/ledger/corrections');
    assert.equal(options.method, 'POST');
    assert.deepEqual(JSON.parse(options.body), JSON.parse(JSON.stringify(request)));
    return { data: null, error: null, isMock: false }; // Valid 204 success.
  });
  assert.equal(calls, 1);
  await assert.rejects(() => submitCorrection(request, async () => ({ data: null, error: 'HTTP 403', isMock: false })), /403/);
  await assert.rejects(() => submitCorrection(request, async () => ({ data: null, error: null, isMock: true })), /máy chủ/);
  await assert.rejects(() => submitCorrection(request, async () => { throw new Error('Offline'); }), /Offline/);
  console.log('Ledger workflows passed: audit parsing/search, decimal precision, response validation, payload and failure handling.');
}
run().catch((error) => { console.error(error); process.exitCode = 1; });
