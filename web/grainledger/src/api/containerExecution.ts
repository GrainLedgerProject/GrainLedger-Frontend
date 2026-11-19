import { apiFetch } from "./client";
import { withApiQuery, type ApiPage, type PageQuery } from "./query";

export interface ContainerAllocation {
  lotId: string;
  lotCode: string;
  locationId: string;
  reservedKg: string;
  remainingKg: string;
  restricted: boolean;
  loadingPositionReady: boolean;
}
export interface ContainerExecution {
  id: string;
  orderId: string;
  code: string;
  companyId: string;
  targetKg: string;
  loadedKg: string;
  remainingKg: string;
  status: string;
  version: number;
  facilityId: string | null;
  containerNumber: string | null;
  sealNumber: string | null;
  dossierAvailable: boolean;
  holds: { id: string; reason: string; recordedAt: string }[];
  loads: { id: string; proposalId: string; loadedAt: string; recordedAt: string; lines: { lotId: string; lotCode: string; locationId: string; quantityKg: string }[] }[];
  approval: { proposalId: string; planId: string; decisionVersion: number; mode: string; productionState?: string | null; allocations: ContainerAllocation[] } | null;
}
export interface ContainerReadiness {
  phase: "LOADING" | "CLOSE";
  checkedAt: string;
  assessmentStatus: string;
  findings: string[];
}
export interface ContainerExecutionDetail { container: ContainerExecution; readiness: ContainerReadiness }
export interface ContainerVersionRequest { operationId: string; version: number }
export interface ActualLoadRequest extends ContainerVersionRequest {
  proposalId: string;
  decisionVersion: number;
  loadedAt: string;
  lines: { lotId: string; locationId: string; quantityKg: string }[];
}
export interface ContainerMetadataRequest extends ContainerVersionRequest { containerNumber: string | null; sealNumber: string | null }
export interface ContainerDocumentRequest extends ContainerVersionRequest { documentType: string; filename: string; contentType: string; content: string; reason: string }
export interface ContainerDocument { id: string; documentType: string; version: number; filename: string; contentType: string; sha256: string; reason: string; recordedAt: string }
export interface ContainerWorkflowDetail {
  containerId: string;
  version: number;
  documents: ContainerDocument[];
  supplements: { id: string; evidenceId: string; reason: string; recordedAt: string }[];
  reviews: { id: string; proposalId: string; scope: string; decision: string; reason: string; recordedAt: string }[];
  handoffs: { id: string; kind: string; state: string; version: number }[];
}
export interface ContainerDossier {
  schemaVersion: number;
  containerId: string;
  orderId: string;
  containerNumber: string;
  sealNumber: string;
  targetKg: string;
  closedAt: string;
  closedBy: string;
  redacted?: boolean;
  assessment: { assessmentStatus: string; checkedAt: string; findings: string[] };
  lines: { id: string; lot_id: string; location_id: string; quantity_kg: string | number }[];
  sourceContributions?: { sourceLotId: string; quantityKg: string; percentage: string }[];
}
export interface ContainerProduction { containerId: string; state: string; version: number; proposalId?: string; outputCode?: string | null }
export interface ContainerHistoryEvent { id: string; kind: string; recorded_at: string }
export interface ContainerNotice { id: string; holdId: string; containerId: string; code: string; message: string; createdAt: string; readAt: string | null }

const path = (id: string) => `/api/export-containers/${encodeURIComponent(id)}`;
const post = <T>(url: string, body: object) => apiFetch<T>(url, { method: "POST", body: JSON.stringify(body) });
export const containerExecutionEndpoints = {
  getNotifications: () => apiFetch<{ items: ContainerNotice[] }>("/api/container-notifications"),
  getDetail: (id: string) => apiFetch<ContainerExecutionDetail>(`${path(id)}/execution`),
  getWorkflow: (id: string) => apiFetch<ContainerWorkflowDetail>(`${path(id)}/workflow`),
  getDossier: (id: string) => apiFetch<ContainerDossier>(`${path(id)}/execution/dossier`),
  downloadDossier: (id: string) => apiFetch<Blob>(`${path(id)}/execution/dossier`, { responseType: "blob" }),
  getHistory: (id: string, query?: PageQuery) => apiFetch<ApiPage<ContainerHistoryEvent>>(withApiQuery(`${path(id)}/execution/history`, query)),
  recordLoad: (id: string, body: ActualLoadRequest) => post<ContainerExecution>(`${path(id)}/execution/loads`, body),
  saveMetadata: (id: string, body: ContainerMetadataRequest) => post<ContainerExecution>(`${path(id)}/execution/metadata`, body),
  close: (id: string, body: ContainerVersionRequest) => post<ContainerExecution>(`${path(id)}/execution/close`, body),
  getProduction: (id: string) => apiFetch<ContainerProduction>(`${path(id)}/production`),
  requestProduction: (id: string, body: ContainerVersionRequest & { proposalId: string }) => post<ContainerProduction>(`${path(id)}/production/request`, body),
  addDocument: (id: string, body: ContainerDocumentRequest) => post<ContainerWorkflowDetail>(`${path(id)}/workflow/documents`, body),
  downloadDocument: (id: string, documentId: string) => apiFetch<Blob>(`${path(id)}/workflow/documents/${encodeURIComponent(documentId)}/file`, { responseType: "blob" }),
  addSupplement: (id: string, body: ContainerVersionRequest & { evidenceId: string; reason: string }) => post<ContainerWorkflowDetail>(`${path(id)}/workflow/supplements`, body),
};
