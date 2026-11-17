// Source: web StockOverviewPage.tsx, api/ledger.ts and api/query.ts.
import { z } from 'zod';
import { Decimal, formatMass } from '../dashboard/model/mass';
import type { ApiClient } from '../../services/api/http-client';
import { ApiError } from '../../services/api/errors';

export const stockStages = ['', 'PADDY', 'BROWN', 'MILLED', 'BLENDED', 'PACKED'] as const;
export type StockStage = typeof stockStages[number];
const decimal = z.string().regex(/^-?\d+(\.\d+)?$/);
const name = z.string().nullish();
export const stockLotSchema = z.object({
  id: z.string().min(1), code: z.string().min(1), stage: z.string().min(1),
  status: z.string().min(1), quantityKg: decimal,
  availableKg: decimal.nullish(), reservedKg: decimal.nullish(), quarantinedKg: decimal.nullish(),
  commodityName: name, facilityName: name, locationName: name, ownerName: name,
});
export type StockLot = z.infer<typeof stockLotSchema>;
export interface StockPage {
  items: StockLot[];
  paging: { page: number; pageSize: number; totalCount: number; hasMore: boolean } | null;
}
const positiveInt = z.number().int().positive().max(Number.MAX_SAFE_INTEGER);
const collectionSchema = z.object({
  items: z.array(stockLotSchema), page: positiveInt.optional(), pageSize: positiveInt.optional(),
  totalCount: z.number().int().nonnegative().max(Number.MAX_SAFE_INTEGER).optional(),
  hasMore: z.boolean().optional(),
});
function invalidResponse(): never {
  throw new ApiError('Dữ liệu tồn kho không đúng định dạng. / Invalid stock response.', 0, 'contract');
}
export function parseStockPage(value: unknown, requestedPage = 1): StockPage {
  const parsed = collectionSchema.safeParse(Array.isArray(value) ? { items: value } : value);
  if (!parsed.success) return invalidResponse();
  const { items, page, pageSize, totalCount, hasMore } = parsed.data;
  if (new Set(items.map((lot) => lot.id)).size !== items.length) return invalidResponse();
  const complete = page !== undefined && pageSize !== undefined && totalCount !== undefined && hasMore !== undefined;
  if (complete) {
    const offset = (page - 1) * pageSize;
    if (page !== requestedPage || !Number.isSafeInteger(offset) || items.length > pageSize ||
      (items.length > 0 && offset + items.length > totalCount) ||
      hasMore !== (offset + items.length < totalCount) || (hasMore && items.length === 0)) return invalidResponse();
    return { items, paging: { page, pageSize, totalCount, hasMore } };
  }
  // Legacy arrays/items-only responses do not establish a paging contract.
  if (requestedPage !== 1) return invalidResponse();
  return { items, paging: null };
}
export function createStockService(api: ApiClient) {
  return {
    async list(query: { stage: StockStage; search: string; page: number }, signal?: AbortSignal) {
      const value = await api.request('/api/ledger/lots', { signal, query: {
        stage: query.stage || undefined, search: query.search || undefined, pageSize: 50,
        // First request matches StockOverviewPage; only a verified envelope enables later pages.
        page: query.page === 1 ? undefined : query.page,
      } });
      return parseStockPage(value, query.page);
    },
  };
}
export function stockTotals(items: StockLot[]) {
  const total = (key: 'quantityKg' | 'availableKg' | 'reservedKg' | 'quarantinedKg') => {
    if (items.some((lot) => lot[key] == null)) return null;
    return items.reduce((sum, lot) => sum.plus(lot[key]!), new Decimal(0)).toString();
  };
  return { quantityKg: total('quantityKg'), availableKg: total('availableKg'),
    reservedKg: total('reservedKg'), quarantinedKg: total('quarantinedKg') };
}
export { formatMass };
