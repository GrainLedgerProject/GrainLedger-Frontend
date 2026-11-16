import type * as ApiSchemas from './generated/schemas';
import { apiFetch } from './client';
import { requestApi } from './openapi';

/** Endpoints for reviewed residue rules, policy settings and evidence selection. */
export const residueEndpoints = {
  getSourceGroups: () => requestApi('GET /api/residue-source-groups'),
  createSourceGroup: (body: ApiSchemas.ResidueSourceGroupVersion) => requestApi('POST /api/residue-source-groups', { body }),
  getSourceGroup: (id: string) => requestApi('GET /api/residue-source-groups/{id}', { path: { id } }),
  getRules: () => requestApi('GET /api/residue-rules'),
  createRule: (body: ApiSchemas.ResidueProfileVersion) => requestApi('POST /api/residue-rules', { body }),
  getRule: (id: string) => requestApi('GET /api/residue-rules/{id}', { path: { id } }),
  retireRule: (id: string, body: ApiSchemas.RetireResidueProfileRequest) => requestApi('POST /api/residue-rules/{id}/retire', { path: { id }, body }),
  getPolicySettings: () => apiFetch<unknown>('/api/residue-policy-settings'),
  createPolicySetting: (request: ApiSchemas.ResiduePolicySettingVersion) => apiFetch<unknown>('/api/residue-policy-settings', { method: 'POST', body: JSON.stringify(request) }),
  getPolicySetting: (id: string) => apiFetch<unknown>(`/api/residue-policy-settings/${encodeURIComponent(id)}`),
  batchPolicySettings: (request: ApiSchemas.ResiduePolicySettingBatch) => apiFetch<unknown>('/api/residue-policy-settings/batch', { method: 'POST', body: JSON.stringify(request) }),
  getReportSelections: () => apiFetch<unknown>('/api/residue-report-selections'),
  createReportSelection: (request: ApiSchemas.ResidueReportSelection) => apiFetch<unknown>('/api/residue-report-selections', { method: 'POST', body: JSON.stringify(request) }),
  getReportSelection: (id: string) => apiFetch<unknown>(`/api/residue-report-selections/${encodeURIComponent(id)}`),
  previewReportSelection: (request: ApiSchemas.ResidueReportSelection) => apiFetch<unknown>('/api/residue-report-selections/preview', { method: 'POST', body: JSON.stringify(request) }),
  previewLabReportReview: (reportId: string, request: ApiSchemas.ResidueReportReviewRequest) => apiFetch<unknown>(`/api/lab-reports/${encodeURIComponent(reportId)}/residue-review/preview`, { method: 'POST', body: JSON.stringify(request) }),
  confirmLabReportReview: (reportId: string, request: ApiSchemas.ResidueReportReviewRequest) => apiFetch<unknown>(`/api/lab-reports/${encodeURIComponent(reportId)}/residue-review/confirm`, { method: 'POST', body: JSON.stringify(request) }),
};
