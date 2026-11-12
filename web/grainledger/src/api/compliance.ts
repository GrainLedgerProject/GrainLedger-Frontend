import type * as ApiSchemas from './generated/schemas';
export type { SampleInput, CaptureSampleRequest, SampleHandoverInput, RecordSampleHandoverRequest, LabResultInput, LabResultSetInput, LabReportInput, CaptureLabReportRequest, LabReportMatchInput, ConfirmLabReportInput, ConfirmLabReportRequest } from './generated/schemas';
import { apiFetch } from './client';

export const sampleEndpoints = {
  getSamples: (params?: Record<string, string | number>) => {
    const qs = params ? '?' + new URLSearchParams(params as Record<string, string>).toString() : '';
    return apiFetch<unknown>(`/api/samples${qs}`);
  },
  getSample: (id: string) => apiFetch<unknown>(`/api/samples/${encodeURIComponent(id)}`),
  createSample: (req: ApiSchemas.CaptureSampleRequest) =>
    apiFetch<unknown>('/api/samples', {
      method: 'POST',
      body: JSON.stringify(req),
    }),
  captureSample: (req: ApiSchemas.CaptureSampleRequest) =>
    apiFetch<unknown>('/api/samples', {
      method: 'POST',
      body: JSON.stringify(req),
    }),
  getSampleHandovers: (id: string) => apiFetch<unknown>(`/api/samples/${encodeURIComponent(id)}/handovers`),
  recordSampleHandover: (id: string, req: ApiSchemas.RecordSampleHandoverRequest) =>
    apiFetch<unknown>(`/api/samples/${encodeURIComponent(id)}/handovers`, {
      method: 'POST',
      body: JSON.stringify(req),
    }),
};

export const labReportEndpoints = {
  getLabReports: (params?: Record<string, string | number>) => {
    const qs = params ? '?' + new URLSearchParams(params as Record<string, string>).toString() : '';
    return apiFetch<unknown>(`/api/lab-reports${qs}`);
  },
  getLabReport: (id: string) => apiFetch<unknown>(`/api/lab-reports/${encodeURIComponent(id)}`),
  createLabReport: (req: ApiSchemas.CaptureLabReportRequest) =>
    apiFetch<unknown>('/api/lab-reports', {
      method: 'POST',
      body: JSON.stringify(req),
    }),
  captureLabReport: (req: ApiSchemas.CaptureLabReportRequest) =>
    apiFetch<unknown>('/api/lab-reports', {
      method: 'POST',
      body: JSON.stringify(req),
    }),
  updateLabReport: (id: string, req: ApiSchemas.CaptureLabReportRequest) =>
    apiFetch<unknown>(`/api/lab-reports/${encodeURIComponent(id)}`, {
      method: 'PUT',
      body: JSON.stringify(req),
    }),
  deleteLabReport: (id: string, req: ApiSchemas.DeleteLabReportRequest) =>
    apiFetch<unknown>(`/api/lab-reports/${encodeURIComponent(id)}`, {
      method: 'DELETE',
      body: JSON.stringify(req),
    }),
  getLabReportFile: (id: string) => apiFetch<Blob>(`/api/lab-reports/${encodeURIComponent(id)}/file`, { responseType: 'blob', headers: { Accept: '*/*' } }),
  confirmLabReport: (id: string, req: ApiSchemas.ConfirmLabReportRequest) =>
    apiFetch<unknown>(`/api/lab-reports/${encodeURIComponent(id)}/confirm`, {
      method: 'POST',
      body: JSON.stringify(req),
    }),
};

export const complianceEndpoints = {
  ...sampleEndpoints,
  ...labReportEndpoints,
};
