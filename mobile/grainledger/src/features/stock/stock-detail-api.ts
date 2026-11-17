// Sources: web ledger.getLot, StockOverviewPage.LotItem, dashboardApi stock schema
// and tests/fixtures/dashboardData.ts (locationId). No web demo lineage is copied.
import { z } from 'zod';
import type { ApiClient } from '../../services/api/http-client';
import { ApiError } from '../../services/api/errors';
import { readLotId } from '../../navigation/stock-route';
import { stockLotSchema } from './stock-api';
export { readLotId };

const decimal = z.string().regex(/^-?\d+(\.\d+)?$/);
const positionSchema = z.object({
  facilityId: z.string().min(1), locationId: z.string().min(1).nullish(),
  quantityKg: decimal, availableKg: decimal,
});
const compositionSchema = z.object({
  farmerName: z.string(), plotCode: z.string(), percentage: z.number().finite(), massKg: decimal,
});
// The source also has position-based lots without top-level summary/status fields.
// Missing summaries are unknown; never aggregate positions into an invented ledger balance.
const detailSchema = stockLotSchema.partial({ quantityKg: true, status: true }).extend({
  moisturePercent: z.number().finite().nullish(),
  positions: z.array(positionSchema).nullish(),
  composition: z.array(compositionSchema).nullish(),
  restrictions: z.array(z.string().min(1)).nullish(),
});
export type StockLotDetail = z.infer<typeof detailSchema>;
export type StockPosition = z.infer<typeof positionSchema>;
export type StockComposition = z.infer<typeof compositionSchema>;

export function parseStockDetail(value: unknown, requestedId: string): StockLotDetail | null {
  // A genuinely empty successful response is distinct from malformed data or denied access.
  if (value === null || value === undefined) return null;
  const result = detailSchema.safeParse(value);
  if (!result.success || result.data.id !== requestedId) {
    throw new ApiError('Dữ liệu chi tiết lô không đúng định dạng. / Invalid lot detail response.', 0, 'contract');
  }
  return result.data;
}
export function createStockDetailService(api: ApiClient) {
  return {
    async getDetail(id: string | null, signal?: AbortSignal) {
      const validId = readLotId(id);
      if (validId === null) throw new ApiError('Invalid lot identifier.', 0, 'configuration');
      const value = await api.request(`/api/ledger/lots/${encodeURIComponent(validId)}`, { signal });
      return parseStockDetail(value, validId);
    },
  };
}
