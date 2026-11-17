/* Group 5 contract/boundary fixtures only; no shared database reads/writes. */
const assert = require('node:assert/strict');
const path = require('node:path');
const { load, contracts, createAuthClient, memoryStorage } = require('./check-auth.cjs');
const root = path.join(__dirname, '..');
const at = (file) => load(path.join(root, file));
const common = at('src/features/governance/api-common.ts');
const residue = at('src/features/governance/residue-api.ts');
const policies = at('src/features/governance/safety-policy-api.ts');
const holds = at('src/features/governance/holds-api.ts');
const history = at('src/features/governance/history-api.ts');
const plans = at('src/features/governance/decisions-api.ts');
const forms = at('src/features/governance/residue-forms.ts');
const presentation = at('src/features/governance/event-presentation.ts');
const { createComplianceAction } = at('src/features/compliance/compliance-actions.ts');
const { createAsyncResource } = at('src/state/async-resource.ts');
const { ApiError } = at('src/services/api/errors.ts');
const plain = (value) => JSON.parse(JSON.stringify(value));
const uid = (n) => `00000000-0000-4000-8000-${String(n).padStart(12, '0')}`;
let serial = 100; const uuid = () => uid(++serial);
const now = () => '2026-11-17T03:00:00.000Z';
const user = (role = 'CUSTOMER_MANAGER', permissions = []) => contracts.parseUser({ id: uid(1), email: 'fixture@example.test', displayName: 'Fixture', phoneNumber: null,
  organizationId: uid(2), organizationName: 'Fixture', isActive: true, role, permissions });
const review = { id: uid(3), companyId: uid(2), effectiveFrom: '2020-01-01T00:00:00Z', effectiveTo: null, supersedesId: null, evidenceRef: 'Fixture evidence', applicabilityStatement: 'Fixture scope',
  reviewedBy: 'Fixture reviewer', reviewAuthority: 'Fixture authority', reviewedAt: '2020-01-01T00:00:00Z' };
const rule = { ...review, code: 'FIXTURE-PROFILE', versionNo: 1, kind: 'FLOW', schemaVersion: 2, substanceId: uid(4), commodityId: uid(5), residueDefinition: 'Fixture residue', unit: 'mg/kg', decimalPlaces: 6,
  laboratory: [{ analyticalMethod: 'Fixture method', numericInterpretationKind: 'NUMERIC_ABSOLUTE_UNCERTAINTY', relativeUncertaintyPercent: null, relativeUncertaintyAtZero: false, belowLimit: false, ndThresholdKind: null }], steps: [], asReceivedConfirmed: true };
const setting = { ...review, ruleCode: 'FIXTURE-PROFILE', versionNo: 1, mode: 'SYSTEM_DEFAULT' };
const selection = { ...review, sourceId: uid(6), substanceId: uid(4), selectedResultId: uid(7), supersededResultIds: [], residueDefinition: 'Fixture residue', absoluteUncertainty: null,
  reportingThreshold: null, schemaVersion: 2, asReceivedConfirmed: true, profileCode: 'FIXTURE-PROFILE', laboratoryMethod: 'Fixture method' };
const group = { ...review, code: 'FIXTURE-GROUP', versionNo: 1, substanceId: uid(4), sourceIds: [uid(6)], productStage: 'RAW_PADDY', productIdentity: 'RAW_PADDY', residueDefinition: 'Fixture residue',
  lower: '0.000000000000000001', upper: '0.01', unit: 'mg/kg', precedence: 'DIRECT_FIRST', supportingResultIds: [], decimalPlaces: 18, schemaVersion: 2, asReceivedConfirmed: true, profileCode: 'FIXTURE-PROFILE' };
const policy = { id: uid(20), companyId: uid(2), marketId: uid(21), commodityId: uid(5), versionNo: 2, effectiveFrom: '2020-01-01T00:00:00Z', effectiveTo: null, requiredSubstanceIds: [uid(4)],
  mrlMarginFraction: '0.200000000001', residueBasis: 'Fixture as-received basis', qualityRules: [{ attributeId: uid(22), unit: '%', calculation: 'MASS_WEIGHTED_MEAN' }], evidenceReference: 'Fixture evidence',
  reviewedBy: 'Fixture', reviewAuthority: 'Fixture', reviewedAt: '2020-01-01T00:00:00Z', publishedBy: uid(1), publishedAt: now() };
const hold = { id: uid(30), lotId: uid(31), lotCode: 'FIXTURE-LOT', reason: 'Fixture reason', status: 'ACTIVE', ownerId: uid(2), ownerName: 'Fixture', evidenceId: null, response: null, createdAt: now() };
const event = { id: uid(40), postingId: uid(41), kind: 'HOLD', occurredAt: now(), actorId: uid(1), operationId: null, lotId: uid(31), locationId: uid(42), ownerId: uid(2), ownerName: 'Fixture', quantityKg: '-1000000000000000.000001', reversesPostingId: null, details: { reason: 'Fixture', massKg: '0.000001' } };
const plan = { id: uid(50), orderId: uid(51), containerId: uid(52), specificationId: uid(53), versionNo: 1, version: 2, status: 'PROPOSED', targetMassKg: '12.000001', targetProductIdentity: null,
  demandSnapshot: '{}', createdAt: now(), cancelledAt: null, demandCurrent: true, canCancel: false, hasProposal: true };
const proposal = { id: uid(54), planId: plan.id, previewId: uid(55), proposedAt: now(), assessment: { assessmentStatus: 'PASS', selection: { allocations: [{ lotId: hold.lotId, locationId: uid(42), lotCode: hold.lotCode, quantityKg: '12.000001' }] } },
  demandCurrent: true, stockAndEvidenceCurrent: true, freshness: 'CURRENT', freshnessReasons: [], stockReserved: false };
const amounts = { reservedKg: '12.000001', releasedKg: '0.000001', consumedKg: '1.000000', remainingKg: '11.000000' };
const decision = { planId: plan.id, proposalId: proposal.id, status: 'PENDING', decisionVersion: 0, actorId: null, recordedAt: null, reason: null, activeApproval: false, reservation: { ...amounts, status: 'NOT_RESERVED', lines: [{ ...amounts, lotId: hold.lotId, locationId: uid(42) }] } };
const page = (items, number = 1, hasMore = false) => ({ items, page: number, pageSize: 20, totalCount: items.length + (hasMore ? 1 : 0), hasMore });
const deferred = () => { let resolve; const promise = new Promise((done) => { resolve = done; }); return { promise, resolve }; };
const signal = () => new AbortController().signal;
let passed = 0; async function test(name, fn) { await fn(); passed++; console.log(`PASS ${name}`); }
async function run() {
  await test('role/permission guards cover all seven roles and deny unauthorized policy/HOLD/decision writes before HTTP', async () => {
    for (const role of ['MILL_ADMIN', 'MILL_MANAGER', 'MILL_OPERATOR', 'CUSTOMER_PROCUREMENT_OFFICER', 'CUSTOMER_MANAGER', 'CUSTOMER_EXPORT_OFFICER', 'AUTHORIZED_STOCK_VIEWER']) {
      const owner = user(role, ['holds.manage', 'holds.process', 'blend.assessment-policy.manage', 'export-orders.read', 'blend.approve']);
      assert.equal(holds.mayCreateHold(owner), role === 'CUSTOMER_MANAGER'); assert.equal(holds.mayRespondHold(owner), role === 'MILL_MANAGER');
      assert.equal(policies.mayPublishAssessmentPolicy(owner), role === 'CUSTOMER_MANAGER'); assert.equal(policies.mayReadAssessmentPolicy(owner), ['CUSTOMER_MANAGER', 'CUSTOMER_EXPORT_OFFICER'].includes(role));
      assert.equal(plans.mayReadDecisions(owner), ['CUSTOMER_MANAGER', 'CUSTOMER_EXPORT_OFFICER', 'MILL_ADMIN'].includes(role));
    }
    let calls = 0; const api = { request: async () => { calls++; } };
    await assert.rejects(policies.createSafetyPolicyService(api, user('MILL_ADMIN', ['blend.assessment-policy.manage']), () => true).publish(policy, signal()), (e) => e.status === 403);
    await assert.rejects(holds.createHoldsService(api, user('MILL_OPERATOR', ['holds.process']), () => true).list(1, signal()), (e) => e.status === 403);
    await assert.rejects(plans.createDecisionService(api, user('CUSTOMER_MANAGER'), () => true).execute(plans.makeDecision('approve', plan, proposal, decision, '', uuid), signal()), (e) => e.status === 403);
    assert.equal(calls, 0);
  });
  await test('real MRL policy lookup sends scoped market/commodity/optional time and rejects mismatched company', async () => {
    const calls = []; let response = policy; const owner = user('CUSTOMER_MANAGER', ['export-orders.read']);
    const service = policies.createSafetyPolicyService({ request: async (...args) => { calls.push(args); return response; } }, owner, () => true);
    assert.equal((await service.applicable(policy.marketId, policy.commodityId, undefined, signal())).mrlMarginFraction, policy.mrlMarginFraction);
    assert.equal(calls[0][0], '/api/blend-assessment-policies/applicable'); assert.deepEqual(plain(calls[0][1].query), { marketId: policy.marketId, commodityId: policy.commodityId });
    await service.applicable(policy.marketId, policy.commodityId, now(), signal()); assert.equal(calls[1][1].query.at, now());
    response = { ...policy, companyId: uid(99) }; await assert.rejects(service.applicable(policy.marketId, policy.commodityId, undefined, signal()), (e) => e.code === 'contract');
    await assert.rejects(service.applicable('bad', policy.commodityId, undefined, signal())); assert.equal(calls.length, 3);
  });
  await test('MRL publication keeps exact margin/new-version evidence, strips server metadata and validates fraction/period/catalog duplicates', async () => {
    const calls = []; const service = policies.createSafetyPolicyService({ request: async (...args) => calls.push(args) }, user('CUSTOMER_MANAGER', ['blend.assessment-policy.manage']), () => true);
    await service.publish(policy, signal()); const body = calls[0][1].data;
    assert.equal(calls[0][0], '/api/blend-assessment-policies'); assert.equal(calls[0][1].method, 'POST'); assert.equal(body.mrlMarginFraction, '0.200000000001');
    assert.equal(body.id, policy.id); assert.equal(body.versionNo, 2); assert.equal('publishedAt' in body, false); assert.equal('companyId' in body, false);
    for (const invalid of [{ ...policy, mrlMarginFraction: '1' }, { ...policy, mrlMarginFraction: '-0.1' }, { ...policy, mrlMarginFraction: '0.1234567890123' },
      { ...policy, effectiveTo: '2019-01-01T00:00:00Z' }, { ...policy, reviewedAt: '2099-01-01T00:00:00Z' }, { ...policy, requiredSubstanceIds: [uid(4), uid(4)] }, { ...policy, qualityRules: [...policy.qualityRules, ...policy.qualityRules] }]) await assert.rejects(service.publish(invalid, signal()));
    assert.equal(calls.length, 1); await service.publish({ ...policy, mrlMarginFraction: '0' }, signal()); assert.equal(calls.length, 2);
  });
  await test('profile list/detail parse nested reviewed evidence and preserve global/company retirement scope', async () => {
    let response = { items: [rule] }; const calls = []; const owner = user('CUSTOMER_MANAGER', ['residue.company-policy.manage']);
    const service = residue.createResidueService({ request: async (...args) => { calls.push(args); return response; } }, owner, () => true);
    assert.equal((await service.rules(signal()))[0].laboratory[0].analyticalMethod, 'Fixture method'); assert.equal(calls[0][0], '/api/residue-rules');
    response = rule; assert.equal((await service.rule(rule.id, signal())).id, rule.id);
    assert.equal(residue.mayRetireRule(owner, rule), true); assert.equal(residue.mayRetireRule(owner, { ...rule, companyId: null }), false);
    assert.equal(residue.mayRetireRule(user('MILL_ADMIN', ['residue.policy.manage']), { ...rule, companyId: null }), true);
    assert.equal(residue.mayRetireRule(owner, { ...rule, companyId: uid(99) }), false); assert.equal(residue.mayRetireRule(owner, { ...rule, retirement: {} }), false);
    response = { ...rule, id: uid(99) }; await assert.rejects(service.rule(rule.id, signal()), (e) => e.code === 'contract');
  });
  await test('profile publication/retirement use exact endpoints and scope grants, preserve process IDs and never patch local series', async () => {
    const calls = []; const service = residue.createResidueService({ request: async (...args) => calls.push(args) }, user('CUSTOMER_MANAGER', ['residue.company-policy.manage']), () => true);
    const withStep = { ...rule, steps: [{ id: uid(8), process: 'DRYING', inputStage: 'RAW_PADDY', outputStage: 'DRIED_PADDY', outputFraction: 'DRIED_PADDY', conditions: 'Fixture reviewed conditions', factorLower: '0.000001', factorUpper: '0.5', factorSemantics: 'STEP_CONCENTRATION', anchorStage: null, homogeneousMixing: false }] };
    await service.execute({ kind: 'rules', data: withStep }, signal()); assert.equal(calls[0][1].data.steps[0].id, uid(8));
    await service.execute({ kind: 'retire', rule, data: { reason: ' Reviewed reason ' } }, signal()); assert.equal(calls[1][0], `/api/residue-rules/${rule.id}/retire`); assert.deepEqual(plain(calls[1][1].data), { reason: 'Reviewed reason' });
    await assert.rejects(service.execute({ kind: 'rules', data: { ...rule, companyId: null } }, signal()), (e) => e.status === 403);
    await assert.rejects(service.execute({ kind: 'rules', data: { ...rule, laboratory: [], steps: [] } }, signal()));
    await assert.rejects(service.execute({ kind: 'rules', data: { ...withStep, steps: [{ ...withStep.steps[0], factorLower: '2' }] } }, signal()));
    await assert.rejects(service.execute({ kind: 'retire', rule, data: { reason: '  ' } }, signal())); assert.equal(calls.length, 2);
  });
  await test('settings/batch/selections/groups retain immutable IDs and reviewed fields while enforcing same-company grants', async () => {
    const calls = []; const owner = user('CUSTOMER_MANAGER', ['residue.company-policy.manage', 'residue.evidence.manage']);
    const service = residue.createResidueService({ request: async (...args) => calls.push(args) }, owner, () => true);
    for (const [kind, data] of [['settings', setting], ['selections', selection], ['groups', group]]) await service.execute({ kind, data }, signal());
    assert.deepEqual(calls.map(([p]) => p), ['/api/residue-policy-settings', '/api/residue-report-selections', '/api/residue-source-groups']);
    assert.equal(calls[2][1].data.lower, '0.000000000000000001'); assert.equal(calls[1][1].data.absoluteUncertainty, null);
    await service.execute({ kind: 'settingsBatch', data: { items: [setting] } }, signal()); assert.equal(calls[3][0], '/api/residue-policy-settings/batch');
    await assert.rejects(service.execute({ kind: 'settingsBatch', data: { items: [setting, setting] } }, signal()));
    await assert.rejects(service.execute({ kind: 'selections', data: { ...selection, companyId: uid(99) } }, signal()), (e) => e.status === 403);
    await assert.rejects(service.execute({ kind: 'settings', data: { ...setting, mode: 'DISABLE' } }, signal())); assert.equal(calls.length, 4);
  });
  await test('selection preview is read-only POST, scoped and never falls back to empty/zero on failure', async () => {
    const calls = []; const service = residue.createResidueService({ request: async (...args) => { calls.push(args); return { reasons: ['Not yet confirmed'], upper: null }; } }, user('CUSTOMER_MANAGER', ['residue.evidence.manage']), () => true);
    const value = await service.previewSelection(selection, signal()); assert.equal(value.reasons[0], 'Not yet confirmed'); assert.equal(value.upper, null);
    assert.equal(calls[0][0], '/api/residue-report-selections/preview'); assert.equal(calls[0][1].method, 'POST');
    await assert.rejects(residue.createResidueService({ request: async () => ({}) }, user('CUSTOMER_MANAGER', ['residue.evidence.manage']), () => true).previewSelection(selection, signal()), (e) => e.code === 'contract');
  });
  await test('report review carries actual server fingerprints/effective time into confirmation and blocks unresolved/as-received cases', async () => {
    const preview = { reportId: uid(10), effectiveFrom: now(), rows: [{ input: { id: uid(11), resultId: uid(7), sourceId: uid(6), previewFingerprint: 'SERVER-FINGERPRINT', absoluteUncertainty: null, reportingThreshold: null, supersededResultIds: [] }, label: 'Fixture result', rawUncertainty: null,
      profile: rule, setting, assessment: { upper: '0.01' }, reasons: [], conflictingResults: [], existingSelections: [], published: false }] };
    const calls = []; const service = residue.createResidueService({ request: async (...args) => { calls.push(args); return preview; } }, user('CUSTOMER_MANAGER', ['residue.evidence.manage']), () => true);
    const value = await service.previewReview(preview.reportId, { companyId: uid(2), effectiveFrom: null, rows: [], asReceivedConfirmed: true }, signal());
    const prepared = { companyId: uid(2), ...residue.prepareReviewConfirmation(value, true) };
    await service.execute({ kind: 'reviewConfirm', reportId: preview.reportId, data: prepared }, signal());
    assert.equal(calls[1][0], `/api/lab-reports/${preview.reportId}/residue-review/confirm`); assert.equal(calls[1][1].data.rows[0].previewFingerprint, 'SERVER-FINGERPRINT'); assert.equal(calls[1][1].data.effectiveFrom, now());
    assert.throws(() => residue.prepareReviewConfirmation(value, false)); assert.throws(() => residue.prepareReviewConfirmation({ ...value, rows: [{ ...value.rows[0], reasons: ['Conflict'] }] }, true));
    await assert.rejects(service.execute({ kind: 'reviewConfirm', reportId: preview.reportId, data: { ...prepared, rows: [{ ...prepared.rows[0], previewFingerprint: null }] } }, signal())); assert.equal(calls.length, 2);
  });
  await test('reviewed forms normalize nullable/reference lists and integer metadata without converting decimal science/mass to Number', () => {
    const specs = [{ key: 'ids', kind: 'ids' }, { key: 'versionNo', kind: 'number' }, { key: 'nullable', nullable: true }, { key: 'rows', kind: 'array', fields: [{ key: 'count', kind: 'number' }] }];
    const data = forms.normalizeReviewedForm(specs, { ids: `${uid(1)},\n${uid(2)}`, versionNo: '2', nullable: '', rows: [{ count: '3', exact: '0.000000000000000001' }], exact: '99999999999999.999999' });
    assert.deepEqual(plain(data), { ids: [uid(1), uid(2)], versionNo: 2, nullable: null, rows: [{ count: 3, exact: '0.000000000000000001' }], exact: '99999999999999.999999' });
    assert.ok(Number.isNaN(forms.normalizeReviewedForm([{ key: 'number', kind: 'number' }], { number: '' }).number));
  });
  await test('HOLD reads use backend SQL status/reason/createdAt shape and paging; malformed/duplicate pages fail closed', async () => {
    const calls = []; let response = page([hold], 2, true); const service = holds.createHoldsService({ request: async (...args) => { calls.push(args); return response; } }, user('MILL_MANAGER'), () => true);
    assert.equal((await service.list(2, signal())).items[0].status, 'ACTIVE'); assert.deepEqual(plain(calls[0][1].query), { page: 2, pageSize: 50 });
    response = page([{ ...hold, createdAt: undefined, issuedAt: now() }], 2); await assert.rejects(service.list(2, signal()), (e) => e.code === 'contract');
    response = page([hold, hold], 2); await assert.rejects(service.list(2, signal())); response = page([], 1); await assert.rejects(service.list(2, signal()));
  });
  await test('HOLD creation uses actual input lot ID; response requires facility evidence and supports no RELEASE', async () => {
    const calls = []; const api = { request: async (...args) => calls.push(args) };
    const command = holds.createHoldCommand({ lotId: hold.lotId, lotCode: hold.lotCode, reasonCode: 'QA_REVIEW', notes: ' Reviewed concern ' }, uuid, now);
    assert.equal(command.data.lotId, hold.lotId); assert.notEqual(command.data.operationId, hold.lotId); assert.equal(command.data.reason, 'Reviewed concern');
    await holds.createHoldsService(api, user('CUSTOMER_MANAGER', ['holds.manage']), () => true).execute(command, signal());
    const response = holds.respondHoldCommand(hold.id, { evidenceId: uid(60), status: 'ISOLATED', response: 'Verified actual isolation', notes: 'Fixture evidence' }, uuid, now);
    await holds.createHoldsService(api, user('MILL_MANAGER', ['holds.process']), () => true).execute(response, signal());
    assert.equal(calls[1][0], `/api/ledger/holds/${hold.id}/respond`); assert.equal(calls[1][1].data.evidenceId, uid(60)); assert.equal(calls[1][1].data.responseKind, 'TRANSFER_QUARANTINE');
    assert.throws(() => holds.respondHoldCommand(hold.id, { ...response.data, evidenceId: '' }, uuid, now)); assert.throws(() => holds.respondHoldCommand(hold.id, { ...response.data, status: 'RELEASE_REQUESTED' }, uuid, now));
    await assert.rejects(holds.createHoldsService(api, user('MILL_ADMIN', ['holds.manage']), () => true).execute(command, signal()), (e) => e.status === 403); assert.equal(calls.length, 2);
  });
  await test('history strict parser permits multiple postings per event and preserves null/negative exact quantities', () => {
    const rows = history.parseHistory(page([event, { ...event, postingId: uid(43), quantityKg: null }]), 1).items;
    assert.equal(rows[0].quantityKg, '-1000000000000000.000001'); assert.equal(rows[1].quantityKg, null); assert.notEqual(history.historyKey(rows[0]), history.historyKey(rows[1]));
    assert.throws(() => history.parseHistory(page([event, event]), 1)); const missing = { ...event }; delete missing.details; assert.throws(() => history.parseHistory(page([missing]), 1));
    assert.throws(() => history.parseHistory(page([{ ...event, occurredAt: 'invalid' }]), 1)); assert.equal(history.filterHistory(rows, 'Lot', 'HOLD').length, 2);
  });
  await test('history search is real page25 sorted query; deep links never pretend event-ID search/detail endpoints exist', async () => {
    const calls = []; const service = history.createHistoryService({ request: async (...args) => { calls.push(args); return page([event], args[1].query.page); } }, user(), () => true);
    await service.list(3, ' LOT ', signal()); assert.deepEqual(plain(calls[0][1].query), { page: 3, pageSize: 25, search: 'LOT', sortBy: 'occurredAt', sortDirection: 'desc' });
    await service.list(1, '', signal(), { type: 'posting', id: event.postingId }); assert.equal(calls[1][1].query.search, undefined); assert.equal(calls[1][0], '/api/ledger/history');
    await service.list(1, '', signal(), { type: 'lot', id: event.lotId }); assert.equal(calls[2][1].query.lotId, event.lotId);
    await assert.rejects(service.list(1, '', signal(), { type: 'invalid', id: event.id })); assert.equal(calls.length, 3);
    assert.equal(presentation.readableDecimal('-1000000000000000.000001', 'en'), '-1,000,000,000,000,000.000001'); assert.deepEqual(plain(presentation.structuredDetails('{"reason":"fixture"}')), { reason: 'fixture' });
  });
  await test('explicit history reference lookup follows real pages and can be cancelled without assuming an ID endpoint', async () => {
    const calls = []; const progress = []; const service = history.createHistoryService({ request: async (path, init) => {
      calls.push({ path, query: init.query }); return init.query.page === 1 ? page([{ ...event, postingId: uid(99) }], 1, true) : page([event], 2);
    } }, user(), () => true);
    const found = await service.findReference({ type: 'posting', id: event.postingId }, signal(), (value) => progress.push(value));
    assert.equal(found.page, 2); assert.equal(found.entry.postingId, event.postingId); assert.deepEqual(progress, [1, 2]); assert.ok(calls.every((call) => call.path === '/api/ledger/history' && call.query.search === undefined));
    const abort = new AbortController(); let count = 0;
    const cancelled = history.createHistoryService({ request: async () => { count++; abort.abort(); return page([event], 1, true); } }, user(), () => true);
    await assert.rejects(cancelled.findReference({ type: 'posting', id: uid(99) }, abort.signal, () => {}), (e) => e.code === 'cancelled'); assert.equal(count, 1);
  });
  await test('decision selectors use exact order/container/plan page20 paths and validate parent identity', async () => {
    const calls = []; const order = { id: plan.orderId, code: 'ORDER', marketId: policy.marketId, commodityId: policy.commodityId, requiredMassKg: '12.000001', shippingFrom: now(), shippingTo: now(), createdAt: now(), version: 1 };
    const container = { id: plan.containerId, orderId: plan.orderId, internalCode: 'CONT', targetMassKg: '12.000001', originalMass: '12.000001', originalUnit: 'KG', status: 'DRAFT', version: 1 };
    let response = page([order]); const service = plans.createDecisionService({ request: async (...args) => { calls.push(args); return response; } }, user(), () => true);
    await service.orders(1, signal()); response = page([container]); await service.containers(order.id, 1, signal()); response = page([plan]); await service.plans(container.id, 1, signal());
    assert.deepEqual(calls.map(([p]) => p), ['/api/export-orders', `/api/export-orders/${order.id}/containers`, `/api/export-containers/${container.id}/blend-plans`]);
    assert.ok(calls.every(([, init]) => init.query.pageSize === 20)); response = page([{ ...container, orderId: uid(99) }]); await assert.rejects(service.containers(order.id, 1, signal()));
  });
  await test('plan detail conditionally reads proposal/decision, checks matching identities and never replaces a failure with a draft', async () => {
    const calls = []; let currentPlan = { ...plan, hasProposal: false }; let currentDecision = decision;
    const service = plans.createDecisionService({ request: async (path) => { calls.push(path); return path.endsWith('/proposal') ? proposal : path.endsWith('/decision') ? currentDecision : currentPlan; } }, user(), () => true);
    assert.equal((await service.detail(plan.id, signal())).proposal, null); assert.equal(calls.length, 1);
    currentPlan = plan; const data = await service.detail(plan.id, signal()); assert.equal(data.decision.decisionVersion, 0); assert.equal(calls.length, 4);
    currentDecision = { ...decision, proposalId: uid(99) }; await assert.rejects(service.detail(plan.id, signal()), (e) => e.status === 409);
  });
  await test('approval requires all source freshness/PASS/identity conditions; reject/revoke preserve reason and active-state rules', () => {
    assert.equal(plans.canApprove(proposal, decision), true);
    for (const changed of [{ ...proposal, freshness: 'STALE' }, { ...proposal, freshness: 'NOT_RECHECKED' }, { ...proposal, demandCurrent: false }, { ...proposal, stockAndEvidenceCurrent: null }, { ...proposal, assessment: { assessmentStatus: 'FAIL' } }, { ...proposal, id: uid(99) }]) assert.equal(plans.canApprove(changed, decision), false);
    assert.throws(() => plans.makeDecision('reject', plan, proposal, decision, ' ', uuid)); assert.throws(() => plans.makeDecision('revoke', plan, proposal, decision, 'Reason', uuid));
    const approved = { ...decision, status: 'APPROVED', activeApproval: true, decisionVersion: 1 };
    const revoke = plans.makeDecision('revoke', plan, proposal, approved, ' Reviewed reason ', uuid); assert.equal(revoke.data.reason, 'Reviewed reason'); assert.equal(revoke.data.expectedDecisionVersion, 1);
    assert.throws(() => plans.makeDecision('revoke', plan, proposal, { ...approved, activeApproval: false }, 'Reason', uuid));
  });
  await test('approve/reject/revoke POST bodies carry copied proposal/version/operation IDs and never adjust reservation amounts locally', async () => {
    const calls = []; const service = plans.createDecisionService({ request: async (...args) => calls.push(args) }, user('CUSTOMER_MANAGER', ['blend.approve']), () => true);
    const approve = plans.makeDecision('approve', plan, proposal, decision, '', uuid); await service.execute(approve, signal());
    await service.execute(plans.makeDecision('reject', plan, proposal, decision, 'Reason', uuid), signal()); await service.execute(plans.makeDecision('revoke', plan, proposal, { ...decision, status: 'APPROVED', activeApproval: true, decisionVersion: 3 }, 'Reason', uuid), signal());
    assert.equal(calls[0][0], `/api/blend-plans/${plan.id}/approve`); assert.deepEqual(plain(calls[0][1].data), plain(approve.data)); assert.equal(calls[2][1].data.expectedDecisionVersion, 3);
    assert.equal(calls[2][1].data.reservation, undefined); assert.equal(decision.reservation.remainingKg, '11.000000');
    await assert.rejects(service.execute({ ...approve, data: { ...approve.data, expectedDecisionVersion: 99 } }, signal()), (e) => e.status === 409); assert.equal(calls.length, 3);
  });
  await test('auth/abort/page races suppress late results and unchanged mutation retries keep immutable IDs/timestamps', async () => {
    let current = true; const pending = deferred(); let calls = 0;
    const service = residue.createResidueService({ request: async () => { calls++; return pending.promise; } }, user('CUSTOMER_MANAGER', ['residue.company-policy.manage']), () => current);
    const promise = service.execute({ kind: 'settings', data: setting }, signal()); current = false; pending.resolve({}); await assert.rejects(promise, (e) => e.code === 'cancelled');
    await assert.rejects(service.execute({ kind: 'settings', data: setting }, signal())); assert.equal(calls, 1);
    let fail = true; const captured = []; const action = createComplianceAction(async (command) => { captured.push(command); if (fail) throw new ApiError('timeout', 0, 'timeout'); });
    const build = () => holds.createHoldCommand({ lotId: hold.lotId, reasonCode: 'QA', notes: 'Concern' }, uuid, now);
    assert.equal(await action.submit('same', build), false); fail = false; assert.equal(await action.submit('same', build), true); assert.equal(captured[0], captured[1]);
    const waits = []; const resource = createAsyncResource(async () => { const d = deferred(); waits.push(d); return d.promise; });
    const first = resource.run(); const second = resource.run(); waits[1].resolve(page([event], 2)); await second; waits[0].resolve(page([], 1)); await first; assert.equal(resource.getSnapshot().data.page, 2); resource.reset();
  });
  await test('HTTP403/409/422/503/network stay errors without fallback, auto-retry or fabricated safety success', async () => {
    for (const error of [new ApiError('forbidden', 403, 'http'), new ApiError('conflict', 409, 'http'), new ApiError('invalid', 422, 'http'), new ApiError('not ready', 503, 'http'), new ApiError('offline', 0, 'network')]) {
      let calls = 0; const service = holds.createHoldsService({ request: async () => { calls++; throw error; } }, user(), () => true);
      await assert.rejects(service.list(1, signal()), (e) => e === error); assert.equal(calls, 1);
    }
  });
  await test('canonical safe return permits mounted governance routes only, rejecting traversal/queries/external/future features', () => {
    for (const value of ['/compliance/residue-profiles', '/events', `/events/posting/${event.postingId}`, '/risk/holds', '/risk/holds/new', '/export/plans/pending', `/export/plans/${plan.id}/review`]) assert.equal(contracts.safeReturnPath(value), value);
    for (const value of ['/events/unknown/id', '/events/event/a/b', '/events/event/%252f', '/risk/holds/release', `/export/plans/${plan.id}/review?approve=true`, '/export/orders', '//untrusted.test/events', '/events/event/%2e%2e']) assert.equal(contracts.safeReturnPath(value), '/home');
  });
  await test('actual Axios bearer JSON/query transport covers policy read, immutable residue publish, HOLD and versioned decision401 replay', async () => {
    const owner = user('CUSTOMER_MANAGER', ['export-orders.read', 'blend.assessment-policy.manage', 'residue.company-policy.manage', 'holds.manage', 'blend.approve']); let version = 1; const writes = []; const decisions = [];
    const token = () => `${Buffer.from('{"alg":"fixture"}').toString('base64url')}.${Buffer.from(JSON.stringify({ exp: Math.floor(Date.now()/1000)+3600, jti: version })).toString('base64url')}.fixture`;
    const tokens = () => ({ accessToken: token(), refreshToken: `fixture-refresh-${version}`, tokenType: 'Bearer', expiresIn: 3600, user: owner });
    const client = createAuthClient({ origin: 'https://governance.example.test', storage: memoryStorage(), fetcher: async (input, init) => {
      const request = new Request(input, init); const route = new URL(request.url); assert.equal(request.credentials, 'omit'); assert.equal(request.headers.get('Cookie'), null);
      if (route.pathname === '/api/auth/login') return new Response(JSON.stringify(tokens()), { headers: { 'Content-Type': 'application/json' } });
      if (route.pathname === '/api/auth/refresh') { version++; return new Response(JSON.stringify(tokens()), { headers: { 'Content-Type': 'application/json' } }); }
      assert.equal(request.headers.get('Authorization'), `Bearer ${token()}`);
      if (route.pathname.endsWith('/applicable')) { assert.equal(route.searchParams.get('marketId'), policy.marketId); return new Response(JSON.stringify(policy), { headers: { 'Content-Type': 'application/json' } }); }
      const body = await request.text(); writes.push({ path: route.pathname, method: request.method, data: JSON.parse(body) }); assert.match(request.headers.get('Content-Type'), /application\/json/);
      if (route.pathname.endsWith('/approve')) { decisions.push(body); if (decisions.length === 1) return new Response(null, { status: 401 }); }
      return new Response(null, { status: 204 });
    } });
    await client.initialize(); await client.login(owner.email, 'fixture-password', false); const scope = client.getRequestScope(); const current = () => client.getRequestScope() === scope;
    await policies.createSafetyPolicyService(client.api, owner, current).applicable(policy.marketId, policy.commodityId, undefined, signal());
    await residue.createResidueService(client.api, owner, current).execute({ kind: 'settings', data: setting }, signal());
    await holds.createHoldsService(client.api, owner, current).execute(holds.createHoldCommand({ lotId: hold.lotId, reasonCode: 'QA', notes: 'Concern' }, uuid, now), signal());
    await plans.createDecisionService(client.api, owner, current).execute(plans.makeDecision('approve', plan, proposal, decision, '', uuid), signal());
    assert.equal(writes.length, 4); assert.equal(decisions.length, 2); assert.equal(decisions[0], decisions[1]); assert.equal(writes[1].data.lotId, hold.lotId);
  });
  console.log(`PASS: ${passed} group-5 governance groups. Real backend deployment and native device acceptance remain separate.`);
}
run().catch((error) => { console.error(error); process.exitCode = 1; });
