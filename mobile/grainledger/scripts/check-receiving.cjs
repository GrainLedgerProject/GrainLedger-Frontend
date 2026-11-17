/* Source-contract fixtures only; no real backend origin or account is used. */
const assert = require('node:assert/strict');
const path = require('node:path');
const fs = require('node:fs');
const { load, createAuthClient, memoryStorage, contracts } = require('./check-auth.cjs');
const root = path.join(__dirname, '..');
const moduleAt = (file) => load(path.join(root, file));

const {
  canAccessReceiving,
  isOperator,
  isManager,
  receivingRoles,
  calculateReceivingVariance,
  formatReceivingStatus,
  parseFacilityLookups,
  parseReceivingTaskPage,
  parseReceivingTaskDetail,
  createReceivingService,
} = moduleAt('src/features/mill/receiving-api.ts');

const { readReceivingId, safeReceivingPath } = moduleAt('src/navigation/mill-route.ts');
const { safeReturnPath } = contracts;

let passed = 0;
async function test(name, run) {
  await run();
  passed++;
  console.log(`PASS ${name}`);
}

async function run() {
  await test('role-scoped visibility: only Mill Operator, Mill Manager and Mill Admin have access', () => {
    // Authorized roles
    assert.equal(canAccessReceiving('MILL_OPERATOR'), true);
    assert.equal(canAccessReceiving('MILL_MANAGER'), true);
    assert.equal(canAccessReceiving('MILL_ADMIN'), true);

    // Denied roles
    assert.equal(canAccessReceiving('CUSTOMER_PROCUREMENT_OFFICER'), false);
    assert.equal(canAccessReceiving('CUSTOMER_MANAGER'), false);
    assert.equal(canAccessReceiving('CUSTOMER_EXPORT_OFFICER'), false);
    assert.equal(canAccessReceiving('AUTHORIZED_STOCK_VIEWER'), false);
    assert.equal(canAccessReceiving(null), false);
    assert.equal(canAccessReceiving('UNKNOWN_ROLE'), false);

    // Operator vs Manager role predicates
    assert.equal(isOperator('MILL_OPERATOR'), true);
    assert.equal(isOperator('MILL_ADMIN'), true);
    assert.equal(isOperator('MILL_MANAGER'), false);

    assert.equal(isManager('MILL_MANAGER'), true);
    assert.equal(isManager('MILL_ADMIN'), true);
    assert.equal(isManager('MILL_OPERATOR'), false);
  });

  await test('facility lookup parsing: accepts array or object envelope, rejects malformed', () => {
    const rawList = [
      { id: 'fac-1', name: 'Nhà máy Cái Bè' },
      { id: 'fac-2', name: 'Nhà máy Thốt Nốt' },
    ];
    assert.deepEqual(parseFacilityLookups(rawList), rawList);
    assert.deepEqual(parseFacilityLookups({ facilities: rawList }), rawList);

    for (const bad of [null, undefined, {}, [], [{ id: '' }], [{ name: 'Missing ID' }]]) {
      if (Array.isArray(bad) && bad.length === 0) {
        assert.deepEqual(parseFacilityLookups(bad), []);
      } else {
        assert.throws(() => parseFacilityLookups(bad), (err) => err.code === 'contract');
      }
    }
  });

  await test('receiving tasks list parsing: handles array and ApiPage envelopes, supports both backend & web aliases', () => {
    const taskBackend = {
      id: 'task-1',
      code: 'PRC-20261116-001',
      ownerCompanyName: 'Nông hộ Cái Bè',
      facilityId: 'fac-1',
      status: 'PENDING_ARRIVAL',
      receivingVersion: 1,
      receivedAt: '2026-11-16T03:00:00Z',
      expectedTotalKg: '15000.000000',
      actualTotalKg: null,
      originMoisturePercent: '14.5',
    };

    const taskWeb = {
      id: 'task-2',
      sourceLotCode: 'LOT-SRC-002',
      farmerName: 'HTX Nông nghiệp 1',
      status: 'AWAITING_MANAGER_REVIEW',
      originQuantityKg: '20000.00',
      arrivalMeasuredKg: '19950.00',
      arrivalMoisturePercent: '14.2',
    };

    const pageEnvelope = {
      items: [taskBackend, taskWeb],
      page: 1,
      pageSize: 25,
      totalCount: 2,
      hasMore: false,
    };

    const parsed = parseReceivingTaskPage(pageEnvelope, 1, 'fac-1');
    assert.equal(parsed.items.length, 2);
    assert.equal(parsed.items[0].code, 'PRC-20261116-001');
    assert.equal(parsed.items[0].expectedTotalKg, '15000.000000');
    assert.equal(parsed.items[1].code, 'LOT-SRC-002');
    assert.equal(parsed.items[1].ownerCompanyName, 'HTX Nông nghiệp 1');
    assert.equal(parsed.items[1].expectedTotalKg, '20000.00');
    assert.equal(parsed.items[1].actualTotalKg, '19950.00');
    assert.equal(parsed.paging.totalCount, 2);
    assert.equal(parsed.paging.hasMore, false);

    // Bare array
    const bareParsed = parseReceivingTaskPage([taskBackend], 1, 'fac-1');
    assert.equal(bareParsed.items.length, 1);
    assert.equal(bareParsed.paging, null);

    // Duplicate ID rejection
    assert.throws(
      () => parseReceivingTaskPage([taskBackend, taskBackend], 1, 'fac-1'),
      (err) => err.code === 'contract'
    );
  });

  await test('variance and ISO 22095 ±0.5% tolerance calculation', () => {
    // Within tolerance (+0.2%)
    const v1 = calculateReceivingVariance('10000.00', '10020.00', 0.5);
    assert.ok(v1);
    assert.equal(v1.diffKg, '20.00');
    assert.equal(v1.diffPercent, '0.20');
    assert.equal(v1.isWithinTolerance, true);
    assert.equal(v1.isPositive, true);

    // Within tolerance (-0.4%)
    const v2 = calculateReceivingVariance('10000.00', '9960.00', 0.5);
    assert.ok(v2);
    assert.equal(v2.diffKg, '-40.00');
    assert.equal(v2.diffPercent, '-0.40');
    assert.equal(v2.isWithinTolerance, true);
    assert.equal(v2.isPositive, false);

    // Outside tolerance (-0.8%)
    const v3 = calculateReceivingVariance('10000.00', '9920.00', 0.5);
    assert.ok(v3);
    assert.equal(v3.diffKg, '-80.00');
    assert.equal(v3.diffPercent, '-0.80');
    assert.equal(v3.isWithinTolerance, false);

    // Missing actual or expected
    assert.equal(calculateReceivingVariance('10000.00', null), null);
    assert.equal(calculateReceivingVariance(null, '10000.00'), null);
    assert.equal(calculateReceivingVariance('not-a-number', '10000.00'), null);
  });

  await test('receiving task detail parsing: strict identity check, line items, measurement sets and reviews', () => {
    const rawDetail = {
      id: 'task-100',
      code: 'PRC-DETAIL-100',
      ownerCompanyId: 'comp-1',
      ownerCompanyName: 'Công ty Lúa gạo Miền Tây',
      facilityId: 'fac-1',
      facilityName: 'Nhà máy Cái Bè',
      receivingLocationId: 'loc-1',
      receivingLocationName: 'Bến cân số 1',
      status: 'AWAITING_MANAGER_REVIEW',
      receivingVersion: 2,
      receivedAt: '2026-11-16T08:00:00Z',
      expectedTotalKg: '30000.000000',
      actualTotalKg: '29950.000000',
      usableStockKg: '29950.000000',
      latestMeasurementSetId: 'ms-1',
      effectiveThreshold: {
        defaultPercentage: '0.005000',
        effectivePercentage: '0.005000',
      },
      items: [
        {
          id: 'item-1',
          lineNo: 1,
          lotCode: 'LOT-20261116-01',
          riceVariety: 'ST25',
          expectedKg: '30000.000000',
          expectedUnit: 'KG',
          actualKg: '29950.000000',
          actualUnit: 'KG',
        },
      ],
      measurementSets: [
        {
          id: 'ms-1',
          operatorId: 'op-1',
          capturedAt: '2026-11-16T08:30:00Z',
          observations: 'Cân bến số 1 đạt chuẩn',
        },
      ],
      reviews: [
        {
          id: 'rev-1',
          action: 'REQUEST_REMEASUREMENT',
          reason: 'Cần cân lại do xe lệch trục',
          managerId: 'mgr-1',
          recordedAt: '2026-11-16T08:45:00Z',
        },
      ],
    };

    const parsed = parseReceivingTaskDetail(rawDetail, 'task-100');
    assert.equal(parsed.id, 'task-100');
    assert.equal(parsed.code, 'PRC-DETAIL-100');
    assert.equal(parsed.facilityName, 'Nhà máy Cái Bè');
    assert.equal(parsed.items.length, 1);
    assert.equal(parsed.items[0].riceVariety, 'ST25');
    assert.equal(parsed.measurementSets.length, 1);
    assert.equal(parsed.reviews.length, 1);
    assert.equal(parsed.reviews[0].action, 'REQUEST_REMEASUREMENT');

    // Mismatched ID rejection
    assert.throws(
      () => parseReceivingTaskDetail(rawDetail, 'task-different'),
      (err) => err.code === 'contract'
    );
  });

  await test('service contract: facilityId is required for listing; ID encoding & signal propagation', async () => {
    const calls = [];
    const mockApi = {
      request: async (endpoint, options) => {
        calls.push({ endpoint, options });
        if (endpoint === '/api/ledger/lookups') {
          return [{ id: 'fac-1', name: 'Nhà máy 1' }];
        }
        if (endpoint === '/api/ledger/receiving-tasks') {
          return { items: [], page: 1, pageSize: 25, totalCount: 0, hasMore: false };
        }
        if (endpoint.startsWith('/api/ledger/receiving/')) {
          const id = decodeURIComponent(endpoint.slice('/api/ledger/receiving/'.length));
          return {
            id,
            code: 'LOT-' + id,
            facilityId: 'fac-1',
            status: 'PENDING_ARRIVAL',
            expectedTotalKg: '1000.00',
          };
        }
        throw new Error('Unexpected endpoint ' + endpoint);
      },
    };

    const service = createReceivingService(mockApi);

    // List without facilityId must fail
    await assert.rejects(
      () => service.listTasks({ facilityId: '' }),
      (err) => err.code === 'configuration'
    );

    // List with facilityId
    const res = await service.listTasks({ facilityId: 'fac-1', search: 'ST25', status: 'PENDING_ARRIVAL' });
    assert.equal(res.items.length, 0);
    assert.equal(calls[0].endpoint, '/api/ledger/receiving-tasks');
    assert.equal(calls[0].options.query.facilityId, 'fac-1');
    assert.equal(calls[0].options.query.search, 'ST25');
    assert.equal(calls[0].options.query.status, 'PENDING_ARRIVAL');

    // Detail with special character encoding
    const specialId = 'xe & hàng #1';
    const detailRes = await service.getDetail(specialId);
    assert.equal(detailRes.id, specialId);
    assert.equal(calls[1].endpoint, `/api/ledger/receiving/${encodeURIComponent(specialId)}`);

    // Invalid detail ID
    await assert.rejects(() => service.getDetail(''), (err) => err.code === 'contract');
  });

  await test('safe routing: readReceivingId and safeReceivingPath reject traversal and unsafe URLs', () => {
    assert.equal(readReceivingId('task-123'), 'task-123');
    assert.equal(readReceivingId('uuid-550e8400-e29b-41d4-a716-446655440000'), 'uuid-550e8400-e29b-41d4-a716-446655440000');
    assert.equal(readReceivingId(''), null);
    assert.equal(readReceivingId('..'), null);
    assert.equal(readReceivingId('../etc/passwd'), null);
    assert.equal(readReceivingId('a/b'), null);
    assert.equal(readReceivingId('a%20b'), null);

    assert.equal(safeReceivingPath('/mill/receiving'), '/mill/receiving');
    assert.equal(safeReceivingPath('/mill/receiving/task-123'), '/mill/receiving/task-123');
    assert.equal(safeReceivingPath('/mill/receiving/../bad'), null);
    assert.equal(safeReceivingPath('https://evil.com/mill/receiving'), null);

    // safeReturnPath integration
    assert.equal(safeReturnPath('/mill/receiving'), '/mill/receiving');
    assert.equal(safeReturnPath('/mill/receiving/task-123'), '/mill/receiving/task-123');
    assert.equal(safeReturnPath('https://evil.com'), '/home');
  });

  console.log(`\nPASS: All ${passed} receiving test groups passed successfully.`);
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
