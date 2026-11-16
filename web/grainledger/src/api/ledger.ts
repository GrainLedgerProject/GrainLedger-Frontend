import { withApiQuery, type ApiPage, type PageQuery } from "./query";
import { apiFetch } from "./client";

import { parseLedgerHistoryResponse, type LedgerHistoryQuery } from "./history";

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
  sortBy?: "createdAt" | "readAt";
  sortDirection?: "asc" | "desc";
}

export interface RecordOperationRequest {
  facilityId?: string;
  operationType: "DRYING" | "MILLING" | "BLENDING" | "BAGGING";
  inputs: Array<{ lotId: string; massKg: string }>;
  outputs: Array<{ productType: string; massKg: string; locationId?: string }>;
  declaredLossKg: string;
  declaredLossReason?: string;
  measuredVarianceKg?: string;
  varianceReason?: string;
}

export interface HoldRequest {
  lotId?: string;
  containerId?: string;
  reason: string;
  evidenceReference?: string;
}

export const ledgerEndpoints = {
  getSetup: () => apiFetch<unknown>("/api/ledger/setup"),
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
  getOperations: () => apiFetch<unknown>("/api/ledger/operations"),
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
  getHolds: () => apiFetch<unknown>("/api/ledger/holds"),
  issueHold: (req: object) =>
    apiFetch<unknown>("/api/ledger/holds", {
      method: "POST",
      body: JSON.stringify(req),
    }),
  createHold: (req: object) =>
    apiFetch<unknown>("/api/ledger/holds", {
      method: "POST",
      body: JSON.stringify(req),
    }),
  respondHold: (id: string, req: object) =>
    apiFetch<unknown>(`/api/ledger/holds/${encodeURIComponent(id)}/respond`, {
      method: "POST",
      body: JSON.stringify(req),
    }),
  respondToHold: (id: string, req: object) =>
    apiFetch<unknown>(`/api/ledger/holds/${encodeURIComponent(id)}/respond`, {
      method: "POST",
      body: JSON.stringify(req),
    }),

  // Corrections & Reconciliations
  getCorrections: () => apiFetch<unknown>("/api/ledger/corrections"),
  createCorrection: (req: object) =>
    apiFetch<unknown>("/api/ledger/corrections", {
      method: "POST",
      body: JSON.stringify(req),
    }),
  reconcileCorrection: (id: string, req: object) =>
    apiFetch<unknown>(
      `/api/ledger/corrections/${encodeURIComponent(id)}/reconcile`,
      {
        method: "POST",
        body: JSON.stringify(req),
      },
    ),
  commitCorrection: (id: string, req: object) =>
    apiFetch<unknown>(
      `/api/ledger/corrections/${encodeURIComponent(id)}/commit`,
      {
        method: "POST",
        body: JSON.stringify(req),
      },
    ),
  cancelCorrection: (id: string, req: object) =>
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

  // Receiving tasks & reviews
  getReceivingTasks: () => apiFetch<unknown>("/api/ledger/receiving-tasks"),
  getReceiving: (id: string) =>
    apiFetch<unknown>(`/api/ledger/receiving/${encodeURIComponent(id)}`),
  postReceivingMeasurements: (id: string, req: object) =>
    apiFetch<unknown>(
      `/api/ledger/receiving/${encodeURIComponent(id)}/measurements`,
      {
        method: "POST",
        body: JSON.stringify(req),
      },
    ),
  recordReceivingMeasurement: (id: string, req: object) =>
    apiFetch<unknown>(
      `/api/ledger/receiving/${encodeURIComponent(id)}/measurements`,
      {
        method: "POST",
        body: JSON.stringify(req),
      },
    ),
  postReceivingReviews: (id: string, req: object) =>
    apiFetch<unknown>(
      `/api/ledger/receiving/${encodeURIComponent(id)}/reviews`,
      {
        method: "POST",
        body: JSON.stringify(req),
      },
    ),
  reviewReceiving: (id: string, req: object) =>
    apiFetch<unknown>(
      `/api/ledger/receiving/${encodeURIComponent(id)}/reviews`,
      {
        method: "POST",
        body: JSON.stringify(req),
      },
    ),

  // Policies & Compatibilities
  createPolicy: (req: object) =>
    apiFetch<unknown>("/api/ledger/policies", {
      method: "POST",
      body: JSON.stringify(req),
    }),
  createCompatibility: (req: object) =>
    apiFetch<unknown>("/api/ledger/compatibilities", {
      method: "POST",
      body: JSON.stringify(req),
    }),
  createMixedBulkPolicy: (req: object) =>
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
    apiFetch<unknown>(`/api/ledger/evidence/${encodeURIComponent(id)}`),

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
    apiFetch<unknown>(
      `/api/ledger/lots/${encodeURIComponent(lotId)}/residue-evaluations`,
    ),
  createResidueEvaluation: (lotId: string, req: ResidueEvaluationRequest) =>
    apiFetch<unknown>(
      `/api/ledger/lots/${encodeURIComponent(lotId)}/residue-evaluations`,
      { method: "POST", body: JSON.stringify(req) },
    ),
  getResidueEvaluation: (lotId: string, evaluationId: string) =>
    apiFetch<unknown>(
      `/api/ledger/lots/${encodeURIComponent(lotId)}/residue-evaluations/${encodeURIComponent(evaluationId)}`,
    ),
  getResiduePreview: (lotId: string, query?: { substanceIds?: string }) =>
    apiFetch<unknown>(
      withApiQuery(
        `/api/ledger/lots/${encodeURIComponent(lotId)}/residue-preview`,
        query,
      ),
    ),

  // Receiving Thresholds
  getReceivingThresholds: () =>
    apiFetch<unknown>("/api/ledger/receiving-thresholds"),
  getReceivingThresholdCompanies: () =>
    apiFetch<unknown>("/api/ledger/receiving-thresholds/companies"),
  getReceivingThresholdHistory: () =>
    apiFetch<unknown>("/api/ledger/receiving-thresholds/history"),
  getOwnCompanyReceivingThreshold: () =>
    apiFetch<unknown>("/api/ledger/receiving-thresholds/own-company"),
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
};

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
