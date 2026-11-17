import { z } from 'zod';
import type { AuthUser } from '../auth/contracts';
import type { ApiClient } from '../../services/api/http-client';
import { ApiError } from '../../services/api/errors';
import { contract, dateTime, decimalText, idSchema, nullableText as n, pageNumber, scopedApi, uniqueBy } from './api-common';

// Exact web api/history.ts fields; event ID repeats for multiple postings. Composite identity matters.
export const historyEntrySchema = z.object({ id: z.string(), postingId: n, kind: z.string(), occurredAt: dateTime, actorId: z.string(),
  operationId: n, lotId: n, locationId: n, ownerId: n, ownerName: n, quantityKg: decimalText.nullable(), reversesPostingId: n, details: z.unknown() });
export type HistoryEntry = z.infer<typeof historyEntrySchema>;
export const historyKey = (row: HistoryEntry) => `${row.id}:${row.postingId ?? 'event'}`;
export const historyEntity = (row: HistoryEntry) => row.lotId ? 'Lot' : row.operationId ? 'Operation' : 'Event';
export function parseHistory(value: unknown, page: number) {
  const data = contract(z.object({ items: z.array(historyEntrySchema), page: z.number().int().positive(), pageSize: z.number().int().positive(), totalCount: z.number().int().nonnegative(), hasMore: z.boolean() }), value);
  if (data.page !== page || data.items.some((row) => !Object.prototype.hasOwnProperty.call(row, 'details'))) throw new ApiError('Unsupported history page.', 0, 'contract');
  uniqueBy(data.items, historyKey); return data;
}
export function filterHistory(rows: HistoryEntry[], entity: string, kind: string) {
  return rows.filter((row) => (entity === 'ALL' || entity === historyEntity(row)) && (kind === 'ALL' || kind === row.kind));
}
export function createHistoryService(api: ApiClient, user: AuthUser, current: () => boolean) {
  const transport = scopedApi(api, user, current);
  async function list(page: number, search: string, signal: AbortSignal, entityScope?: { type: string; id: string }) {
      const query: Record<string, unknown> = { page: pageNumber(page), pageSize: 25, search: search.trim() || undefined, sortBy: 'occurredAt', sortDirection: 'desc' };
      if (entityScope) {
        contract(idSchema, entityScope.id);
        if (entityScope.type.toLowerCase() === 'lot') query.lotId = entityScope.id;
        // Backend history search covers code/owner/kind, not event/posting IDs. Resolve those within real pages, never send a fictitious ID filter.
        else if (['event', 'posting', 'operation'].includes(entityScope.type.toLowerCase())) query.search = undefined;
        else throw new ApiError('Unsupported history reference.', 0, 'contract');
      }
      return parseHistory(await transport.request('/api/ledger/history', { query, signal }), page);
  }
  return { list,
    async findReference(reference: { type: string; id: string }, signal: AbortSignal, progress: (page: number) => void) {
      contract(idSchema, reference.id);
      if (!['event', 'posting', 'operation'].includes(reference.type)) throw new ApiError('Unsupported reference lookup.', 0, 'contract');
      for (let page = 1; ; page++) {
        transport.check(signal); progress(page);
        const data = await list(page, '', signal);
        const entry = data.items.find((row) => reference.type === 'posting' ? row.postingId === reference.id : reference.type === 'operation' ? row.operationId === reference.id : row.id === reference.id);
        if (entry) return { page, entry };
        if (!data.hasMore) return null;
        if (!data.items.length) throw new ApiError('History paging cannot advance.', 0, 'contract');
      }
    },
  };
}
