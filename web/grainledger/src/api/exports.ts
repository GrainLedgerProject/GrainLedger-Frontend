import { requestApi } from './openapi';
import type * as Schemas from './generated/schemas';
import { apiFetch } from './client';
import { withApiQuery } from './query';
import type { ApiPage, ExportOrderSummary, ExportContainerDto, PageQuery, CandidateQuery, CandidateLineageQuery, CandidateResidueQuery } from './contracts';

export const exportEndpoints = {
  getAvailability: () => requestApi('GET /api/export-availability'),
  getOrders: (query?: PageQuery) => apiFetch<ApiPage<ExportOrderSummary>>(withApiQuery('/api/export-orders', query)),
  createOrder: (body: Schemas.CreateExportOrderRequest) => requestApi('POST /api/export-orders', { body }),
  getOrder: (id: string) => requestApi('GET /api/export-orders/{id}', { path: { id } }),
  updateOrder: (id: string, body: Schemas.UpdateExportOrderRequest) => requestApi('PATCH /api/export-orders/{id}', { path: { id }, body }),
  getSpecifications: (id: string) => requestApi('GET /api/export-orders/{id}/specifications', { path: { id } }),
  addSpecifications: (id: string, body: Schemas.AddExportSpecificationRequest) => requestApi('POST /api/export-orders/{id}/specifications', { path: { id }, body }),
  getContainers: (id: string, query?: PageQuery) => apiFetch<ApiPage<ExportContainerDto>>(withApiQuery(`/api/export-orders/${encodeURIComponent(id)}/containers`, query)),
  addContainers: (id: string, body: Schemas.AddExportContainersRequest) => requestApi('POST /api/export-orders/{id}/containers', { path: { id }, body }),
  getOrderHistory: (id: string) => requestApi('GET /api/export-orders/{id}/history', { path: { id } }),
  getContainer: (id: string) => requestApi('GET /api/export-containers/{id}', { path: { id } }),
  updateContainer: (id: string, body: Schemas.UpdateExportContainerRequest) => requestApi('PATCH /api/export-containers/{id}', { path: { id }, body }),
  getPlanningContext: (id: string) => requestApi('GET /api/export-containers/{id}/planning-context', { path: { id } }),
  getStockPreview: (id: string) => requestApi('GET /api/export-containers/{id}/stock-preview', { path: { id } }),
  getInventoryScope: (id: string) => requestApi('GET /api/export-containers/{id}/inventory-scope', { path: { id } }),
  getCandidates: (id: string, query: CandidateQuery) => apiFetch<unknown>(withApiQuery(`/api/export-containers/${encodeURIComponent(id)}/candidates`, query)),
  getCandidateLineage: (id: string, lotId: string, query: CandidateLineageQuery) => apiFetch<unknown>(withApiQuery(`/api/export-containers/${encodeURIComponent(id)}/candidates/${encodeURIComponent(lotId)}/lineage`, query)),
  getCandidateResiduePreview: (id: string, lotId: string, query: CandidateResidueQuery) => apiFetch<unknown>(withApiQuery(`/api/export-containers/${encodeURIComponent(id)}/candidates/${encodeURIComponent(lotId)}/residue-preview`, query)),
};
