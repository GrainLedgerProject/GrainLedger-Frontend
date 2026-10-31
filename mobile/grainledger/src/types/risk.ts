/**
 * Risk, Quarantine HOLD, and Traceback Types (matching Web specifications)
 */

export type HoldAction = 'QUARANTINE' | 'RELEASE' | 'CONDITIONAL_RELEASE' | 'DESTROY';

export interface HoldRecord {
  id: string;
  targetType: 'LOT' | 'CONTAINER' | 'SILO';
  targetId: string;
  targetCode: string;
  reason: string;
  reasonCategory: 'MRL_EXCEEDANCE' | 'MOISTURE_DEVIATION' | 'PHYSICAL_DEFECT' | 'AUDIT_SUSPICION';
  evidenceReference?: string;
  issuedBy: string;
  issuedAt: string;
  status: 'ACTIVE_HOLD' | 'RESOLVED_RELEASED' | 'RESOLVED_DESTROYED';
  resolutionNotes?: string;
  resolvedAt?: string;
  resolvedBy?: string;
}

export interface TraceGraphNode {
  id: string;
  label: string;
  type: 'PLOT' | 'FARMER' | 'PROCUREMENT' | 'RAW_LOT' | 'OPERATION' | 'MILLED_LOT' | 'CONTAINER' | 'LAB_SAMPLE';
  code: string;
  detail: string;
  status: string;
  percentage?: number;
  date?: string;
}

export interface TraceGraphEdge {
  from: string;
  to: string;
  relation: string;
  weight?: string;
}

