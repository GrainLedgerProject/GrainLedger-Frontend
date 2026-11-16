import type { ResidueProfileRetirement, ResidueProfileVersion } from './generated/schemas';

/** Supplemental responses verified against the local backend's ExportRules,
 * BlendPlanDraft, BlendPlanProposalEndpoints, BlendPlanDecisionEndpoints and
 * ResidueRules. The OpenAPI document does not describe these response bodies.
 * Decimal masses stay strings, as serialized by the backend.
 */
export interface ApiPage<T> {
  items: T[];
  page: number;
  pageSize: number;
  totalCount: number;
  hasMore: boolean;
}

export interface PageQuery { page?: number; pageSize?: number }
export interface ExportOrderSummary {
  id: string;
  code: string;
  marketId: string;
  commodityId: string;
  requiredMassKg: string;
  shippingFrom: string;
  shippingTo: string;
  createdAt: string;
  version: number;
}
export interface ExportContainerDto {
  id: string;
  orderId: string;
  internalCode: string;
  targetMassKg: string;
  originalMass: string;
  originalUnit: string;
  status: string;
  version: number;
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
  freshness: 'CURRENT' | 'STALE' | 'NOT_RECHECKED';
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
  status: 'PENDING' | 'APPROVED' | 'REJECTED' | 'REVOKED';
  decisionVersion: number;
  actorId: string | null;
  recordedAt: string | null;
  reason: string | null;
  activeApproval: boolean;
  reservation: BlendReservationAmounts & {
    status: 'NOT_RESERVED' | 'HELD' | 'CONSUMED' | 'RELEASED' | 'SETTLED';
    lines: Array<BlendReservationAmounts & { lotId: string; locationId: string | null }>;
  };
}
export interface CandidateQuery extends PageQuery {
  facilityId: string;
  includeExcluded?: boolean;
  productMatchOnly?: boolean;
  scopeRevision?: string;
  planId?: string;
}
export interface CandidateLineageQuery {
  facilityId: string;
  locationId: string;
  candidateRevision?: string;
}
export interface CandidateResidueQuery extends CandidateLineageQuery {
  candidateRevision: string;
  substanceIds: string;
}

export interface ApiResponseOverrides {
  'GET /api/export-orders': ApiPage<ExportOrderSummary>;
  'GET /api/export-orders/{id}/containers': ApiPage<ExportContainerDto>;
  'GET /api/export-containers/{id}/blend-plans': ApiPage<BlendPlanDraftDto>;
  'GET /api/blend-plans/{id}': BlendPlanDraftDto;
  'GET /api/blend-plans/{id}/proposal': BlendPlanProposal;
  'GET /api/blend-plans/{id}/decision': BlendPlanDecision;
  'POST /api/blend-plans/{id}/approve': BlendPlanDecision;
  'POST /api/blend-plans/{id}/reject': BlendPlanDecision;
  'POST /api/blend-plans/{id}/revoke': BlendPlanDecision;
  'GET /api/residue-rules': { items: ResidueProfileVersion[] };
  'GET /api/residue-rules/{id}': ResidueProfileVersion;
  'POST /api/residue-rules': ResidueProfileVersion;
  'POST /api/residue-rules/{id}/retire': ResidueProfileRetirement;
}
