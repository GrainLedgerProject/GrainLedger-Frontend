import type { ApiPage, PageQuery } from "./query";
import { apiFetch, apiFetchResource } from "./client";
import { withApiQuery } from "./query";

export const exportEndpoints = {
  getAvailability: () => apiFetch<unknown>("/api/export-availability"),
  getOrders: (query?: PageQuery) =>
    apiFetch<ApiPage<ExportOrderSummary>>(
      withApiQuery("/api/export-orders", query),
    ),
  createOrder: (body: CreateExportOrderRequest) =>
    apiFetch<ExportOrderDetail>("/api/export-orders", {
      method: "POST",
      body: JSON.stringify(body),
    }),
  getOrderResource: (id: string) => apiFetchResource<ExportOrderDetail>(`/api/export-orders/${encodeURIComponent(id)}`),
  getOrder: (id: string) =>
    apiFetch<ExportOrderDetail>(`/api/export-orders/${encodeURIComponent(id)}`),
  updateOrder: (id: string, body: UpdateExportOrderRequest, etag: string) =>
    apiFetch<ExportOrderDetail>(`/api/export-orders/${encodeURIComponent(id)}`, {
      method: "PATCH",
      headers: { "If-Match": etag },
      body: JSON.stringify(body),
    }),
  getSpecifications: (id: string) =>
    apiFetch<unknown>(
      `/api/export-orders/${encodeURIComponent(id)}/specifications`,
    ),
  addSpecifications: (id: string, body: AddExportSpecificationRequest, etag: string) =>
    apiFetch<ExportOrderDetail>(
      `/api/export-orders/${encodeURIComponent(id)}/specifications`,
      { method: "POST", headers: { "If-Match": etag }, body: JSON.stringify(body) },
    ),
  getContainers: (id: string, query?: PageQuery) =>
    apiFetch<ApiPage<ExportContainerDto>>(
      withApiQuery(
        `/api/export-orders/${encodeURIComponent(id)}/containers`,
        query,
      ),
    ),
  addContainers: (id: string, body: AddExportContainersRequest, etag: string) =>
    apiFetch<unknown>(
      `/api/export-orders/${encodeURIComponent(id)}/containers`,
      { method: "POST", headers: { "If-Match": etag }, body: JSON.stringify(body) },
    ),
  getOrderHistory: (id: string, query?: PageQuery) =>
    apiFetch<ApiPage<ExportOrderEvent>>(withApiQuery(`/api/export-orders/${encodeURIComponent(id)}/history`, query)),
  getContainer: (id: string) =>
    apiFetch<ExportContainerDto>(`/api/export-containers/${encodeURIComponent(id)}`),
  getContainerResource: (id: string) => apiFetchResource<ExportContainerDto>(`/api/export-containers/${encodeURIComponent(id)}`),
  updateContainer: (id: string, body: UpdateExportContainerRequest, etag: string) =>
    apiFetch<ExportContainerDto>(`/api/export-containers/${encodeURIComponent(id)}`, {
      method: "PATCH",
      headers: { "If-Match": etag },
      body: JSON.stringify(body),
    }),
  getPlanningContext: (id: string) =>
    apiFetch<BlendPlanningContext>(
      `/api/export-containers/${encodeURIComponent(id)}/planning-context`,
    ),
  getStockPreview: (id: string) =>
    apiFetch<unknown>(
      `/api/export-containers/${encodeURIComponent(id)}/stock-preview`,
    ),
  getInventoryScope: (id: string) =>
    apiFetch<unknown>(
      `/api/export-containers/${encodeURIComponent(id)}/inventory-scope`,
    ),
  getCandidates: (id: string, query: CandidateQuery) =>
    apiFetch<CandidatePage>(
      withApiQuery(
        `/api/export-containers/${encodeURIComponent(id)}/candidates`,
        query,
      ),
    ),
  getCandidateLineage: (
    id: string,
    lotId: string,
    query: CandidateLineageQuery,
  ) =>
    apiFetch<unknown>(
      withApiQuery(
        `/api/export-containers/${encodeURIComponent(id)}/candidates/${encodeURIComponent(lotId)}/lineage`,
        query,
      ),
    ),
  getCandidateResiduePreview: (
    id: string,
    lotId: string,
    query: CandidateResidueQuery,
  ) =>
    apiFetch<unknown>(
      withApiQuery(
        `/api/export-containers/${encodeURIComponent(id)}/candidates/${encodeURIComponent(lotId)}/residue-preview`,
        query,
      ),
    ),
};

export interface AddExportContainersRequest {
  operationId: string;
  containers: null | Array<ExportContainerInput>;
}

export interface AddExportSpecificationRequest {
  operationId: string;
  limits: null | Array<ExportLimitInput>;
}

export interface CreateExportOrderRequest {
  operationId: string;
  marketId: string;
  commodityId: string;
  requiredMass: null | string;
  unit: null | string;
  shippingFrom: string;
  shippingTo: string;
  limits: null | Array<ExportLimitInput>;
  containers: null | Array<ExportContainerInput>;
}

export interface ExportContainerInput {
  targetMass: null | string;
  unit: null | string;
}

export interface ExportLimitInput {
  attributeId: string;
  minValue: null | string;
  maxValue: null | string;
}

export interface UpdateExportContainerRequest {
  operationId: string;
  targetMass: null | string;
  unit: null | string;
}

export interface UpdateExportOrderRequest {
  operationId: string;
  marketId: string;
  commodityId: string;
  requiredMass: null | string;
  unit: null | string;
  shippingFrom: string;
  shippingTo: string;
}

export interface ExportOrderSummary {
  id: string;
  code: string;
  marketId: string;
  commodityId: string;
  requiredMassKg: string;
  shippingFrom: string;
  shippingTo: string;
  createdAt: string;
  version: number;
}

export interface ExportContainerDto {
  id: string;
  orderId: string;
  internalCode: string;
  targetMassKg: string;
  originalMass: string;
  originalUnit: string;
  status: string;
  version: number;
}

export interface CandidateQuery extends PageQuery {
  facilityId: string;
  includeExcluded?: boolean;
  productMatchOnly?: boolean;
  scopeRevision?: string;
  planId?: string;
}

export interface CandidateLineageQuery {
  facilityId: string;
  locationId: string;
  candidateRevision?: string;
}

export interface CandidateResidueQuery extends CandidateLineageQuery {
  candidateRevision: string;
  substanceIds: string;
}

export interface ExportOrderDetail extends ExportOrderSummary {
  originalMass?: string;
  originalUnit?: string;
  limits: (ExportLimitInput & { attributeName?: string; attributeCode?: string; unit?: string })[];
  allocatedMassKg: string;
  remainingMassKg: string;
  specificationVersion: number;
  canEdit: boolean;
}

export interface ExportOrderEvent {
  action: string;
  actorName: string;
  recordedAt: string;
  snapshot: string;
}
export interface BlendPlanningContext {
  orderVersion: number;
  containerVersion: number;
  canCreateDraft: boolean;
  allowedTargetProducts: string[];
  missingDependencies: { code: string; description: string }[];
}
export interface CandidatePage extends ApiPage<{ lotId: string; lotCode: string; locationId: string; locationName: string; availableKg: string }> {
  scopeRevision: string;
}
