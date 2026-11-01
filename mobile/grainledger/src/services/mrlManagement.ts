import { Decimal } from 'decimal.js';
import { createCatalogsEndpoints, type CreateMrlVersionRequest, type ImportMrlVersionRequest, type UpsertMrlLimitRequest } from './endpoints/catalogs';
import type { ApiTransport } from './endpoints/transport';
import { isCatalogItem, isRecord, parseManagementList, requireResult } from './management';

// Both response representations are present in the web page and its API DTO.
export interface MrlSummary { id: string; marketName: string; commodityName: string; effectiveFrom: string; sourceRef: string; status: 'DRAFT' | 'PUBLISHED' | 'ARCHIVED' }
export interface MrlLimit { substanceId: string; substanceName?: string; limitValue: number; unit: string }

export function parseMrlVersions(value: unknown): MrlSummary[] {
  const items: unknown = Array.isArray(value) ? value : isRecord(value) ? value.items : undefined;
  if (!Array.isArray(items)) throw new Error('Danh sách phiên bản MRL không đúng định dạng.');
  return items.map((item: unknown) => {
    if (!isRecord(item) || typeof item.id !== 'string' || typeof item.effectiveFrom !== 'string') throw new Error('Phiên bản MRL thiếu thông tin.');
    const status = item.status === 'DRAFT' || item.status === 'PUBLISHED' || item.status === 'ARCHIVED' ? item.status
      : typeof item.isPublished === 'boolean' ? item.isPublished ? 'PUBLISHED' : 'DRAFT' : null;
    if (!status) throw new Error('Trạng thái phiên bản MRL không hợp lệ.');
    return { id: item.id, status, effectiveFrom: item.effectiveFrom,
      marketName: typeof item.marketName === 'string' ? item.marketName : typeof item.marketId === 'string' ? item.marketId : 'Chưa ghi nhận thị trường',
      commodityName: typeof item.commodityName === 'string' ? item.commodityName : typeof item.commodityId === 'string' ? item.commodityId : 'Chưa ghi nhận hàng hóa',
      sourceRef: typeof item.sourceRef === 'string' ? item.sourceRef : '' };
  });
}

function isMrlLimit(value: unknown): value is MrlLimit {
  return isRecord(value) && typeof value.substanceId === 'string' && typeof value.limitValue === 'number' && Number.isFinite(value.limitValue)
    && typeof value.unit === 'string' && (value.substanceName === undefined || typeof value.substanceName === 'string');
}

export function buildMrlVersion(marketId: string, commodityId: string, date: string, source: string): CreateMrlVersionRequest {
  if (!marketId || !commodityId) throw new Error('Vui lòng chọn thị trường và hàng hóa.');
  const input = date.trim();
  const timestamp = Date.parse(`${input}T00:00:00.000Z`);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(input) || !Number.isFinite(timestamp) || new Date(timestamp).toISOString().slice(0, 10) !== input) {
    throw new Error('Ngày hiệu lực phải hợp lệ và theo dạng năm-tháng-ngày.');
  }
  return { marketId, commodityId, effectiveFrom: new Date(timestamp).toISOString(), effectiveTo: null, sourceRef: source.trim() || null };
}

export function buildMrlLimit(value: string, unit: string): UpsertMrlLimitRequest {
  const normalized = value.trim().replace(',', '.');
  if (!/^\d+(?:\.\d+)?$/.test(normalized) || !unit.trim()) throw new Error('Vui lòng nhập giới hạn không âm và đơn vị đo.');
  return { limitValue: new Decimal(normalized).toFixed(), unit: unit.trim() };
}

export function parseMrlImport(text: string): ImportMrlVersionRequest {
  let value: unknown;
  try { value = JSON.parse(text); }
  catch { throw new Error('Nội dung JSON chưa hợp lệ. Vui lòng kiểm tra lại.'); }
  if (!isRecord(value) || typeof value.marketId !== 'string' || !value.marketId.trim()
    || typeof value.commodityId !== 'string' || !value.commodityId.trim()) {
    throw new Error('Dữ liệu nhập cần marketId và commodityId.');
  }
  const nullableString = (input: unknown): input is string | null => input === null || typeof input === 'string';
  if (!nullableString(value.effectiveFrom) || !nullableString(value.effectiveTo) || !nullableString(value.sourceRef)) {
    throw new Error('effectiveFrom, effectiveTo và sourceRef phải là chuỗi hoặc null.');
  }
  if (value.limits !== null && !Array.isArray(value.limits)) throw new Error('limits phải là danh sách hoặc null.');
  const limits = value.limits === null ? null : value.limits.map((entry: unknown) => {
    if (!isRecord(entry) || !nullableString(entry.substanceCode) || !nullableString(entry.limitValue) || !nullableString(entry.unit)) {
      throw new Error('Mỗi giới hạn cần substanceCode, limitValue và unit dạng chuỗi hoặc null.');
    }
    // Keep the contract's decimal string verbatim; converting JSON numbers loses precision.
    if (entry.limitValue !== null && !/^\d+(?:\.\d+)?$/.test(entry.limitValue)) {
      throw new Error('limitValue phải là chuỗi số thập phân không âm.');
    }
    return { substanceCode: entry.substanceCode, limitValue: entry.limitValue, unit: entry.unit };
  });
  return { marketId: value.marketId, commodityId: value.commodityId, effectiveFrom: value.effectiveFrom,
    effectiveTo: value.effectiveTo, sourceRef: value.sourceRef, limits };
}

export function createMrlManager(transport: ApiTransport) {
  const api = createCatalogsEndpoints(transport).catalogEndpoints;
  return {
    async load() {
      const [versions, markets, commodities, substances] = await Promise.all([api.getMrlVersions(), api.getMarkets(), api.getCommodities(), api.getActiveSubstances()]);
      return { versions: parseMrlVersions(requireResult(versions)), markets: parseManagementList(requireResult(markets), isCatalogItem),
        commodities: parseManagementList(requireResult(commodities), isCatalogItem), substances: parseManagementList(requireResult(substances), isCatalogItem) };
    },
    async create(request: CreateMrlVersionRequest) { requireResult(await api.createMrlVersion(request)); },
    async importVersion(text: string) { requireResult(await api.importMrlVersion(parseMrlImport(text))); },
    async limits(id: string) { return parseManagementList(requireResult(await api.getMrlLimits(id)), isMrlLimit); },
    async saveLimit(id: string, substanceId: string, value: string, unit: string) {
      if (!substanceId) throw new Error('Vui lòng chọn hoạt chất.');
      requireResult(await api.upsertMrlLimit(id, substanceId, buildMrlLimit(value, unit)));
    },
    async removeLimit(id: string, substanceId: string) { requireResult(await api.deleteMrlLimit(id, substanceId)); },
    async publish(id: string) { requireResult(await api.publishMrlVersion(id)); },
  };
}
