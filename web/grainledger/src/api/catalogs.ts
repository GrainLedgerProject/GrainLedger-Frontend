import type * as ApiSchemas from './generated/schemas';
export type { ImportMrlLimitRequest, ImportMrlVersionRequest, CreateMrlVersionRequest, UpsertMrlLimitRequest } from './generated/schemas';
import { apiFetch } from './client';

type ListParams = Record<string, string | number | boolean | undefined>;

function withQuery(path: string, params?: ListParams) {
  if (!params) return path;
  const query = new URLSearchParams(
    Object.entries(params)
      .filter(([, value]) => value !== undefined && value !== '')
      .map(([key, value]) => [key, String(value)])
  ).toString();
  return query ? `${path}?${query}` : path;
}

export interface ActiveSubstanceDto {
  id: string;
  code: string;
  name: string;
  category?: string;
  safetyIntervalDays?: number;
}

export interface MrlLimitDto {
  id: string;
  mrlVersionId: string;
  substanceId: string;
  limitValue: number;
  unit: string;
}

export interface MrlVersionDto {
  id: string;
  marketId: string;
  commodityId: string;
  versionNo: number;
  effectiveFrom: string;
  effectiveTo: string | null;
  status: string;
  publishedBy: string | null;
  publishedAt: string | null;
  sourceRef: string;
}

export interface MrlVersionListResponse {
  items: MrlVersionDto[];
  page: number;
  pageSize: number;
  hasMore: boolean;
}

export interface MrlLimitListResponse {
  items: MrlLimitDto[];
  page: number;
  pageSize: number;
  hasMore: boolean;
}

export const catalogEndpoints = {
  // Active substances
  getActiveSubstances: (params?: ListParams) => apiFetch<unknown>(withQuery('/api/active-substances', params)),
  getActiveSubstance: (id: string) => apiFetch<unknown>(`/api/active-substances/${encodeURIComponent(id)}`),
  createActiveSubstance: (req: ApiSchemas.CreateActiveSubstanceRequest) =>
    apiFetch<unknown>('/api/active-substances', {
      method: 'POST',
      body: JSON.stringify(req),
    }),
  updateActiveSubstance: (id: string, req: ApiSchemas.UpdateActiveSubstanceRequest) =>
    apiFetch<unknown>(`/api/active-substances/${encodeURIComponent(id)}`, {
      method: 'PATCH',
      body: JSON.stringify(req),
    }),
  patchActiveSubstance: (id: string, req: ApiSchemas.UpdateActiveSubstanceRequest) =>
    apiFetch<unknown>(`/api/active-substances/${encodeURIComponent(id)}`, {
      method: 'PATCH',
      body: JSON.stringify(req),
    }),
  deleteActiveSubstance: (id: string) =>
    apiFetch<unknown>(`/api/active-substances/${encodeURIComponent(id)}`, {
      method: 'DELETE',
    }),

  // Markets
  getMarkets: (params?: ListParams) => apiFetch<unknown>(withQuery('/api/markets', params)),
  getMarket: (id: string) => apiFetch<unknown>(`/api/markets/${encodeURIComponent(id)}`),
  createMarket: (req: ApiSchemas.CreateMarketRequest) =>
    apiFetch<unknown>('/api/markets', {
      method: 'POST',
      body: JSON.stringify(req),
    }),
  updateMarket: (id: string, req: ApiSchemas.UpdateMarketRequest) =>
    apiFetch<unknown>(`/api/markets/${encodeURIComponent(id)}`, {
      method: 'PATCH',
      body: JSON.stringify(req),
    }),
  patchMarket: (id: string, req: ApiSchemas.UpdateMarketRequest) =>
    apiFetch<unknown>(`/api/markets/${encodeURIComponent(id)}`, {
      method: 'PATCH',
      body: JSON.stringify(req),
    }),


  // Commodities
  getCommodities: (params?: ListParams) => apiFetch<unknown>(withQuery('/api/commodities', params)),
  getCommodity: (id: string) => apiFetch<unknown>(`/api/commodities/${encodeURIComponent(id)}`),
  createCommodity: (req: ApiSchemas.CreateCommodityRequest) =>
    apiFetch<unknown>('/api/commodities', {
      method: 'POST',
      body: JSON.stringify(req),
    }),
  updateCommodity: (id: string, req: ApiSchemas.UpdateCommodityRequest) =>
    apiFetch<unknown>(`/api/commodities/${encodeURIComponent(id)}`, {
      method: 'PATCH',
      body: JSON.stringify(req),
    }),
  patchCommodity: (id: string, req: ApiSchemas.UpdateCommodityRequest) =>
    apiFetch<unknown>(`/api/commodities/${encodeURIComponent(id)}`, {
      method: 'PATCH',
      body: JSON.stringify(req),
    }),
  deleteCommodity: (id: string) =>
    apiFetch<unknown>(`/api/commodities/${encodeURIComponent(id)}`, {
      method: 'DELETE',
    }),

  // Quality attributes
  getQualityAttributes: (params?: ListParams) => apiFetch<unknown>(withQuery('/api/quality-attributes', params)),
  getQualityAttribute: (id: string) => apiFetch<unknown>(`/api/quality-attributes/${encodeURIComponent(id)}`),
  createQualityAttribute: (req: ApiSchemas.CreateQualityAttributeRequest) =>
    apiFetch<unknown>('/api/quality-attributes', {
      method: 'POST',
      body: JSON.stringify(req),
    }),
  updateQualityAttribute: (id: string, req: ApiSchemas.UpdateQualityAttributeRequest) =>
    apiFetch<unknown>(`/api/quality-attributes/${encodeURIComponent(id)}`, {
      method: 'PATCH',
      body: JSON.stringify(req),
    }),
  patchQualityAttribute: (id: string, req: ApiSchemas.UpdateQualityAttributeRequest) =>
    apiFetch<unknown>(`/api/quality-attributes/${encodeURIComponent(id)}`, {
      method: 'PATCH',
      body: JSON.stringify(req),
    }),


  // Rice varieties
  getRiceVarieties: (params?: ListParams) => apiFetch<unknown>(withQuery('/api/rice-varieties', params)),
  getRiceVariety: (id: string) => apiFetch<unknown>(`/api/rice-varieties/${encodeURIComponent(id)}`),
  createRiceVariety: (req: ApiSchemas.CreateRiceVarietyRequest) =>
    apiFetch<unknown>('/api/rice-varieties', {
      method: 'POST',
      body: JSON.stringify(req),
    }),
  updateRiceVariety: (id: string, req: ApiSchemas.UpdateRiceVarietyRequest) =>
    apiFetch<unknown>(`/api/rice-varieties/${encodeURIComponent(id)}`, {
      method: 'PATCH',
      body: JSON.stringify(req),
    }),
  patchRiceVariety: (id: string, req: ApiSchemas.UpdateRiceVarietyRequest) =>
    apiFetch<unknown>(`/api/rice-varieties/${encodeURIComponent(id)}`, {
      method: 'PATCH',
      body: JSON.stringify(req),
    }),


  // Measurement units
  getMeasurementUnits: (params?: ListParams) => apiFetch<unknown>(withQuery('/api/measurement-units', params)),
  getMeasurementUnit: (id: string) => apiFetch<unknown>(`/api/measurement-units/${encodeURIComponent(id)}`),
  createMeasurementUnit: (req: ApiSchemas.CreateMeasurementUnitRequest) =>
    apiFetch<unknown>('/api/measurement-units', {
      method: 'POST',
      body: JSON.stringify(req),
    }),
  updateMeasurementUnit: (id: string, req: ApiSchemas.UpdateMeasurementUnitRequest) =>
    apiFetch<unknown>(`/api/measurement-units/${encodeURIComponent(id)}`, {
      method: 'PATCH',
      body: JSON.stringify(req),
    }),
  patchMeasurementUnit: (id: string, req: ApiSchemas.UpdateMeasurementUnitRequest) =>
    apiFetch<unknown>(`/api/measurement-units/${encodeURIComponent(id)}`, {
      method: 'PATCH',
      body: JSON.stringify(req),
    }),
  deleteMeasurementUnit: (id: string) =>
    apiFetch<unknown>(`/api/measurement-units/${encodeURIComponent(id)}`, {
      method: 'DELETE',
    }),

  // MRL table versions
  getMrlVersions: () => apiFetch<MrlVersionListResponse>('/api/mrl-versions'),
  getMrlVersion: (id: string) => apiFetch<MrlVersionDto>(`/api/mrl-versions/${encodeURIComponent(id)}`),
  createMrlVersion: (req: ApiSchemas.CreateMrlVersionRequest) =>
    apiFetch<unknown>('/api/mrl-versions', {
      method: 'POST',
      body: JSON.stringify(req),
    }),
  updateMrlVersion: (id: string, req: ApiSchemas.JsonElement) =>
    apiFetch<unknown>(`/api/mrl-versions/${encodeURIComponent(id)}`, {
      method: 'PATCH',
      body: JSON.stringify(req),
    }),
  importMrlVersion: (req: ApiSchemas.ImportMrlVersionRequest) =>
    apiFetch<unknown>('/api/mrl-versions/import', {
      method: 'POST',
      body: JSON.stringify(req),
    }),
  getMrlLimits: (versionId: string) =>
    apiFetch<unknown>(`/api/mrl-versions/${encodeURIComponent(versionId)}/limits`),
  upsertMrlLimit: (versionId: string, substanceId: string, req: ApiSchemas.UpsertMrlLimitRequest) =>
    apiFetch<unknown>(`/api/mrl-versions/${encodeURIComponent(versionId)}/limits/${encodeURIComponent(substanceId)}`, {
      method: 'PUT',
      body: JSON.stringify(req),
    }),
  deleteMrlLimit: (versionId: string, substanceId: string) =>
    apiFetch<unknown>(`/api/mrl-versions/${encodeURIComponent(versionId)}/limits/${encodeURIComponent(substanceId)}`, {
      method: 'DELETE',
    }),
  publishMrlVersion: (versionId: string) =>
    apiFetch<unknown>(`/api/mrl-versions/${encodeURIComponent(versionId)}/publish`, {
      method: 'POST',
    }),
  resolveMrlVersion: () => apiFetch<unknown>('/api/mrl-versions/resolve'),
};

export const catalogsEndpoints = catalogEndpoints;
