import { describe, expect, it, vi } from 'vitest';
import { ledgerEndpoints } from '@/api/ledger';
import { apiFetch } from '@/api/client';
import { parseLedgerHistoryResponse, type LedgerHistoryEntry } from '@/api/history';
import { toAuditEvent } from '@/features/audit/model/historyEvent';

vi.mock('@/api/client', () => ({ apiFetch: vi.fn() }));

const entry: LedgerHistoryEntry = {
  id: 'event-1', postingId: 'posting-1', kind: 'MILLING',
  occurredAt: '2026-11-12T03:00:00Z', actorId: 'actor-1',
  operationId: 'operation-1', lotId: 'lot-1', locationId: 'location-1',
  ownerId: 'owner-1', ownerName: 'Customer', quantityKg: '-125.500',
  reversesPostingId: null, details: { declaredLossKg: '2.500' },
};
const result = { items: [entry], page: 2, pageSize: 25, totalCount: 31, hasMore: false };

describe('GET /api/ledger/history', () => {
  it('preserves the actual paginated backend response and decimal strings', () => {
    expect(parseLedgerHistoryResponse(result)).toEqual(result);
    expect(parseLedgerHistoryResponse(result).items[0].quantityKg).toBe('-125.500');
  });

  it('maps actual field names and distinguishes separate postings of the same event', () => {
    const first = toAuditEvent(entry);
    const second = toAuditEvent({ ...entry, postingId: 'posting-2' });
    expect(first).toMatchObject({ eventType: 'MILLING', timestamp: entry.occurredAt, entityType: 'Lot', entityId: 'lot-1', actorId: 'actor-1', payload: entry.details });
    expect(first.rowKey).not.toBe(second.rowKey);
    expect(first).not.toHaveProperty('actorEmail');
    expect(first).not.toHaveProperty('hash');
  });

  it('supports events without a posting or lot', () => {
    const item = { ...entry, postingId: null, lotId: null, locationId: null, quantityKg: null };
    expect(toAuditEvent(item)).toMatchObject({ entityType: 'Operation', entityId: 'operation-1', quantityKg: null });
    expect(toAuditEvent({ ...item, operationId: null })).toMatchObject({ entityType: 'Event', entityId: 'event-1' });
  });

  it('reports an invalid response rather than hiding it as an empty history', () => {
    for (const invalid of [null, [], { items: [] }, { ...result, items: [{ id: 'wrong-schema' }] }, { ...result, items: [{ ...entry, occurredAt: 'invalid' }] }]) {
      expect(() => parseLedgerHistoryResponse(invalid)).toThrow('không đúng định dạng');
    }
    expect(parseLedgerHistoryResponse({ ...result, items: [], totalCount: 0, page: 1 }).items).toEqual([]);
  });

  it('sends supported filters, ordering, pagination and cancellation to the API', async () => {
    vi.mocked(apiFetch).mockResolvedValue(result);
    const controller = new AbortController();
    await expect(ledgerEndpoints.getHistory({ page: 2, pageSize: 25, sortBy: 'occurredAt', sortDirection: 'desc', facilityId: 'mill/a', kind: 'MILLING', search: undefined }, { signal: controller.signal })).resolves.toEqual(result);
    expect(apiFetch).toHaveBeenCalledWith('/api/ledger/history?page=2&pageSize=25&sortBy=occurredAt&sortDirection=desc&facilityId=mill%2Fa&kind=MILLING', { signal: controller.signal });
  });
});
