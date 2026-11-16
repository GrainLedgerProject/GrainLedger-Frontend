import { apiFetch } from "./client";

export const sampleEndpoints = {
  getSamples: (params?: Record<string, string | number>) => {
    const qs = params
      ? "?" + new URLSearchParams(params as Record<string, string>).toString()
      : "";
    return apiFetch<unknown>(`/api/samples${qs}`);
  },
  getSample: (id: string) =>
    apiFetch<unknown>(`/api/samples/${encodeURIComponent(id)}`),
  createSample: (req: CaptureSampleRequest) =>
    apiFetch<unknown>("/api/samples", {
      method: "POST",
      body: JSON.stringify(req),
    }),
  captureSample: (req: CaptureSampleRequest) =>
    apiFetch<unknown>("/api/samples", {
      method: "POST",
      body: JSON.stringify(req),
    }),
  getSampleHandovers: (id: string) =>
    apiFetch<unknown>(`/api/samples/${encodeURIComponent(id)}/handovers`),
  recordSampleHandover: (id: string, req: RecordSampleHandoverRequest) =>
    apiFetch<unknown>(`/api/samples/${encodeURIComponent(id)}/handovers`, {
      method: "POST",
      body: JSON.stringify(req),
    }),
};

export const labReportEndpoints = {
  getLabReports: (params?: Record<string, string | number>) => {
    const qs = params
      ? "?" + new URLSearchParams(params as Record<string, string>).toString()
      : "";
    return apiFetch<LabReportListResponse>(`/api/lab-reports${qs}`);
  },
  getLabReport: (id: string) =>
    apiFetch<LabReportResponse>(`/api/lab-reports/${encodeURIComponent(id)}`),
  createLabReport: (req: CaptureLabReportRequest) =>
    apiFetch<LabReportResponse>("/api/lab-reports", {
      method: "POST",
      body: JSON.stringify(req),
    }),
  captureLabReport: (req: CaptureLabReportRequest) =>
    apiFetch<LabReportResponse>("/api/lab-reports", {
      method: "POST",
      body: JSON.stringify(req),
    }),
  updateLabReport: (id: string, req: CaptureLabReportRequest) =>
    apiFetch<LabReportResponse>(`/api/lab-reports/${encodeURIComponent(id)}`, {
      method: "PUT",
      body: JSON.stringify(req),
    }),
  deleteLabReport: (id: string, req: DeleteLabReportRequest) =>
    apiFetch<unknown>(`/api/lab-reports/${encodeURIComponent(id)}`, {
      method: "DELETE",
      body: JSON.stringify(req),
    }),
  getLabReportFile: (id: string) =>
    apiFetch<Blob>(`/api/lab-reports/${encodeURIComponent(id)}/file`, {
      responseType: "blob",
      headers: { Accept: "*/*" },
    }),
  confirmLabReport: (id: string, req: ConfirmLabReportRequest) =>
    apiFetch<LabReportResponse>(
      `/api/lab-reports/${encodeURIComponent(id)}/confirm`,
      {
        method: "POST",
        body: JSON.stringify(req),
      },
    ),
};

export const complianceEndpoints = {
  ...sampleEndpoints,
  ...labReportEndpoints,
};

export interface CaptureLabReportRequest {
  deviceId: null | string;
  clientOperationId: string;
  capturedAt: string;
  payloadSchemaVersion: number | string;
  payload: null | LabReportInput;
}

export interface CaptureSampleRequest {
  deviceId: null | string;
  clientOperationId: string;
  capturedAt: string;
  payloadSchemaVersion: number | string;
  payload: null | SampleInput;
}

export interface ConfirmLabReportInput {
  identityChecked: boolean;
  transcriptionChecked: boolean;
  matches: null | Array<LabReportMatchInput>;
  asReceivedConfirmed?: boolean;
}

export interface ConfirmLabReportRequest {
  deviceId: null | string;
  clientOperationId: string;
  capturedAt: string;
  payloadSchemaVersion: number | string;
  payload: null | ConfirmLabReportInput;
}

export interface DeleteLabReportRequest {
  deviceId: null | string;
  clientOperationId: string;
  capturedAt: string;
  payloadSchemaVersion: number | string;
}

export interface LabReportInput {
  entityId: string;
  laboratoryName: null | string;
  reportNumber: null | string;
  issuedOn: string;
  receivedAt: string;
  reportKind: null | string;
  relatedReportId: null | string;
  relationshipReason: null | string;
  fileName: null | string;
  contentType: null | string;
  contentBase64: null | string;
  companyOnlyConfirmed: boolean;
  laboratoryConclusion: null | string;
  statedStandard: null | string;
  resultSets: null | Array<LabResultSetInput>;
}

export interface LabReportMatchInput {
  resultSetId: string;
  sampleId: string;
  identityBasis: null | string;
  evidenceRef?: null | string;
}

export interface LabResultInput {
  testLabel: null | string;
  substanceId: null | string;
  originalResultText: null | string;
  resultKind: null | string;
  numericValue?: null | string;
  unit?: null | string;
  lod?: null | string;
  loq?: null | string;
  method?: null | string;
  uncertainty?: null | string;
  reference?: null | string;
}

export interface LabResultSetInput {
  entityId: string;
  sampleId: null | string;
  laboratorySampleReference: null | string;
  statedSampleCode: null | string;
  statedSealCode: null | string;
  sectionReference: null | string;
  results: null | Array<LabResultInput>;
}

export interface RecordSampleHandoverRequest {
  deviceId: null | string;
  clientOperationId: string;
  capturedAt: string;
  payloadSchemaVersion: number | string;
  payload: null | SampleHandoverInput;
}

export interface SampleHandoverInput {
  entityId: string;
  fromParty: null | string;
  toParty: null | string;
  handedOverAt: string;
  sealCondition: null | string;
  evidenceRef: null | string;
  handoverKind?: null | string;
  laboratoryName?: null | string;
  laboratoryReference?: null | string;
  laboratorySampleReference?: null | string;
}

export interface SampleInput {
  entityId: string;
  sourceLotId: string;
  code: null | string;
  sealCode: null | string;
  collectedAt: string;
  materialDescription?: null | string;
}

export interface LabResultResponse {
  id: string;
  testLabel: string;
  substanceId: string | null;
  originalResultText: string;
  resultKind: string;
  numericValue: string | null;
  unit: string | null;
  lod: string | null;
  loq: string | null;
  method: string | null;
  uncertainty: string | null;
  reference: string | null;
}

export interface LabResultSetResponse {
  id: string;
  sampleId: string | null;
  confirmedSampleId: string | null;
  sourceLotId: string | null;
  laboratorySampleReference: string | null;
  statedSampleCode: string | null;
  statedSealCode: string | null;
  sectionReference: string | null;
  identityStatus: string;
  results: LabResultResponse[];
}

export interface LabReportResponse {
  id: string;
  companyId: string;
  laboratoryName: string;
  reportNumber: string;
  issuedOn: string;
  receivedAt: string;
  reportKind: string;
  relatedReportId: string | null;
  relationshipReason: string | null;
  laboratoryConclusion: string | null;
  statedStandard: string | null;
  fileName: string;
  contentType: string;
  fileSize: number;
  sha256: string;
  recordedBy: string;
  capturedAt: string;
  recordedAt: string;
  status: string;
  confirmedBy: string | null;
  confirmedAt: string | null;
  resultSets: LabResultSetResponse[];
  relatedReports: Array<{
    id: string;
    reportKind: string;
    relationshipReason: string | null;
  }>;
  assessmentStatus: string;
  suggestedMarketCode: string;
  assessmentReasons: string[];
  residueBindings?: Array<{
    resultId: string;
    sourceId: string;
    published: boolean;
    reasons: string[];
  }> | null;
  replacementReportId?: string | null;
}

export interface LabReportListResponse {
  items: LabReportResponse[];
  page: number;
  pageSize: number;
  hasMore: boolean;
}
