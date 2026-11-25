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
  ownerId?: string;
  status?: string;
  documents: ContainerDocument[];
  supplements: { id: string; evidenceId: string; reason: string; recordedAt: string }[];
  reviews: { id: string; proposalId: string; scope: string; decision: string; reason: string; recordedAt: string }[];
  proposals?: ContainerWorkflowProposal[];
  handoffs: ContainerHandoff[];
  holds?: { id: string; reason: string }[];
}
export interface ContainerWorkflowProposal {
  id: string;
  planId: string;
  version: number;
  context: {
    facilityId: string;
    mode: string;
    remainingProductionKg: string;
    outputs: {
      lotId: string;
      lotCode: string;
      locationId: string;
      locationName: string;
      remainingKg: string;
      poolRevision?: number | string | null;
    }[];
  };
}
export interface ContainerHandoff {
  id: string;
  kind: string;
  state: string;
  version: number;
  proposalId?: string;
  facilityId?: string;
  content?: ContainerHandoffContent;
}
export interface ContainerHandoffContent {
  lotId: string;
  fromLocationId: string;
  toLocationId: string;
  quantityKg: string;
  occurredAt: string;
  poolRevision?: number | string | null;
  equipmentId?: string;
  outputKg?: string;
  declaredLossKg?: string;
}
export interface ContainerHandoffDraftRequest extends ContainerVersionRequest {
  proposalId: string;
  kind: "TRANSFER" | "BAGGING";
  content: ContainerHandoffContent;
}
export interface ContainerHandoffCommitRequest extends ContainerVersionRequest {
  handoffId: string;
  handoffVersion: number;
}
export interface ContainerScopeReviewRequest extends ContainerVersionRequest {
  proposalId: string;
  scope: "OUTPUT_ONLY" | "ALL_REMAINING";
  decision: "APPROVED" | "REJECTED";
  reason: string;
}
export interface ContainerHoldResponseRequest extends ContainerVersionRequest {
  holdId: string;
  facilityId: string;
  responseAction: "ACKNOWLEDGE" | "RECORD_RESPONSE";
  evidenceId: string;
  reason: string;
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
export interface ContainerWorkItem {
  containerId: string;
  code: string;
  facilityId: string;
  state: string;
  proposalId: string;
  mode: string;
}
export interface ContainerProductionSummary {
  containerId: string;
  code: string;
  facilityId: string;
  state: string;
  version: number;
}
export interface ContainerProductionInput {
  lotId: string;
  locationId: string;
  quantityKg: string;
  poolRevision?: number | string | null;
}
export interface ContainerProductionDraft {
  id: string;
  ownerId: string;
  facilityId: string;
  kind: "BLENDING";
  occurredAt: string;
  equipmentId: string;
  inputs: ContainerProductionInput[];
  outputs: {
    id: string;
    code?: string;
    commodityId: string;
    stage: "BLENDED_RICE";
    productIdentity: "BLENDED_RICE";
    locationId: string;
    quantityKg: string;
  }[];
  declaredLossKg: string;
  version?: string;
}
export interface ContainerProduction {
  containerId: string;
  state: string;
  version: number;
  proposalId?: string;
  facilityId?: string;
  ownerId?: string;
  outputCommodityId?: string;
  operationId?: string | null;
  outputId?: string | null;
  outputCode?: string | null;
  targetKg?: string;
  plannedKg?: string;
  remainingProductionKg?: string;
  operation?: ContainerProductionDraft | null;
  inputs?: (ContainerProductionInput & { lotCode: string; approvedKg: string })[];
}
export interface ContainerTrace {
  loadedKg: string;
  complete: boolean;
  findings: string[];
  sourceContributions: {
    sourceLotId: string;
    quantityKg: string;
    percentage?: string;
    status?: string;
    provenance?: { plotId?: string; procurementCode?: string } | null;
  }[];
  graph?: {
    lots: { id: string; code: string; producedKg: string }[];
    edges: { inputLotId: string; outputLotId: string; inputConsumedKg: string; outputProducedKg: string; kind?: string }[];
    loadingEdges?: LoadingEdge[];
  };
}
export interface LoadingEdge {
  lotId: string;
  containerId: string;
  quantityKg: string;
  lines: {
    lineId: string;
    loadId: string;
    locationId: string;
    proposalId: string;
    loadedAt: string;
    quantityKg: string;
    sourceContributions?: { sourceLotId: string; quantityKg: string }[];
  }[];
}
export interface ContainerHistoryEvent { id: string; kind: string; recorded_at: string }
export interface ContainerNotice { id: string; holdId: string; containerId: string; code: string; message: string; createdAt: string; readAt: string | null }

const path = (id: string) => `/api/export-containers/${encodeURIComponent(id)}`;
const post = <T>(url: string, body: object) => apiFetch<T>(url, { method: "POST", body: JSON.stringify(body) });
export const containerExecutionEndpoints = {
  getNotifications: () => apiFetch<{ items: ContainerNotice[] }>("/api/container-notifications"),
  getWorkItems: () => apiFetch<{ items: ContainerWorkItem[] }>("/api/container-work-items"),
  listProduction: () => apiFetch<{ items: ContainerProductionSummary[] }>("/api/container-production"),
  getDetail: (id: string) => apiFetch<ContainerExecutionDetail>(`${path(id)}/execution`),
  getWorkflow: (id: string) => apiFetch<ContainerWorkflowDetail>(`${path(id)}/workflow`),
  getDossier: (id: string) => apiFetch<ContainerDossier>(`${path(id)}/execution/dossier`),
  downloadDossier: (id: string) => apiFetch<Blob>(`${path(id)}/execution/dossier`, { responseType: "blob" }),
  getHistory: (id: string, query?: PageQuery) => apiFetch<ApiPage<ContainerHistoryEvent>>(withApiQuery(`${path(id)}/execution/history`, query)),
  recordLoad: (id: string, body: ActualLoadRequest) => post<ContainerExecution>(`${path(id)}/execution/loads`, body),
  saveMetadata: (id: string, body: ContainerMetadataRequest) => post<ContainerExecution>(`${path(id)}/execution/metadata`, body),
  close: (id: string, body: ContainerVersionRequest) => post<ContainerExecution>(`${path(id)}/execution/close`, body),
  placeHold: (id: string, body: ContainerVersionRequest & { reason: string }) => post<ContainerExecution>(`${path(id)}/execution/holds`, body),
  trace: (id: string) => apiFetch<ContainerTrace>(`${path(id)}/execution/trace`, { method: "POST" }),
  getProduction: (id: string) => apiFetch<ContainerProduction>(`${path(id)}/production`),
  requestProduction: (id: string, body: ContainerVersionRequest & { proposalId: string }) => post<ContainerProduction>(`${path(id)}/production/request`, body),
  saveProductionDraft: (id: string, body: ContainerVersionRequest & { draft: ContainerProductionDraft }) => post<ContainerProduction>(`${path(id)}/production/draft`, body),
  commitProduction: (id: string, body: ContainerVersionRequest) => post<ContainerProduction>(`${path(id)}/production/commit`, body),
  prepareNextProduction: (id: string, body: ContainerVersionRequest) => post<ContainerProduction>(`${path(id)}/production/next`, body),
  approveProduction: (id: string, body: ContainerVersionRequest & { reason: string }) => post<ContainerProduction>(`${path(id)}/production/approve`, body),
  rejectProduction: (id: string, body: ContainerVersionRequest & { reason: string }) => post<ContainerProduction>(`${path(id)}/production/reject`, body),
  reviewScope: (id: string, body: ContainerScopeReviewRequest) => post<ContainerWorkflowDetail>(`${path(id)}/workflow/reviews`, body),
  draftHandoff: (id: string, body: ContainerHandoffDraftRequest) => post<ContainerWorkflowDetail>(`${path(id)}/workflow/handoffs`, body),
  approveHandoff: (id: string, body: ContainerHandoffCommitRequest & { reason: string }) => post<ContainerWorkflowDetail>(`${path(id)}/workflow/handoffs/approve`, body),
  commitHandoff: (id: string, body: ContainerHandoffCommitRequest) => post<ContainerWorkflowDetail>(`${path(id)}/workflow/handoffs/commit`, body),
  markNoticeRead: (id: string, body: ContainerVersionRequest & { noticeId: string }) => post<ContainerWorkflowDetail>(`${path(id)}/workflow/notifications/read`, body),
  respondToHold: (id: string, body: ContainerHoldResponseRequest) => post<ContainerWorkflowDetail>(`${path(id)}/workflow/hold-responses`, body),
  addDocument: (id: string, body: ContainerDocumentRequest) => post<ContainerWorkflowDetail>(`${path(id)}/workflow/documents`, body),
  downloadDocument: (id: string, documentId: string) => apiFetch<Blob>(`${path(id)}/workflow/documents/${encodeURIComponent(documentId)}/file`, { responseType: "blob" }),
  addSupplement: (id: string, body: ContainerVersionRequest & { evidenceId: string; reason: string }) => post<ContainerWorkflowDetail>(`${path(id)}/workflow/supplements`, body),
};
