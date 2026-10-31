// Contracts and endpoint definitions mirrored from web/grainledger/src/api/residue.ts.
import type { ApiTransport } from './transport';

/** Endpoints for reviewed residue rules, policy settings and evidence selection. */
export function createResidueEndpoints(apiFetch: ApiTransport) {
const residueEndpoints = {
  getRules: () => apiFetch<unknown>('/api/residue-rules'),
  createRule: (request: unknown) => apiFetch<unknown>('/api/residue-rules', { method: 'POST', body: JSON.stringify(request) }),
  getRule: (id: string) => apiFetch<unknown>(`/api/residue-rules/${id}`),
  publishRules: (request: unknown) => apiFetch<unknown>('/api/residue-matrix/publish', { method: 'POST', body: JSON.stringify(request) }),
  getPolicySettings: () => apiFetch<unknown>('/api/residue-policy-settings'),
  createPolicySetting: (request: unknown) => apiFetch<unknown>('/api/residue-policy-settings', { method: 'POST', body: JSON.stringify(request) }),
  getPolicySetting: (id: string) => apiFetch<unknown>(`/api/residue-policy-settings/${id}`),
  batchPolicySettings: (request: unknown) => apiFetch<unknown>('/api/residue-policy-settings/batch', { method: 'POST', body: JSON.stringify(request) }),
  getReportSelections: () => apiFetch<unknown>('/api/residue-report-selections'),
  createReportSelection: (request: unknown) => apiFetch<unknown>('/api/residue-report-selections', { method: 'POST', body: JSON.stringify(request) }),
  getReportSelection: (id: string) => apiFetch<unknown>(`/api/residue-report-selections/${id}`),
  previewReportSelection: (request: unknown) => apiFetch<unknown>('/api/residue-report-selections/preview', { method: 'POST', body: JSON.stringify(request) }),
  previewLabReportReview: (reportId: string, request: unknown) => apiFetch<unknown>(`/api/lab-reports/${reportId}/residue-review/preview`, { method: 'POST', body: JSON.stringify(request) }),
  confirmLabReportReview: (reportId: string, request: unknown) => apiFetch<unknown>(`/api/lab-reports/${reportId}/residue-review/confirm`, { method: 'POST', body: JSON.stringify(request) }),
};

return { residueEndpoints };
}
