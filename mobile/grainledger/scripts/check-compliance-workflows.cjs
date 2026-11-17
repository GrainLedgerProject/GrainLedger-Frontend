/* Fixture-only checks. No real specimens, reports, policy writes or external app launches. */
const assert = require('node:assert/strict');
const path = require('node:path');
const fs = require('node:fs');
const vm = require('node:vm');
const ts = require('typescript');
const { load, contracts, createAuthClient, memoryStorage } = require('./check-auth.cjs');
const root = path.join(__dirname, '..');
const at = (file) => load(path.join(root, file));
const samples = at('src/features/compliance/sample-commands.ts');
const reports = at('src/features/compliance/lab-reports-api.ts');
const commands = at('src/features/compliance/report-commands.ts');
const { createComplianceAction } = at('src/features/compliance/compliance-actions.ts');
const safety = at('src/features/compliance/safety-margin-model.ts');
const { ApiError } = at('src/services/api/errors.ts');
const plain = (value) => JSON.parse(JSON.stringify(value));
const now = () => '2026-11-17T03:00:00.000Z';
let ids = 0; const uuid = () => `fixture-id-${++ids}`;
const owner = (role = 'CUSTOMER_MANAGER') => contracts.parseUser({ id: 'fixture-user', email: 'fixture@example.test', displayName: 'Fixture',
  phoneNumber: null, organizationId: 'fixture-org', organizationName: 'Fixture', isActive: true, role, permissions: ['lab.write'] });
const report = { id: 'report-1', companyId: 'fixture-org', laboratoryName: 'Fixture Lab', reportNumber: 'REPORT-1', issuedOn: '2026-11-16', receivedAt: now(),
  reportKind: 'FINAL', relatedReportId: null, relationshipReason: null, laboratoryConclusion: 'Pending review', statedStandard: null,
  fileName: 'report.pdf', contentType: 'application/pdf', fileSize: 3, sha256: 'server-hash-only', recordedBy: 'fixture-user', capturedAt: now(), recordedAt: now(),
  status: 'RECORDED', confirmedBy: null, confirmedAt: null, resultSets: [{ id: 'set-1', sampleId: null, confirmedSampleId: null, sourceLotId: null,
    laboratorySampleReference: 'REF-1', statedSampleCode: null, statedSealCode: null, sectionReference: null, identityStatus: 'UNMATCHED', results: [{
      id: 'result-1', testLabel: 'Fixture test', substanceId: null, originalResultText: '<0.01', resultKind: 'NOT_DETECTED', numericValue: null,
      unit: 'mg/kg', lod: null, loq: '0.01', method: null, uncertainty: null, reference: null }] }], relatedReports: [], assessmentStatus: 'PENDING',
  suggestedMarketCode: '', assessmentReasons: ['Identity not confirmed'] };
const attachment = { fileName: 'real.pdf', contentType: 'application/pdf', contentBase64: 'YWJj', size: 3 };
function form() { const value = commands.reportForm(null); value.laboratoryName = ' Fixture lab '; value.reportNumber = ' REP-2 '; value.issuedOn = '2026-11-17'; value.companyOnlyConfirmed = true;
  value.resultSets[0].results[0] = { ...commands.emptyResult(), testLabel: 'Fixture test', originalResultText: '0.01 mg/kg', numericValue: '0.01' }; return value; }
function editForm() { return { ...commands.reportForm(report), companyOnlyConfirmed: true }; }
const matches = [{ resultSetId: 'set-1', sampleId: '00000000-0000-4000-8000-000000000001', identityBasis: 'SAMPLE_CODE', evidenceRef: null }];
function deferred() { let resolve, reject; const promise = new Promise((yes, no) => { resolve = yes; reject = no; }); return { promise, resolve, reject }; }
let groups = 0;
async function test(name, run) { await run(); groups++; console.log(`PASS ${name}`); }

async function run() {
  await test('seven-role permissions guard all sample/report writes and report reads before transport', async () => {
    for (const role of ['MILL_ADMIN', 'MILL_MANAGER', 'MILL_OPERATOR', 'CUSTOMER_PROCUREMENT_OFFICER', 'CUSTOMER_MANAGER', 'CUSTOMER_EXPORT_OFFICER', 'AUTHORIZED_STOCK_VIEWER']) {
      let calls = 0; const api = { request: async () => { calls++; return []; } }; const user = owner(role);
      const command = samples.captureSample({ sealCode: 'S', sourceLotId: 'L', materialDescription: '' }, uuid, now);
      const write = samples.createSampleCommands(api, user, () => true);
      if (role === 'CUSTOMER_MANAGER') { await write(command, new AbortController().signal); assert.equal(calls, 1); }
      else {
        await assert.rejects(write(command, new AbortController().signal), (e) => e.status === 403);
        await assert.rejects(commands.createReportCommands(api, user, () => true)(commands.saveReport(form(), null, attachment, uuid, now), new AbortController().signal), (e) => e.status === 403);
        await assert.rejects(reports.createLabReportService(api, user, () => true).list(1, new AbortController().signal), (e) => e.status === 403);
        assert.equal(calls, 0);
      }
      assert.equal(safety.canViewSafetyMargin(user), ['CUSTOMER_MANAGER', 'MILL_ADMIN'].includes(role));
    }
    assert.equal(safety.canViewSafetyMargin({ ...owner(), isActive: false }), false);
  });
  await test('sample capture v2 and LAB_DISPATCH v1 preserve trimming, nulls, IDs, timestamp and source seal fallback', async () => {
    const capture = samples.captureSample({ sealCode: ' SEAL ', sourceLotId: ' lot ', materialDescription: '  ' }, uuid, now);
    assert.equal(capture.data.payloadSchemaVersion, 2); assert.equal(capture.data.payload.code, null);
    assert.equal(capture.data.payload.sealCode, 'SEAL'); assert.equal(capture.data.payload.sourceLotId, 'lot'); assert.equal(capture.data.payload.materialDescription, null);
    assert.notEqual(capture.data.clientOperationId, capture.data.payload.entityId); assert.equal(capture.data.payload.collectedAt, capture.data.capturedAt);
    const handover = samples.recordHandover('sample 1', { fromParty: ' From ', toParty: ' To ', laboratoryName: ' Lab ', sealCondition: '', evidenceRef: ' ' }, uuid, now);
    assert.equal(handover.data.payloadSchemaVersion, 1); assert.equal(handover.data.payload.handoverKind, 'LAB_DISPATCH');
    assert.equal(handover.data.payload.sealCondition, 'Nguyên vẹn'); assert.equal(handover.data.payload.laboratoryName, 'Lab'); assert.equal(handover.data.payload.evidenceRef, null);
    const calls = []; const send = samples.createSampleCommands({ request: async (...args) => calls.push(args) }, owner(), () => true);
    await send(capture, new AbortController().signal); await send(handover, new AbortController().signal);
    assert.equal(calls[0][0], '/api/samples'); assert.equal(calls[1][0], '/api/samples/sample%201/handovers');
    assert.ok(calls.every(([, init]) => init.method === 'POST'));
    await assert.rejects(send({ ...handover, id: '../other' }, new AbortController().signal)); assert.equal(calls.length, 2);
    assert.throws(() => samples.captureSample({ sealCode: ' ', sourceLotId: 'L', materialDescription: '' }, uuid, now));
    assert.equal(samples.handoverFormErrors({ fromParty: '', toParty: '', laboratoryName: '' }).toParty, true);
  });
  await test('report schemas retain evidence, server assessments and null numeric values; malformed data never becomes empty', () => {
    const value = reports.parseLabReport(report, report.id);
    assert.equal(value.resultSets[0].results[0].numericValue, null); assert.equal(value.assessmentStatus, 'PENDING');
    assert.equal(value.resultSets[0].statedSealCode, null); assert.equal(value.statedStandard, null);
    assert.equal(reports.parseReportPage([report], 1).hasMore, false); assert.equal(reports.parseReportPage({ items: [], hasMore: false }, 3).items.length, 0);
    for (const value of [{}, { items: [], hasMore: true }, { items: [report], page: 2 }, { items: [report, report] }, { items: [{ ...report, resultSets: null }] }]) {
      assert.throws(() => reports.parseReportPage(value, 1), (e) => e.code === 'contract');
    }
    assert.throws(() => reports.parseLabReport(report, 'different'));
    assert.throws(() => reports.parseLabReport({ ...report, resultSets: [report.resultSets[0], report.resultSets[0]] }));
  });
  await test('report page-local search/status/KPIs preserve source alias differences and confirmation predicate', () => {
    const rows = [report, { ...report, id: 'r2', assessmentStatus: 'CONFORMING' }, { ...report, id: 'r3', assessmentStatus: 'REJECTED', status: 'CONFIRMED' },
      { ...report, id: 'r4', assessmentStatus: 'PASS', laboratoryName: 'Another' }];
    assert.equal(reports.filterReports(rows, ' fixture LAB ', 'ALL').length, 3);
    assert.equal(reports.filterReports(rows, '', 'COMPLIANT').length, 1); // source filter omits CONFORMING, KPI includes it
    assert.equal(reports.filterReports(rows, '', 'NON_COMPLIANT').length, 1);
    assert.equal(reports.filterReports(rows, '', 'PENDING').length, 3); // source pending filter includes REJECTED
    assert.deepEqual(plain(reports.reportStats(rows)), { total: 4, compliant: 2, nonCompliant: 1, pending: 2 });
    assert.equal(reports.isReportConfirmed({ ...report, confirmedAt: now() }), true);
  });
  await test('real report read contract uses pageSize20, matching detail ID and authenticated blob response type', async () => {
    const calls = []; let response = { items: [report], page: 1, hasMore: true };
    const service = reports.createLabReportService({ request: async (path, init) => { calls.push([path, init]); return response; } }, owner(), () => true);
    await service.list(1, new AbortController().signal); assert.deepEqual(plain(calls[0][1].query), { page: 1, pageSize: 20 });
    response = report; await service.detail(report.id, new AbortController().signal); assert.equal(calls[1][0], '/api/lab-reports/report-1');
    response = new Blob(['abc'], { type: 'application/pdf' }); await service.file(report.id, new AbortController().signal);
    assert.equal(calls[2][0], '/api/lab-reports/report-1/file'); assert.equal(calls[2][1].responseType, 'blob');
    response = {}; await assert.rejects(service.file(report.id, new AbortController().signal), (e) => e.code === 'contract');
    await assert.rejects(service.list(0, new AbortController().signal)); await assert.rejects(service.detail('../bad', new AbortController().signal));
    assert.equal(calls.length, 4);
  });
  await test('backend-compatible report create v1 transcribes actual multiple result sets without random sample/seal or generated attachment', () => {
    const input = form(); input.resultSets[0].statedSampleCode = ' ACTUAL-SAMPLE '; input.resultSets[0].results[0].originalResultText = '<0.01 mg/kg';
    input.resultSets.push({ ...commands.emptyResultSet(), results: [form().resultSets[0].results[0], { ...form().resultSets[0].results[0], testLabel: 'Second test' }] });
    const command = commands.saveReport(input, null, attachment, uuid, now);
    assert.equal(command.kind, 'create'); assert.equal(command.data.payloadSchemaVersion, 1); const value = command.data.payload;
    assert.equal(value.reportNumber, 'REP-2'); assert.equal(value.laboratoryName, 'Fixture lab'); assert.equal(value.resultSets.length, 2);
    assert.equal(value.resultSets[0].statedSampleCode, 'ACTUAL-SAMPLE'); assert.equal(value.resultSets[0].statedSealCode, null);
    assert.equal(value.resultSets[1].results.length, 2); assert.notEqual(value.resultSets[0].entityId, value.resultSets[1].entityId);
    assert.equal(value.contentBase64, 'YWJj'); assert.equal(value.fileName, 'real.pdf'); assert.equal(value.receivedAt, now());
    assert.throws(() => commands.saveReport(form(), null, null, uuid, now));
    assert.throws(() => commands.saveReport({ ...form(), companyOnlyConfirmed: false }, null, attachment, uuid, now));
    assert.throws(() => commands.saveReport({ ...form(), reportKind: 'MRL_SCREENING' }, null, attachment, uuid, now));
    assert.equal(commands.reportFormErrors({ ...form(), issuedOn: '2026-02-30' }).issuedOn, true);
    assert.equal(commands.reportFormErrors({ ...form(), issuedOn: '2024-02-29' }).issuedOn, false);
    assert.throws(() => commands.saveReport({ ...form(), reportNumber: ' ' }, null, null, uuid, now));
  });
  await test('report update sends route/set identities and retained file metadata; confirmed evidence cannot be edited', () => {
    const input = editForm(); const update = commands.saveReport(input, report, null, uuid, now);
    assert.equal(update.kind, 'update'); assert.equal(update.id, report.id); assert.equal(update.data.payload.entityId, report.id);
    assert.equal(update.data.payload.resultSets[0].entityId, 'set-1'); assert.equal(update.data.payload.receivedAt, report.receivedAt);
    assert.equal(update.data.payload.contentBase64, null); assert.equal(update.data.payload.fileName, report.fileName);
    assert.equal(update.data.payload.resultSets[0].results[0].originalResultText, '<0.01');
    assert.equal(commands.saveReport(input, report, attachment, uuid, now).data.payload.contentBase64, 'YWJj');
    assert.throws(() => commands.saveReport(input, { ...report, status: 'CONFIRMED' }, attachment, uuid, now));
    assert.throws(() => commands.saveReport(input, { ...report, status: 'SUPERSEDED' }, attachment, uuid, now));
  });
  await test('attachment bytes/padding and local10MiB budget are validated without inventing a MIME allowlist', () => {
    commands.validateAttachment(attachment); commands.validateAttachment({ ...attachment, fileName: 'lab.txt', contentType: 'text/plain' });
    for (const invalid of [{ ...attachment, size: 0 }, { ...attachment, size: 4 }, { ...attachment, contentBase64: 'data:YWJj' },
      { ...attachment, size: commands.attachmentLimit + 1 }, { ...attachment, contentBase64: 'ab=c' }, { ...attachment, fileName: '' }]) assert.throws(() => commands.validateAttachment(invalid));
  });
  await test('backend confirmation v1 requires explicit checks and complete sample identity matches; delete v1 has no expectedVersion', async () => {
    assert.throws(() => commands.confirmReport(report, { identity: false, transcription: true, asReceived: false }, uuid, now));
    assert.throws(() => commands.confirmReport({ ...report, status: 'CONFIRMED' }, { identity: true, transcription: true, asReceived: true }, uuid, now));
    assert.throws(() => commands.confirmReport(report, { identity: true, transcription: true, asReceived: true, matches: [] }, uuid, now));
    assert.throws(() => commands.confirmReport(report, { identity: true, transcription: true, asReceived: true, matches: [{ ...matches[0], identityBasis: 'LAB_REFERENCE' }] }, uuid, now));
    const confirm = commands.confirmReport(report, { identity: true, transcription: true, asReceived: false, matches }, uuid, now);
    assert.equal(confirm.data.payloadSchemaVersion, 1); assert.deepEqual(plain(confirm.data.payload), { identityChecked: true, transcriptionChecked: true, matches, asReceivedConfirmed: false });
    const remove = commands.deleteReport(report.id, uuid, now); assert.equal(remove.data.payloadSchemaVersion, 1); assert.equal('payload' in remove.data, false);
    const calls = []; const execute = commands.createReportCommands({ request: async (...args) => { calls.push(args); } }, owner(), () => true);
    for (const value of [commands.saveReport(form(), null, attachment, uuid, now), commands.saveReport(editForm(), report, null, uuid, now), confirm, remove]) await execute(value, new AbortController().signal);
    assert.deepEqual(calls.map(([p, init]) => [p, init.method]), [['/api/lab-reports', 'POST'], ['/api/lab-reports/report-1', 'PUT'], ['/api/lab-reports/report-1/confirm', 'POST'], ['/api/lab-reports/report-1', 'DELETE']]);
    assert.ok(calls.every(([, init]) => !('expectedVersion' in init.data)));
  });
  await test('unchanged explicit retry preserves command IDs/time, coalesces pending submits and prevents post-success duplicate', async () => {
    const wait = deferred(); const seen = []; let fail = true; let builds = 0;
    const action = createComplianceAction(async (command) => { seen.push(command); if (seen.length === 1) await wait.promise; if (fail) throw new ApiError('timeout', 0, 'timeout'); });
    const build = () => { builds++; return samples.captureSample({ sealCode: 'S', sourceLotId: 'L', materialDescription: '' }, uuid, now); };
    const first = action.submit('same', build); const duplicate = action.submit('same', build); assert.equal(first, duplicate);
    wait.resolve(); assert.equal(await first, false); assert.equal(action.getSnapshot().status, 'error');
    fail = false; assert.equal(await action.submit('same', build), true); assert.equal(builds, 1); assert.equal(seen[0], seen[1]);
    assert.equal(await action.submit('changed', build), false); assert.equal(seen.length, 2);
    action.reset(); assert.equal(await action.submit('changed', build), true); assert.equal(builds, 2);
  });
  await test('close, identity replacement and abort suppress late writes/read results; edited retries build fresh operations', async () => {
    let current = true; const wait = deferred(); let calls = 0;
    const service = commands.createReportCommands({ request: async () => { calls++; await wait.promise; } }, owner(), () => current);
    const action = createComplianceAction(service); const command = commands.deleteReport(report.id, uuid, now);
    const pending = action.submit('delete', () => command); current = false; wait.resolve(); assert.equal(await pending, false);
    assert.equal(action.getSnapshot().error.code, 'cancelled');
    await assert.rejects(service(command, new AbortController().signal)); assert.equal(calls, 1);
    const slow = deferred(); const other = createComplianceAction(async () => slow.promise); const late = other.submit('x', () => command);
    other.reset(); slow.resolve(); assert.equal(await late, false); assert.equal(other.getSnapshot().status, 'idle');
    const changed = []; const retry = createComplianceAction(async (value) => { changed.push(value); throw new ApiError('conflict', 409, 'http'); });
    await retry.submit('a', () => commands.deleteReport(report.id, uuid, now)); await retry.submit('b', () => commands.deleteReport(report.id, uuid, now));
    assert.notEqual(changed[0].data.clientOperationId, changed[1].data.clientOperationId);
    const aborted = new AbortController(); aborted.abort(); await assert.rejects(reports.createLabReportService({ request: async () => { throw Error('must not call'); } }, owner(), () => true).list(1, aborted.signal));
  });
  await test('HTTP403/409/422/network remain rejected with no domain automatic replay', async () => {
    for (const error of [new ApiError('denied', 403, 'http'), new ApiError('conflict', 409, 'http'), new ApiError('validation', 422, 'http'), new ApiError('network', 0, 'network')]) {
      let count = 0; const execute = commands.createReportCommands({ request: async () => { count++; throw error; } }, owner(), () => true);
      await assert.rejects(execute(commands.deleteReport(report.id, uuid, now), new AbortController().signal), (e) => e === error); assert.equal(count, 1);
    }
  });
  await test('actual authenticated Axios sends JSON/base64 POST/PUT/DELETE/confirm and GET blob with bearer and no cookies', async () => {
    const user = owner(); const calls = []; const token = `${Buffer.from('{"alg":"fixture"}').toString('base64url')}.${Buffer.from(JSON.stringify({ exp: Math.floor(Date.now()/1000)+3600 })).toString('base64url')}.fixture`;
    const client = createAuthClient({ origin: 'https://compliance.example.test', storage: memoryStorage(), fetcher: async (input, init) => {
      const req = new Request(input, init); const url = new URL(req.url);
      assert.equal(req.credentials, 'omit'); assert.equal(req.headers.get('Cookie'), null);
      if (url.pathname === '/api/auth/login') return new Response(JSON.stringify({ accessToken: token, refreshToken: 'fixture-refresh', tokenType: 'Bearer', expiresIn: 3600, user }), { headers: { 'Content-Type': 'application/json' } });
      assert.equal(req.headers.get('Authorization'), `Bearer ${token}`);
      if (req.method === 'GET') { assert.equal(url.pathname, '/api/lab-reports/report-1/file'); return new Response('abc', { headers: { 'Content-Type': 'application/pdf' } }); }
      assert.match(req.headers.get('Content-Type'), /application\/json/); calls.push({ path: url.pathname, method: req.method, data: JSON.parse(await req.text()) });
      return new Response(null, { status: 204 });
    } });
    await client.initialize(); await client.login(user.email, 'fixture-password', false); const scope = client.getRequestScope();
    const execute = commands.createReportCommands(client.api, user, () => scope === client.getRequestScope());
    for (const value of [commands.saveReport(form(), null, attachment, uuid, now), commands.saveReport(editForm(), report, null, uuid, now),
      commands.confirmReport(report, { identity: true, transcription: true, asReceived: true, matches }, uuid, now), commands.deleteReport(report.id, uuid, now)]) await execute(value, new AbortController().signal);
    assert.equal(calls.length, 4); assert.equal(calls[0].data.payload.contentBase64, 'YWJj');
    assert.equal((await reports.createLabReportService(client.api, user, () => true).file(report.id, new AbortController().signal)).size, 3);
  });
  await test('safe return supports mounted list/new/report details/safety only with canonical encoded identifiers', () => {
    for (const value of ['/compliance/lab-samples', '/compliance/lab-samples/new', '/compliance/lab-results', '/compliance/lab-results/report-1', '/compliance/lab-results/sample%201', '/compliance/safety-margin']) assert.equal(contracts.safeReturnPath(value), value);
    for (const value of ['/compliance/residue-profiles/new', '/compliance/lab-results/a/b', '/compliance/lab-results/%2e%2e', '/compliance/lab-results/%252f', '/compliance/lab-results/abc?x=y', '/compliance/lab-results/%ZZ', '//evil.test/compliance/lab-results']) assert.equal(contracts.safeReturnPath(value), '/home');
  });
  await test('shared bounded401 refresh replays the identical report command without rebuilding operation IDs', async () => {
    let version = 1; const writes = []; const user = owner();
    const token = () => `${Buffer.from('{"alg":"fixture"}').toString('base64url')}.${Buffer.from(JSON.stringify({ exp: Math.floor(Date.now()/1000)+3600, jti: version })).toString('base64url')}.fixture`;
    const tokens = () => ({ accessToken: token(), refreshToken: `fixture-refresh-${version}`, tokenType: 'Bearer', expiresIn: 3600, user });
    const client = createAuthClient({ origin: 'https://compliance.example.test', storage: memoryStorage(), fetcher: async (input, init) => {
      const request = new Request(input, init); const route = new URL(request.url).pathname;
      if (route === '/api/auth/login') return new Response(JSON.stringify(tokens()), { headers: { 'Content-Type': 'application/json' } });
      if (route === '/api/auth/refresh') { version++; return new Response(JSON.stringify(tokens()), { headers: { 'Content-Type': 'application/json' } }); }
      assert.equal(route, '/api/lab-reports'); writes.push(await request.text());
      return new Response(null, { status: writes.length === 1 ? 401 : 204 });
    } });
    await client.initialize(); await client.login(user.email, 'fixture-password', false); const scope = client.getRequestScope();
    const command = commands.saveReport(form(), null, attachment, uuid, now);
    await commands.createReportCommands(client.api, user, () => client.getRequestScope() === scope)(command, new AbortController().signal);
    assert.equal(writes.length, 2); assert.equal(writes[0], writes[1]); assert.equal(version, 2);
  });
  await test('local safety demo preserves inclusive Decimal boundaries and30source limits independently of persisted policies', () => {
    assert.equal(safety.demoMarkets.length * safety.demoSubstances.length, 30);
    assert.equal(safety.simulateSafetyMargin('0.01', 20, '0.008').verdict, 'SAFE_PASS');
    assert.equal(safety.simulateSafetyMargin('0.01', 20, '0.0080001').verdict, 'WARNING_BUFFER');
    assert.equal(safety.simulateSafetyMargin('0.01', 20, '0.01').verdict, 'WARNING_BUFFER');
    assert.equal(safety.simulateSafetyMargin('0.01', 20, '0.010001').verdict, 'EXCEEDED_MRL');
    assert.equal(safety.simulateSafetyMargin('0.01', 20, '0,0075').threshold, '0.0080');
    assert.equal(safety.simulateSafetyMargin('0.01', 35, '0'), null); assert.equal(safety.simulateSafetyMargin('0.01', 20, 'bad'), null);
    assert.equal(safety.simulateSafetyMargin('0.01', 20, '-0.1'), null);
  });
  await test('accepted report replacement is retained for navigation without parsing failure or a second mutation', async () => {
    const newId = '00000000-0000-4000-8000-000000000099'; let count = 0;
    const execute = commands.createReportCommands({ request: async () => { count++; return { ...report, id: newId }; } }, owner(), () => true);
    const action = createComplianceAction(execute);
    assert.equal(await action.submit('edit', () => commands.saveReport(editForm(), report, null, uuid, now)), true);
    assert.equal(action.getSnapshot().result.id, newId); assert.equal(await action.submit('edit', () => { throw Error('must not rebuild'); }), false); assert.equal(count, 1);
    assert.equal(commands.canWriteReports({ ...owner(), permissions: [] }), false);
  });
  await test('native file adapter cancellation, picker copy cleanup and authenticated-blob preview use mocked device APIs', async () => {
    let pick = { canceled: false, assets: [{ uri: 'file:///cache/picked.pdf', name: 'picked.pdf', mimeType: 'application/pdf', size: 3 }] };
    const deleted = []; const opened = []; const written = []; let chooserOptions; let nativeSize = 3;
    class NativeFile {
      constructor(...parts) { this.uri = parts.map((p) => typeof p === 'string' ? p : p.uri).join('/'); this.size = nativeSize; this.type = 'application/pdf'; }
      async base64() { return 'YWJj'; } delete() { deleted.push(this.uri); }
      async write(content, options) { written.push([content, options]); } async canPreview() { return true; } async preview() { opened.push(this.uri); }
    }
    class Reader { readAsDataURL(blob) { blob.arrayBuffer().then((data) => { this.result = `data:application/pdf;base64,${Buffer.from(data).toString('base64')}`; this.onload?.(); }); } abort() { this.onabort?.(); } }
    const module = { exports: {} }; const source = fs.readFileSync(path.join(root, 'src/features/compliance/report-files.ts'), 'utf8');
    const compiled = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText;
    const runtime = vm.createContext({ FileReader: Reader, Blob, URL, document: {}, console });
    vm.runInContext(`(function(require,module,exports){${compiled}\n})`, runtime)((name) => {
      if (name === 'expo-document-picker') return { getDocumentAsync: async (options) => { chooserOptions = options; return pick; } };
      if (name === 'expo-file-system') return { File: NativeFile, Paths: { cache: { uri: 'file:///cache/' } } };
      if (name === 'expo-crypto') return { randomUUID: uuid };
      if (name === 'react-native') return { Platform: { OS: 'ios' } };
      return load(path.resolve(root, 'src/features/compliance', `${name}.ts`));
    }, module, module.exports);
    const adapter = module.exports; const signal = new AbortController().signal;
    assert.equal((await adapter.pickReportAttachment(signal)).contentBase64, 'YWJj'); assert.equal(chooserOptions.copyToCacheDirectory, true); assert.equal(deleted.length, 1);
    nativeSize = commands.attachmentLimit + 1; await assert.rejects(adapter.pickReportAttachment(signal)); assert.equal(deleted.length, 2); nativeSize = 3;
    pick = { canceled: true, assets: null }; assert.equal(await adapter.pickReportAttachment(signal), null);
    const preview = adapter.createReportPreview(); await preview.open(new Blob(['abc']), '../../report.pdf', 'application/pdf', signal);
    assert.equal(opened.length, 1); assert.equal(written[0][0], 'YWJj'); assert.equal(written[0][1].encoding, 'base64');
    assert.ok(!opened[0].includes('../')); preview.dispose(); assert.equal(deleted.length, 3);
    const aborted = new AbortController(); aborted.abort(); await assert.rejects(adapter.pickReportAttachment(aborted.signal));
    await assert.rejects(preview.open(new Blob(['abc']), 'a', 'application/pdf', signal));
  });
  console.log(`PASS: ${groups} compliance workflow groups. Live backend policies/transitions and physical native UI remain unverified.`);
}
run().catch((error) => { console.error(error); process.exitCode = 1; });
