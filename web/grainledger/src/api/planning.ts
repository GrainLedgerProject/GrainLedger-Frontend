import type { ApiPage, PageQuery } from "./query";
import { apiFetch } from "./client";
import { withApiQuery } from "./query";

export const planningEndpoints = {
  getBlendPlans: (id: string, query?: PageQuery) =>
    apiFetch<ApiPage<BlendPlanDraftDto>>(
      withApiQuery(
        `/api/export-containers/${encodeURIComponent(id)}/blend-plans`,
        query,
      ),
    ),
  createDraft: (id: string, body: CreateBlendPlanDraftRequest) =>
    apiFetch<BlendPlanDraftDto>(
      `/api/export-containers/${encodeURIComponent(id)}/blend-plans/drafts`,
      { method: "POST", body: JSON.stringify(body) },
    ),
  getBlendPlan: (id: string) =>
    apiFetch<BlendPlanDraftDto>(`/api/blend-plans/${encodeURIComponent(id)}`),
  getHistory: (id: string) =>
    apiFetch<unknown>(`/api/blend-plans/${encodeURIComponent(id)}/history`),
  previewResidue: (id: string, body: PlanResiduePreviewRequest) =>
    apiFetch<unknown>(
      `/api/blend-plans/${encodeURIComponent(id)}/residue-preview`,
      { method: "POST", body: JSON.stringify(body) },
    ),
  previewPlan: (id: string, body: PreviewBlendPlanRequest) =>
    apiFetch<BlendPreview>(`/api/blend-plans/${encodeURIComponent(id)}/preview`, {
      method: "POST",
      body: JSON.stringify(body),
    }),
  proposePlan: (id: string, body: ProposeBlendPlanRequest) =>
    apiFetch<unknown>(`/api/blend-plans/${encodeURIComponent(id)}/propose`, {
      method: "POST",
      body: JSON.stringify(body),
    }),
  getProposal: (id: string) =>
    apiFetch<BlendPlanProposal>(
      `/api/blend-plans/${encodeURIComponent(id)}/proposal`,
    ),
  getDecision: (id: string) =>
    apiFetch<BlendPlanDecision>(
      `/api/blend-plans/${encodeURIComponent(id)}/decision`,
    ),
  approvePlan: (id: string, body: ApproveBlendPlanRequest) =>
    apiFetch<BlendPlanDecision>(
      `/api/blend-plans/${encodeURIComponent(id)}/approve`,
      { method: "POST", body: JSON.stringify(body) },
    ),
  rejectPlan: (id: string, body: RejectBlendPlanRequest) =>
    apiFetch<BlendPlanDecision>(
      `/api/blend-plans/${encodeURIComponent(id)}/reject`,
      { method: "POST", body: JSON.stringify(body) },
    ),
  revokePlan: (id: string, body: RevokeBlendPlanRequest) =>
    apiFetch<BlendPlanDecision>(
      `/api/blend-plans/${encodeURIComponent(id)}/revoke`,
      { method: "POST", body: JSON.stringify(body) },
    ),
  cancelDraft: (id: string, body: CancelBlendPlanDraftRequest) =>
    apiFetch<unknown>(`/api/blend-plans/${encodeURIComponent(id)}/cancel`, {
      method: "POST",
      body: JSON.stringify(body),
    }),
  getApplicableAssessmentPolicy: (query: {
    marketId: string;
    commodityId: string;
    at?: string;
  }) =>
    apiFetch<AssessmentPolicy>(
      withApiQuery("/api/blend-assessment-policies/applicable", query),
    ),
  publishAssessmentPolicy: (body: PublishBlendAssessmentPolicyRequest) =>
    apiFetch<unknown>("/api/blend-assessment-policies", {
      method: "POST",
      body: JSON.stringify(body),
    }),
  createYieldRule: (body: object) =>
    apiFetch<unknown>("/api/ledger/planning-yield-rules", {
      method: "POST",
      body: JSON.stringify(body),
    }),
  getApplicableYieldRules: (query: {
    ownerId: string;
    facilityId: string;
    compatibilityPolicyId: string;
    at?: string;
  }) =>
    apiFetch<unknown>(
      withApiQuery("/api/ledger/planning-yield-rules/applicable", query),
    ),
  createQualityObservation: (body: PlanningQualityObservationRequest) =>
    apiFetch<PlanningQualityObservation>("/api/ledger/planning-quality-observations", {
      method: "POST",
      body: JSON.stringify(body),
    }),
  getQualityObservations: (query: {
    ownerId: string;
    facilityId: string;
    lotIds: Array<string>;
    at?: string;
  }) =>
    apiFetch<PlanningQualityObservation[]>(
      withApiQuery("/api/ledger/planning-quality-observations", query),
    ),
};

export interface AssessmentPolicy extends PublishBlendAssessmentPolicyRequest {
  versionNo: number;
}

export interface PlanningQualityObservation {
  id: string;
  attributeId: string;
  versionNo: number;
  measuredValue: string;
  unit: string;
  evidenceId: string;
}

export interface PlanningQualityObservationRequest extends PlanningQualityObservation {
  lotId: string;
  ownerId: string;
  facilityId: string;
  measuredAt: string;
  reportReference: string;
  reviewedBy: string;
  reviewAuthority: string;
  reviewedAt: string;
  subjectConfirmed: true;
}

export interface ApproveBlendPlanRequest {
  operationId: string;
  proposalId: string;
  expectedDecisionVersion: null | number | string;
}

export interface CancelBlendPlanDraftRequest {
  operationId: string;
}

export interface CreateBlendPlanDraftRequest {
  operationId: string;
  orderVersion: number | string;
  containerVersion: number | string;
  targetProductIdentity: null | string;
}

export interface PlanResiduePosition {
  lotId: string;
  locationId: string;
  quantityKg: string;
  candidateRevision: string;
}

export interface PlanResiduePreviewRequest {
  facilityId: string;
  scopeRevision: string;
  mode: string;
  compatibilityPolicyId: null | string;
  selected: Array<PlanResiduePosition>;
  substanceIds: Array<string>;
}

export interface PreviewBlendPlanRequest {
  facilityId: string;
  scopeRevision: string;
  maxIterations?: number | string;
  objective?: "MIN_LOCATIONS" | "RETAIN_HEAD_RICE" | "MIN_LOTS" | "MIN_MOISTURE" | "MAX_RESIDUE_HEADROOM";
  moistureAttributeId?: string;
  adjustment?: { previewReference: string; firstQuantityKg: string };
}

export interface ProposeBlendPlanRequest {
  operationId: string;
  previewReference: string;
}

export interface PublishBlendAssessmentPolicyRequest {
  id: string;
  marketId: string;
  commodityId: string;
  versionNo: number | string;
  effectiveFrom: string;
  effectiveTo: null | string;
  requiredSubstanceIds: Array<string>;
  mrlMarginFraction: string;
  residueBasis: string;
  qualityRules: Array<PublishedQualityPropagationRule>;
  evidenceReference: string;
  reviewedBy: string;
  reviewAuthority: string;
  reviewedAt: string;
}

export interface PublishedQualityPropagationRule {
  attributeId: string;
  unit: string;
  calculation: string;
}

export interface RejectBlendPlanRequest {
  operationId: string;
  proposalId: string;
  expectedDecisionVersion: null | number | string;
  reason: null | string;
}

export interface RevokeBlendPlanRequest {
  operationId: string;
  proposalId: string;
  expectedDecisionVersion: null | number | string;
  reason: null | string;
}

export interface BlendPlanDraftDto {
  id: string;
  orderId: string;
  containerId: string;
  specificationId: string;
  versionNo: number;
  version: number;
  status: string;
  targetMassKg: string;
  targetProductIdentity: string | null;
  demandSnapshot: string;
  createdAt: string;
  cancelledAt: string | null;
  demandCurrent: boolean;
  canCancel: boolean;
  hasProposal: boolean;
}

export interface BlendPlanProposal {
  id: string;
  planId: string;
  previewId: string;
  proposedAt: string;
  assessment: unknown;
  demandCurrent: boolean;
  stockAndEvidenceCurrent: boolean | null;
  freshness: "CURRENT" | "STALE" | "NOT_RECHECKED";
  freshnessReasons: string[];
  stockReserved: boolean;
}

export interface BlendReservationAmounts {
  reservedKg: string;
  releasedKg: string;
  consumedKg: string;
  remainingKg: string;
}

export interface BlendPlanDecision {
  planId: string;
  proposalId: string;
  status: "PENDING" | "APPROVED" | "REJECTED" | "REVOKED";
  decisionVersion: number;
  actorId: string | null;
  recordedAt: string | null;
  reason: string | null;
  activeApproval: boolean;
  reservation: BlendReservationAmounts & {
    status: "NOT_RESERVED" | "HELD" | "CONSUMED" | "RELEASED" | "SETTLED";
    lines: Array<
      BlendReservationAmounts & {
        lotId: string;
        locationId: string | null;
      }
    >;
  };
}

export interface BlendPreview {
  outcome: string;
  reasons: string[];
  assessmentStatus: string;
  previewReference: string | null;
  canPropose: boolean;
  selection: { selectedMassKg: string; allocations: { lotId: string; lotCode: string; locationId: string; quantityKg: string }[] } | null;
  assessmentFindings: { code: string; status: string; actual: string | null; limit: string | null; unit: string | null }[];
  iterations?: number;
  predictedOutputKg?: string | null;
  ratioRange?: { minimumKg: string; maximumKg: string } | null;
  optimization?: { method: string; objective: string | null; positionsUsed: number | null; lotsUsed?: number; headRiceUsedKg?: string; weightedMoisture?: string; optimal: boolean } | null;
  calculationSteps?: { method: string; attempts: { mode: string; candidateCount: number; inputKg: number; status: string;
    variables: number; constraints: number; elapsedMs: number; objective: number | null; bestBound: number | null; nodes: number | null; assessmentStatus: string | null }[] } | null;
  substanceNames?: Record<string, string>;
  residueHeadroom?: { substanceId: string; ratio: number } | null;
  inputResidueExclusions?: { lotId: string; lotCode: string; substanceId: string; code: string; upper: string | null; mrl: string | null; unit: string | null }[];
}
