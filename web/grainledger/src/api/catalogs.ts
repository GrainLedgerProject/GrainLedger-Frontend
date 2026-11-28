import { apiFetch, apiFetchResource } from "./client";
import Decimal from "decimal.js";
import { withApiQuery, type PageQuery } from "./query";

export interface CatalogPage<T> {
  items: T[];
  page: number;
  pageSize: number;
  hasMore: boolean;
  totalCount?: number;
}
export interface CatalogListQuery extends PageQuery {
  q?: string;
  sortBy?: string;
  sortDirection?: "asc" | "desc";
}
export interface CatalogEntryDto {
  id: string;
  code: string;
  name: string;
}
export type ActiveSubstanceDto = CatalogEntryDto;
export interface CommodityDto extends CatalogEntryDto {
  createdBy: string | null;
  version: number;
  canEdit: boolean;
  canDelete: boolean;
  isArchived: boolean;
}
export interface MeasurementUnitDto extends CatalogEntryDto {
  quantityKind: string;
  createdBy: string | null;
  version: number;
  canEdit: boolean;
  canDelete: boolean;
  isDeleted: boolean;
}
export interface QualityAttributeDto extends CatalogEntryDto {
  unit: string;
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
  status: "DRAFT" | "PUBLISHED";
  publishedBy: string | null;
  publishedAt: string | null;
  sourceRef: string;
}
export type MrlVersionListResponse = CatalogPage<MrlVersionDto>;
export type MrlLimitListResponse = CatalogPage<MrlLimitDto>;
export interface MrlVersionQuery extends PageQuery {
  marketId?: string;
  commodityId?: string;
  status?: "DRAFT" | "PUBLISHED";
}
export interface ResolveMrlVersionQuery {
  marketId: string;
  commodityId: string;
  decisionAt: string;
}
export interface UpdateMrlVersionRequest {
  effectiveFrom?: string;
  effectiveTo?: string | null;
  sourceRef?: string;
}

/** The exact ETag read with the record is required for all catalog mutations. */
function ifMatch(etag: string) {
  if (!etag)
    throw new Error("Missing catalog ETag. Reload the record before editing.");
  return { "If-Match": etag };
}

/** Write a JSON number without rounding a reviewed decimal through a JS Number. */
function mrlLimitBody(request: UpsertMrlLimitRequest): string {
  if (request.limitValue === null) return JSON.stringify(request);
  const value = new Decimal(request.limitValue).toFixed();
  if (!/^\d{1,12}(?:\.\d{1,12})?$/.test(value))
    throw new Error(
      "MRL limits require a nonnegative decimal with at most 12 integer and 12 decimal digits.",
    );
  return `{"limitValue":${value},"unit":${JSON.stringify(request.unit)}}`;
}

export const catalogEndpoints = {
  getActiveSubstances: (query?: CatalogListQuery) =>
    apiFetch<CatalogPage<ActiveSubstanceDto>>(
      withApiQuery("/api/active-substances", query),
    ),
  getActiveSubstance: (id: string) =>
    apiFetchResource<ActiveSubstanceDto>(
      `/api/active-substances/${encodeURIComponent(id)}`,
    ),
  createActiveSubstance: (req: CreateActiveSubstanceRequest) =>
    apiFetch<ActiveSubstanceDto>("/api/active-substances", {
      method: "POST",
      body: JSON.stringify(req),
    }),
  updateActiveSubstance: (
    id: string,
    req: UpdateActiveSubstanceRequest,
    etag: string,
  ) =>
    apiFetch<ActiveSubstanceDto>(
      `/api/active-substances/${encodeURIComponent(id)}`,
      {
        method: "PATCH",
        headers: ifMatch(etag),
        body: JSON.stringify(req),
      },
    ),
  deleteActiveSubstance: (id: string, etag: string) =>
    apiFetch<void>(`/api/active-substances/${encodeURIComponent(id)}`, {
      method: "DELETE",
      headers: ifMatch(etag),
    }),
  getMarkets: (query?: CatalogListQuery) =>
    apiFetch<CatalogPage<CatalogEntryDto>>(withApiQuery("/api/markets", query)),
  getMarket: (id: string) =>
    apiFetchResource<CatalogEntryDto>(`/api/markets/${encodeURIComponent(id)}`),
  createMarket: (req: CreateMarketRequest) =>
    apiFetch<CatalogEntryDto>("/api/markets", {
      method: "POST",
      body: JSON.stringify(req),
    }),
  updateMarket: (id: string, req: UpdateMarketRequest, etag: string) =>
    apiFetch<CatalogEntryDto>(`/api/markets/${encodeURIComponent(id)}`, {
      method: "PATCH",
      headers: ifMatch(etag),
      body: JSON.stringify(req),
    }),
  getCommodities: (query?: CatalogListQuery) =>
    apiFetch<CatalogPage<CommodityDto>>(
      withApiQuery("/api/commodities", query),
    ),
  getCommodity: (id: string) =>
    apiFetchResource<CommodityDto>(
      `/api/commodities/${encodeURIComponent(id)}`,
    ),
  createCommodity: (req: CreateCommodityRequest) =>
    apiFetch<CommodityDto>("/api/commodities", {
      method: "POST",
      body: JSON.stringify(req),
    }),
  updateCommodity: (id: string, req: UpdateCommodityRequest, etag: string) =>
    apiFetch<CommodityDto>(`/api/commodities/${encodeURIComponent(id)}`, {
      method: "PATCH",
      headers: ifMatch(etag),
      body: JSON.stringify(req),
    }),
  deleteCommodity: (id: string, etag: string) =>
    apiFetch<void>(`/api/commodities/${encodeURIComponent(id)}`, {
      method: "DELETE",
      headers: ifMatch(etag),
    }),
  getQualityAttributes: (query?: CatalogListQuery) =>
    apiFetch<CatalogPage<QualityAttributeDto>>(
      withApiQuery("/api/quality-attributes", query),
    ),
  getQualityAttribute: (id: string) =>
    apiFetchResource<QualityAttributeDto>(
      `/api/quality-attributes/${encodeURIComponent(id)}`,
    ),
  createQualityAttribute: (req: CreateQualityAttributeRequest) =>
    apiFetch<QualityAttributeDto>("/api/quality-attributes", {
      method: "POST",
      body: JSON.stringify(req),
    }),
  updateQualityAttribute: (
    id: string,
    req: UpdateQualityAttributeRequest,
    etag: string,
  ) =>
    apiFetch<QualityAttributeDto>(
      `/api/quality-attributes/${encodeURIComponent(id)}`,
      {
        method: "PATCH",
        headers: ifMatch(etag),
        body: JSON.stringify(req),
      },
    ),
  getRiceVarieties: (query?: CatalogListQuery) =>
    apiFetch<CatalogPage<CatalogEntryDto>>(
      withApiQuery("/api/rice-varieties", query),
    ),
  getRiceVariety: (id: string) =>
    apiFetchResource<CatalogEntryDto>(
      `/api/rice-varieties/${encodeURIComponent(id)}`,
    ),
  createRiceVariety: (req: CreateRiceVarietyRequest) =>
    apiFetch<CatalogEntryDto>("/api/rice-varieties", {
      method: "POST",
      body: JSON.stringify(req),
    }),
  updateRiceVariety: (
    id: string,
    req: UpdateRiceVarietyRequest,
    etag: string,
  ) =>
    apiFetch<CatalogEntryDto>(`/api/rice-varieties/${encodeURIComponent(id)}`, {
      method: "PATCH",
      headers: ifMatch(etag),
      body: JSON.stringify(req),
    }),
  getMeasurementUnits: (query?: CatalogListQuery) =>
    apiFetch<CatalogPage<MeasurementUnitDto>>(
      withApiQuery("/api/measurement-units", query),
    ),
  getMeasurementUnit: (id: string) =>
    apiFetchResource<MeasurementUnitDto>(
      `/api/measurement-units/${encodeURIComponent(id)}`,
    ),
  createMeasurementUnit: (req: CreateMeasurementUnitRequest) =>
    apiFetch<MeasurementUnitDto>("/api/measurement-units", {
      method: "POST",
      body: JSON.stringify(req),
    }),
  updateMeasurementUnit: (
    id: string,
    req: UpdateMeasurementUnitRequest,
    etag: string,
  ) =>
    apiFetch<MeasurementUnitDto>(
      `/api/measurement-units/${encodeURIComponent(id)}`,
      {
        method: "PATCH",
        headers: ifMatch(etag),
        body: JSON.stringify(req),
      },
    ),
  deleteMeasurementUnit: (id: string, etag: string) =>
    apiFetch<void>(`/api/measurement-units/${encodeURIComponent(id)}`, {
      method: "DELETE",
      headers: ifMatch(etag),
    }),
  getMrlVersions: (query?: MrlVersionQuery) =>
    apiFetch<MrlVersionListResponse>(withApiQuery("/api/mrl-versions", query)),
  getMrlVersion: (id: string) =>
    apiFetchResource<MrlVersionDto>(
      `/api/mrl-versions/${encodeURIComponent(id)}`,
    ),
  createMrlVersion: (req: CreateMrlVersionRequest) =>
    apiFetch<MrlVersionDto>("/api/mrl-versions", {
      method: "POST",
      body: JSON.stringify(req),
    }),
  updateMrlVersion: (id: string, req: UpdateMrlVersionRequest, etag: string) =>
    apiFetch<MrlVersionDto>(`/api/mrl-versions/${encodeURIComponent(id)}`, {
      method: "PATCH",
      headers: ifMatch(etag),
      body: JSON.stringify(req),
    }),
  importMrlVersion: (req: ImportMrlVersionRequest) =>
    apiFetch<MrlVersionDto>("/api/mrl-versions/import", {
      method: "POST",
      body: JSON.stringify(req),
    }),
  getMrlLimits: (
    versionId: string,
    query?: PageQuery & { substanceId?: string },
  ) =>
    apiFetch<MrlLimitListResponse>(
      withApiQuery(
        `/api/mrl-versions/${encodeURIComponent(versionId)}/limits`,
        query,
      ),
    ),
  upsertMrlLimit: (
    versionId: string,
    substanceId: string,
    req: UpsertMrlLimitRequest,
    etag: string,
  ) =>
    apiFetch<MrlLimitDto>(
      `/api/mrl-versions/${encodeURIComponent(versionId)}/limits/${encodeURIComponent(substanceId)}`,
      {
        method: "PUT",
        headers: ifMatch(etag),
        body: mrlLimitBody(req),
      },
    ),
  deleteMrlLimit: (versionId: string, substanceId: string, etag: string) =>
    apiFetch<void>(
      `/api/mrl-versions/${encodeURIComponent(versionId)}/limits/${encodeURIComponent(substanceId)}`,
      {
        method: "DELETE",
        headers: ifMatch(etag),
      },
    ),
  publishMrlVersion: (versionId: string, etag: string) =>
    apiFetch<MrlVersionDto>(
      `/api/mrl-versions/${encodeURIComponent(versionId)}/publish`,
      {
        method: "POST",
        headers: ifMatch(etag),
      },
    ),
  resolveMrlVersion: (query: ResolveMrlVersionQuery) =>
    apiFetch<MrlVersionDto>(withApiQuery("/api/mrl-versions/resolve", query)),
};
export const catalogsEndpoints = catalogEndpoints;

export interface CreateActiveSubstanceRequest {
  code: null | string;
  name: null | string;
}

export interface CreateCommodityRequest {
  code: null | string;
  name: null | string;
}

export interface CreateMarketRequest {
  code: null | string;
  name: null | string;
}

export interface CreateMeasurementUnitRequest {
  code: null | string;
  name: null | string;
  quantityKind: null | string;
}

export interface CreateMrlVersionRequest {
  marketId: string;
  commodityId: string;
  effectiveFrom: null | string;
  effectiveTo: null | string;
  sourceRef: null | string;
}

export interface CreateQualityAttributeRequest {
  code: null | string;
  name: null | string;
  unit: null | string;
}

export interface CreateRiceVarietyRequest {
  code: null | string;
  name: null | string;
}

export interface ImportMrlLimitRequest {
  substanceCode: null | string;
  limitValue: null | string;
  unit: null | string;
}

export interface ImportMrlVersionRequest {
  marketId: string;
  commodityId: string;
  effectiveFrom: null | string;
  effectiveTo: null | string;
  sourceRef: null | string;
  limits: null | Array<ImportMrlLimitRequest>;
}

export interface UpdateActiveSubstanceRequest {
  name: null | string;
}

export interface UpdateCommodityRequest {
  name: null | string;
}

export interface UpdateMarketRequest {
  name: null | string;
}

export interface UpdateMeasurementUnitRequest {
  name: null | string;
  code?: null | string;
  quantityKind?: null | string;
}

export interface UpdateQualityAttributeRequest {
  name: null | string;
  code?: null | string;
  unit?: null | string;
}

export interface UpdateRiceVarietyRequest {
  name: null | string;
}

export interface UpsertMrlLimitRequest {
  limitValue: null | number | string;
  unit: null | string;
}
