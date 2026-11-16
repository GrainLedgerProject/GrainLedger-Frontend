import type { ApiPage, PageQuery } from "./query";
import { apiFetch } from "./client";
import { withApiQuery } from "./query";

export const exportEndpoints = {
  getAvailability: () => apiFetch<unknown>("/api/export-availability"),
  getOrders: (query?: PageQuery) =>
    apiFetch<ApiPage<ExportOrderSummary>>(
      withApiQuery("/api/export-orders", query),
    ),
  createOrder: (body: CreateExportOrderRequest) =>
    apiFetch<unknown>("/api/export-orders", {
      method: "POST",
      body: JSON.stringify(body),
    }),
  getOrder: (id: string) =>
    apiFetch<unknown>(`/api/export-orders/${encodeURIComponent(id)}`),
  updateOrder: (id: string, body: UpdateExportOrderRequest) =>
    apiFetch<unknown>(`/api/export-orders/${encodeURIComponent(id)}`, {
      method: "PATCH",
      body: JSON.stringify(body),
    }),
  getSpecifications: (id: string) =>
    apiFetch<unknown>(
      `/api/export-orders/${encodeURIComponent(id)}/specifications`,
    ),
  addSpecifications: (id: string, body: AddExportSpecificationRequest) =>
    apiFetch<unknown>(
      `/api/export-orders/${encodeURIComponent(id)}/specifications`,
      { method: "POST", body: JSON.stringify(body) },
    ),
  getContainers: (id: string, query?: PageQuery) =>
    apiFetch<ApiPage<ExportContainerDto>>(
      withApiQuery(
        `/api/export-orders/${encodeURIComponent(id)}/containers`,
        query,
      ),
    ),
  addContainers: (id: string, body: AddExportContainersRequest) =>
    apiFetch<unknown>(
      `/api/export-orders/${encodeURIComponent(id)}/containers`,
      { method: "POST", body: JSON.stringify(body) },
    ),
  getOrderHistory: (id: string) =>
    apiFetch<unknown>(`/api/export-orders/${encodeURIComponent(id)}/history`),
  getContainer: (id: string) =>
    apiFetch<unknown>(`/api/export-containers/${encodeURIComponent(id)}`),
  updateContainer: (id: string, body: UpdateExportContainerRequest) =>
    apiFetch<unknown>(`/api/export-containers/${encodeURIComponent(id)}`, {
      method: "PATCH",
      body: JSON.stringify(body),
    }),
  getPlanningContext: (id: string) =>
    apiFetch<unknown>(
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
    apiFetch<unknown>(
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
