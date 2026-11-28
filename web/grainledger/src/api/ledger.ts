import { withApiQuery, type ApiPage, type PageQuery } from "./query";
import { apiFetch } from "./client";

import { parseLedgerHistoryResponse, type LedgerHistoryQuery } from "./history";

export interface FacilityDto {
  id: string;
  name: string;
  version: string;
  canEdit?: boolean;
  canDelete?: boolean;
  createdBy?: string;
}

export type LocationKind = "STORE" | "SILO" | "COMPARTMENT" | "ISOLATION";

export interface LocationDto {
  id: string;
  facilityId: string;
  name: string;
  kind: LocationKind | string;
  cleared: boolean;
  mixedBulk: boolean;
  ownerId: string | null;
  version: string;
  canEdit?: boolean;
  canDelete?: boolean;
  createdBy?: string;
  poolRevision?: string | null;
  currentPoolLotId?: string | null;
}

export interface EquipmentDto {
  id: string;
  facilityId: string;
  name: string;
  version: string;
  canEdit?: boolean;
  canDelete?: boolean;
  canRetire?: boolean;
  createdBy?: string;
}

export interface PolicyDto {
  id: string;
  facilityId: string;
  kind: "DRYING" | "MILLING" | "MERGE" | "BLENDING" | "BAGGING" | string;
  tolerancePercent: string;
  effectiveFrom: string;
  evidenceId: string;
}

export interface LedgerReference {
  id: string;
  name: string;
}

export interface FacilityAssignment {
  userId: string;
  facilityId: string;
  version: string;
  canEdit: boolean;
  canDelete: boolean;
}

interface CompatibilityPolicy {
  id: string;
  facilityId: string;
  inputProducts: string[];
  outputCommodityId: string;
  effectiveFrom: string;
  evidenceId: string;
}

interface MixedBulkPolicy {
  id: string;
  locationId: string;
  ownerId: string;
  commodityId: string;
  stage: string;
  productIdentity: string;
  effectiveFrom: string;
  evidenceId: string;
}

export interface BusinessHistoryDto {
  id: string;
  category: string;
  eventType: string;
  subjectId: string;
  reference: string;
  actorId: string | null;
  actorName: string | null;
  recordedAt: string;
  context: unknown;
  evidenceId: string | null;
}

export interface BusinessHistoryQuery {
  category?: string;
  eventType?: string;
  search?: string;
  from?: string;
  to?: string;
  page?: number | string;
  pageSize?: number | string;
}

export interface SetupApiResponse {
  facilities?: FacilityDto[];
  locations?: LocationDto[];
  equipment?: EquipmentDto[];
  policies?: PolicyDto[];
  commodities?: LedgerReference[];
  assignments?: FacilityAssignment[];
  owners?: LedgerReference[];
  compatibilities?: CompatibilityPolicy[];
  mixedBulkPolicies?: MixedBulkPolicy[];
}

export interface LedgerNotification {
  id: string;
  holdId: string | null;
  lotId: string;
  ownerId: string;
  ownerName: string;
  message: string;
  createdAt: string;
  readAt: string | null;
}

export interface NotificationQuery extends PageQuery {
  status?: "READ" | "UNREAD";
  search?: string;
  ownerId?: string;
  sortBy?: "createdAt" | "readAt";
  sortDirection?: "asc" | "desc";
}

export type ReceivingThresholdScope = "SYSTEM_DEFAULT" | "COMPANY_OVERRIDE";

export interface ReceivingThresholdHistoryItem {
  revision: string;
  companyId: string | null;
  companyName: string | null;
  scope: ReceivingThresholdScope;
  action: string;
  oldPercentage: string | null;
  newPercentage: string | null;
  actorName: string | null;
  recordedAt: string;
  reason: string;
}

export interface OwnReceivingThreshold {
  companyId: string;
  percentage: string;
  source: ReceivingThresholdScope;
  revision: string;
}

export type ReceivingStatus = "PENDING_ARRIVAL" | "AWAITING_MANAGER_REVIEW" |
  "REMEASUREMENT_REQUESTED" | "RECEIVED_MATCHED" | "RECEIVED_WITHIN_TOLERANCE" |
  "RECEIVED_SHORTAGE_APPROVED" | "BLOCKED_UNRESOLVED";
export type ReceivingReviewAction = "APPROVE_SHORTAGE" | "REQUEST_REMEASUREMENT" | "KEEP_BLOCKED";
export type ReceivingUnit = "KG" | "G" | "T";

interface ReceivingThreshold {
  percentage: string;
  revision: string;
  source: ReceivingThresholdScope;
}

interface ReceivingMeasurementLine {
  procurementItemId: string;
  measuredValue: string;
  measuredUnit: ReceivingUnit;
}

export interface LocationStockItem {
  lotId: string;
  code: string;
  stage: string;
  productIdentity?: string | null;
  riceVarietyId?: string | null;
  riceVariety?: string | null;
  varietyStatus?: "UNKNOWN" | "SINGLE" | "MIXED" | string;
  ownerName?: string | null;
  quantityKg: string;
  availableKg: string;
  restrictions: string[];
}

export interface LocationStockResponse {
  locationId: string;
  totalKg: string;
  items: LocationStockItem[];
  page: number;
  pageSize: number;
  totalCount: number;
  hasMore: boolean;
}

export interface ReceivingTask {
  id: string;
  code: string;
  ownerCompanyId: string;
  ownerCompanyName: string;
  facilityId: string;
  facilityName: string;
  receivingLocationName: string;
  status: ReceivingStatus;
  receivedAt: string;
  expectedTotalKg: string;
  actualTotalKg: string | null;
  usableStockKg: string;
  receivingVersion: number;
  latestMeasurementSetId: string | null;
  effectiveThreshold: ReceivingThreshold | null;
  items: {
    id: string;
    lineNo: number;
    lotCode: string;
    riceVarietyId?: string | null;
    riceVariety: string;
    expectedValue?: string;
    expectedUnit?: ReceivingUnit | string;
    expectedKg: string;
    actualValue?: string | null;
    actualUnit?: ReceivingUnit | string | null;
    actualKg: string | null;
  }[];
  measurementSets: {
    id: string;
    recordedAt: string;
    capturedAt: string;
    observations: string;
    threshold: ReceivingThreshold | null;
    items: (ReceivingMeasurementLine & { actualKg: string })[];
  }[];
  reviews: { id: string; measurementSetId: string; action: ReceivingReviewAction; reason: string; evidenceId: string; recordedAt: string }[];
}

export interface ReceivingQuery extends PageQuery {
  facilityId: string;
  search?: string;
  ownerId?: string;
  status?: ReceivingStatus;
  sortBy?: "receivedAt" | "status" | "owner";
  sortDirection?: "asc" | "desc";
}

export interface ReceivingMeasurementRequest {
  operationId: string;
  expectedReceivingVersion: number;
  capturedAt: string;
  observations: string;
  items: ReceivingMeasurementLine[];
}

export interface ReceivingReviewRequest {
  operationId: string;
  expectedReceivingVersion: number;
  measurementSetId: string;
  action: ReceivingReviewAction;
  reason: string;
  evidenceId: string;
}

export interface CreateCorrectionRequest {
  id: string;
  operationId: string;
  reason: string;
}

export interface PhysicalPosition {
  lotId: string;
  locationId: string;
  quantityKg: string;
}

export interface ReconcileCorrectionRequest {
  evidenceId: string;
  reason: string;
  reconciliation: PhysicalPosition[];
  replacementOperationId: string;
  replacementVersion: string;
}

export interface CorrectionOperation {
  id: string;
  version: string;
  status: string;
  kind: string;
  ownerId: string;
  facilityId: string;
  equipmentId: string;
  occurredAt: string;
  declaredLossKg: string;
  declaredLossReason?: string;
  createdBy?: string;
  canEdit?: boolean;
  canDelete?: boolean;
  varianceKg?: string;
  allowedVarianceKg?: string | null;
  confirmedVersion?: string | null;
  boundCorrectionId?: string | null;
  inputs: { lotId: string; locationId: string; quantityKg: string; poolRevision?: number | string }[];
  outputs: { id: string; code?: string; commodityId: string; stage: string; productIdentity?: string; locationId: string; quantityKg: string; originalLotId?: string }[];
}

export const ledgerEndpoints = {
  getSetup: () => apiFetch<SetupApiResponse>("/api/ledger/setup"),
  getLookups: () => apiFetch<unknown>("/api/ledger/lookups"),
  getLots: (params?: Record<string, string | number | undefined>) => {
    if (!params) return apiFetch<unknown>("/api/ledger/lots");
    const filtered = Object.fromEntries(
      Object.entries(params).filter(([, v]) => v !== undefined && v !== ""),
    ) as Record<string, string>;
    const qs = new URLSearchParams(filtered).toString();
    return apiFetch<unknown>(`/api/ledger/lots${qs ? "?" + qs : ""}`);
  },
  getLot: (id: string) =>
    apiFetch<unknown>(`/api/ledger/lots/${encodeURIComponent(id)}`),
  getLocationStock: (id: string, query?: PageQuery) =>
    apiFetch<LocationStockResponse>(
      withApiQuery(`/api/ledger/locations/${encodeURIComponent(id)}/stock`, query),
    ),

  // Facilities, Locations, Equipment
  createFacility: (req: object) =>
    apiFetch<unknown>("/api/ledger/facilities", {
      method: "POST",
      body: JSON.stringify(req),
    }),
  updateFacility: (id: string, req: object) =>
    apiFetch<unknown>(`/api/ledger/facilities/${encodeURIComponent(id)}`, {
      method: "PUT",
      body: JSON.stringify(req),
    }),
  deleteFacility: (id: string, req: object = {}) =>
    apiFetch<unknown>(`/api/ledger/facilities/${encodeURIComponent(id)}`, {
      method: "DELETE",
      body: req ? JSON.stringify(req) : undefined,
    }),

  createLocation: (req: object) =>
    apiFetch<unknown>("/api/ledger/locations", {
      method: "POST",
      body: JSON.stringify(req),
    }),
  updateLocation: (id: string, req: object) =>
    apiFetch<unknown>(`/api/ledger/locations/${encodeURIComponent(id)}`, {
      method: "PUT",
      body: JSON.stringify(req),
    }),
  deleteLocation: (id: string, req: object = {}) =>
    apiFetch<unknown>(`/api/ledger/locations/${encodeURIComponent(id)}`, {
      method: "DELETE",
      body: req ? JSON.stringify(req) : undefined,
    }),
  clearLocation: (id: string, req: object = {}) =>
    apiFetch<unknown>(
      `/api/ledger/locations/${encodeURIComponent(id)}/clearance`,
      {
        method: "POST",
        body: req ? JSON.stringify(req) : undefined,
      },
    ),

  createEquipment: (req: object) =>
    apiFetch<unknown>("/api/ledger/equipment", {
      method: "POST",
      body: JSON.stringify(req),
    }),
  updateEquipment: (id: string, req: object) =>
    apiFetch<unknown>(`/api/ledger/equipment/${encodeURIComponent(id)}`, {
      method: "PUT",
      body: JSON.stringify(req),
    }),
  deleteEquipment: (id: string, req: object = {}) =>
    apiFetch<unknown>(`/api/ledger/equipment/${encodeURIComponent(id)}`, {
      method: "DELETE",
      body: req ? JSON.stringify(req) : undefined,
    }),
  retireEquipment: (id: string, req: object) =>
    apiFetch<unknown>(
      `/api/ledger/equipment/${encodeURIComponent(id)}/retire`,
      {
        method: "POST",
        body: JSON.stringify(req),
      },
    ),

  // User Assignments to Facilities
  createAssignment: (req: object) =>
    apiFetch<unknown>("/api/ledger/assignments", {
      method: "POST",
      body: JSON.stringify(req),
    }),
  updateAssignment: (userId: string, facilityId: string, req: object) =>
    apiFetch<unknown>(
      `/api/ledger/assignments/${encodeURIComponent(userId)}/${encodeURIComponent(facilityId)}`,
      {
        method: "PUT",
        body: JSON.stringify(req),
      },
    ),
  deleteAssignment: (userId: string, facilityId: string, req: object = {}) =>
    apiFetch<unknown>(
      `/api/ledger/assignments/${encodeURIComponent(userId)}/${encodeURIComponent(facilityId)}`,
      {
        method: "DELETE",
        body: req ? JSON.stringify(req) : undefined,
      },
    ),

  // Operations
  getOperations: (
    query?: PageQuery & {
      status?: string;
      kind?: string;
      ownerId?: string;
      facilityId?: string;
      lotId?: string;
      search?: string;
      sortBy?: string;
      sortDirection?: "asc" | "desc";
      ids?: string;
      queueOnly?: boolean;
    },
  ) => apiFetch<unknown>(withApiQuery("/api/ledger/operations", query)),
  recordOperation: (req: object) =>
    apiFetch<unknown>("/api/ledger/operations", {
      method: "POST",
      body: JSON.stringify(req),
    }),
  getOperation: (id: string) =>
    apiFetch<unknown>(`/api/ledger/operations/${encodeURIComponent(id)}`),
  updateOperation: (id: string, req: object) =>
    apiFetch<unknown>(`/api/ledger/operations/${encodeURIComponent(id)}`, {
      method: "PUT",
      body: JSON.stringify(req),
    }),
  deleteOperation: (id: string, req: object = {}) =>
    apiFetch<unknown>(`/api/ledger/operations/${encodeURIComponent(id)}`, {
      method: "DELETE",
      body: req ? JSON.stringify(req) : undefined,
    }),
  confirmOperation: (id: string, req: object) =>
    apiFetch<unknown>(
      `/api/ledger/operations/${encodeURIComponent(id)}/confirm`,
      {
        method: "POST",
        body: JSON.stringify(req),
      },
    ),
  commitOperation: (id: string, req: object) =>
    apiFetch<unknown>(
      `/api/ledger/operations/${encodeURIComponent(id)}/commit`,
      {
        method: "POST",
        body: JSON.stringify(req),
      },
    ),

  // Quarantine Holds
  getHolds: (
    query?: PageQuery & {
      search?: string;
      ownerId?: string;
      status?: string;
      sortBy?: string;
      sortDirection?: "asc" | "desc";
    },
  ) => apiFetch<unknown>(withApiQuery("/api/ledger/holds", query)),
  createHold: (req: object) =>
    apiFetch<unknown>("/api/ledger/holds", {
      method: "POST",
      body: JSON.stringify(req),
    }),
  respondToHold: (id: string, req: object) =>
    apiFetch<unknown>(`/api/ledger/holds/${encodeURIComponent(id)}/respond`, {
      method: "POST",
      body: JSON.stringify(req),
    }),

  // Corrections & Reconciliations
  getCorrections: (query?: PageQuery) => apiFetch<unknown>(withApiQuery("/api/ledger/corrections", query)),
  createCorrection: (req: CreateCorrectionRequest) =>
    apiFetch<{ id: string }>("/api/ledger/corrections", {
      method: "POST",
      body: JSON.stringify(req),
    }),
  reconcileCorrection: (id: string, req: ReconcileCorrectionRequest) =>
    apiFetch<unknown>(
      `/api/ledger/corrections/${encodeURIComponent(id)}/reconcile`,
      {
        method: "POST",
        body: JSON.stringify(req),
      },
    ),
  commitCorrection: (id: string, req: { replacementOperationId: string }) =>
    apiFetch<unknown>(
      `/api/ledger/corrections/${encodeURIComponent(id)}/commit`,
      {
        method: "POST",
        body: JSON.stringify(req),
      },
    ),
  cancelCorrection: (id: string, req: { evidenceId: string; reason: string }) =>
    apiFetch<unknown>(
      `/api/ledger/corrections/${encodeURIComponent(id)}/cancel`,
      {
        method: "POST",
        body: JSON.stringify(req),
      },
    ),

  // Notifications
  getNotifications: (
    query: NotificationQuery = {},
    options: { signal?: AbortSignal } = {},
  ) =>
    apiFetch<ApiPage<LedgerNotification>>(
      withApiQuery("/api/ledger/notifications", query),
      options,
    ),
  readNotification: (id: string) =>
    apiFetch<{ id: string }>(
      `/api/ledger/notifications/${encodeURIComponent(id)}/read`,
      {
        method: "POST",
        body: JSON.stringify({}),
      },
    ),

  // Immutable History
  getHistory: async (
    query: LedgerHistoryQuery = {},
    options: { signal?: AbortSignal } = {},
  ) => {
    const params = new URLSearchParams();
    for (const [key, value] of Object.entries(query)) {
      if (value !== undefined && value !== "") params.set(key, String(value));
    }
    return parseLedgerHistoryResponse(
      await apiFetch<unknown>(
        `/api/ledger/history${params.size ? `?${params}` : ""}`,
        options,
      ),
    );
  },
  getBusinessHistory: (
    query: BusinessHistoryQuery = {},
    options: { signal?: AbortSignal } = {},
  ) =>
    apiFetch<ApiPage<BusinessHistoryDto>>(
      withApiQuery("/api/ledger/business-history", query),
      options,
    ),

  // Receiving tasks & reviews
  getReceivingTasks: (query: ReceivingQuery) =>
    apiFetch<ApiPage<ReceivingTask>>(withApiQuery("/api/ledger/receiving-tasks", query)),
  getReceiving: (id: string) =>
    apiFetch<ReceivingTask>(`/api/ledger/receiving/${encodeURIComponent(id)}`),
  recordReceivingMeasurement: (id: string, req: ReceivingMeasurementRequest) =>
    apiFetch<ReceivingTask>(
      `/api/ledger/receiving/${encodeURIComponent(id)}/measurements`,
      {
        method: "POST",
        body: JSON.stringify(req),
      },
    ),
  reviewReceiving: (id: string, req: ReceivingReviewRequest) =>
    apiFetch<ReceivingTask>(
      `/api/ledger/receiving/${encodeURIComponent(id)}/reviews`,
      {
        method: "POST",
        body: JSON.stringify(req),
      },
    ),

  // Policies & Compatibilities
  createPolicy: (req: PolicyDto) =>
    apiFetch<unknown>("/api/ledger/policies", {
      method: "POST",
      body: JSON.stringify(req),
    }),
  createCompatibility: (req: CompatibilityPolicy) =>
    apiFetch<unknown>("/api/ledger/compatibilities", {
      method: "POST",
      body: JSON.stringify(req),
    }),
  createMixedBulkPolicy: (req: MixedBulkPolicy & { identityScopeConfirmed: true }) =>
    apiFetch<unknown>("/api/ledger/mixed-bulk-policies", {
      method: "POST",
      body: JSON.stringify(req),
    }),

  // Unchanged lot transfer
  postTransfer: (req: object) =>
    apiFetch<unknown>("/api/ledger/transfers", {
      method: "POST",
      body: JSON.stringify(req),
    }),

  // Evidence
  uploadEvidence: (req: EvidenceRequest) =>
    apiFetch<unknown>("/api/ledger/evidence", {
      method: "POST",
      body: JSON.stringify(req),
    }),
  getEvidence: (id: string) =>
    apiFetch<Blob>(`/api/ledger/evidence/${encodeURIComponent(id)}`, { responseType: "blob" }),

  // Traceability and residue evaluation
  traceLot: (req: LotTraceRequest) =>
    apiFetch<unknown>("/api/ledger/trace", {
      method: "POST",
      body: JSON.stringify(req),
    }),
  traceLotFromLab: (req: LabTraceRequest) =>
    apiFetch<unknown>("/api/ledger/trace/from-lab", {
      method: "POST",
      body: JSON.stringify(req),
    }),
  getTraceStarts: (query?: {
    Mode?: string;
    Search?: string;
    FacilityId?: string;
    LocationId?: string;
    Page?: number | string;
    PageSize?: number | string;
  }) => apiFetch<unknown>(withApiQuery("/api/ledger/trace/starts", query)),
  getResidueEvaluations: (lotId: string) =>
    apiFetch<{ items: ResidueEvaluationSummary[] }>(
      `/api/ledger/lots/${encodeURIComponent(lotId)}/residue-evaluations`,
    ),
  createResidueEvaluation: (lotId: string, req: ResidueEvaluationRequest) =>
    apiFetch<ResidueEvaluation>(
      `/api/ledger/lots/${encodeURIComponent(lotId)}/residue-evaluations`,
      { method: "POST", body: JSON.stringify(req) },
    ),
  getResidueEvaluation: (lotId: string, evaluationId: string) =>
    apiFetch<ResidueEvaluation>(
      `/api/ledger/lots/${encodeURIComponent(lotId)}/residue-evaluations/${encodeURIComponent(evaluationId)}`,
    ),
  getResiduePreview: (lotId: string, query?: { substanceIds?: string }) =>
    apiFetch<ResidueEvaluation>(
      withApiQuery(
        `/api/ledger/lots/${encodeURIComponent(lotId)}/residue-preview`,
        query,
      ),
    ),

  // Receiving Thresholds
  getReceivingThresholds: () =>
    apiFetch<unknown>("/api/ledger/receiving-thresholds"),
  getReceivingThresholdHistory: (query?: PageQuery & { scope?: ReceivingThresholdScope; companyId?: string }) =>
    apiFetch<ApiPage<ReceivingThresholdHistoryItem>>(withApiQuery("/api/ledger/receiving-thresholds/history", query)),
  getOwnCompanyReceivingThreshold: () =>
    apiFetch<OwnReceivingThreshold>("/api/ledger/receiving-thresholds/own-company"),
  updateDefaultReceivingThreshold: (req: object) =>
    apiFetch<unknown>("/api/ledger/receiving-thresholds/default", {
      method: "PUT",
      body: JSON.stringify(req),
    }),
  createCompanyReceivingThreshold: (companyId: string, req: object) =>
    apiFetch<unknown>(
      `/api/ledger/receiving-thresholds/companies/${encodeURIComponent(companyId)}`,
      {
        method: "POST",
        body: JSON.stringify(req),
      },
    ),
  updateCompanyReceivingThreshold: (companyId: string, req: object) =>
    apiFetch<unknown>(
      `/api/ledger/receiving-thresholds/companies/${encodeURIComponent(companyId)}`,
      {
        method: "PUT",
        body: JSON.stringify(req),
      },
    ),
  deleteCompanyReceivingThreshold: (companyId: string, req: object = {}) =>
    apiFetch<unknown>(
      `/api/ledger/receiving-thresholds/companies/${encodeURIComponent(companyId)}`,
      {
        method: "DELETE",
        body: req ? JSON.stringify(req) : undefined,
      },
    ),

  // Byproduct Variety Mixing Policy
  getByproductVarietyPolicy: () =>
    apiFetch<ByproductVarietyPolicyResponse>("/api/ledger/byproduct-variety-policy"),
  updateByproductVarietyPolicy: (
    stage: ByproductStage,
    req: UpdateByproductVarietyPolicyRequest,
  ) =>
    apiFetch<ByproductVarietyPolicyItem>(
      `/api/ledger/byproduct-variety-policy/${encodeURIComponent(stage)}`,
      {
        method: "PUT",
        body: JSON.stringify(req),
      },
    ),
};

export type ByproductStage = "BRAN" | "HUSK";

export type ByproductVarietyPolicySource = "SYSTEM_DEFAULT" | "COMPANY_OVERRIDE";

export interface ByproductVarietyPolicyItem {
  stage: ByproductStage;
  allowCrossVariety: boolean;
  source: ByproductVarietyPolicySource;
  revision: string | null;
}

export interface ByproductVarietyPolicyResponse {
  companyId: string;
  items: ByproductVarietyPolicyItem[];
}

export interface UpdateByproductVarietyPolicyRequest {
  allowCrossVariety: boolean | null;
  expectedRevision: string | null;
  reason: string;
}

export interface EvidenceRequest {
  id: string;
  ownerId: string;
  facilityId: string;
  fileName: string;
  contentType: string;
  contentBase64: string;
}

export interface LabTraceRequest {
  reportId: string;
  resultId: string;
  view?: string;
}

export interface LotTraceRequest {
  lotId: string;
  direction?: string;
  view?: string;
}

export interface ResidueEvaluationRequest {
  id: string;
  substanceIds: Array<string>;
}

export interface ResidueEvaluationSummary {
  id: string;
  snapshotAt: string;
  persistedAt: string;
  engineVersion: string;
}

export interface ResidueEvaluation {
  id?: string;
  snapshotAt: string;
  engineVersion: string;
  results: {
    substanceId: string;
    status: string;
    lower: string | null;
    upper: string | null;
    unit: string | null;
    reasons: string[];
    provenance: { kind: string; sourceLotId: string; reportId?: string; resultId?: string; groupVersionId?: string; selectionId?: string }[];
    rules: { id: string; version: number; kind: string; evidenceReference: string }[];
  }[];
}
