export interface CorrectionRecord {
  id: string;
  operationId: string;
  facilityId?: string;
  category?: string;
  reason: string;
  reconciliationNotes?: string;
  evidenceId?: string | null;
  replacementOperationId?: string | null;
  reconciliation?: import("@/api/ledger").PhysicalPosition[] | null;
  status: "PENDING_REVIEW" | "RECONCILED" | "COMMITTED" | "CANCELLED";
  createdAt: string;
  createdBy?: string;
  evidenceReference?: string;
  evidenceFileName?: string;
  proposedReversals?: Array<{
    lotId: string;
    lotName?: string;
    deltaMassKg: string;
  }>;
}

export function parseCorrectionsResponse(res: unknown): CorrectionRecord[] {
  let items: CorrectionRecord[];
  if (Array.isArray(res)) {
    items = res as CorrectionRecord[];
  } else if (res && typeof res === "object") {
    if (
      "items" in res &&
      Array.isArray((res as { items: CorrectionRecord[] }).items)
    ) {
      items = (res as { items: CorrectionRecord[] }).items;
    } else if (
      "corrections" in res &&
      Array.isArray((res as { corrections: CorrectionRecord[] }).corrections)
    ) {
      items = (res as { corrections: CorrectionRecord[] }).corrections;
    } else {
      items = [];
    }
  } else {
    items = [];
  }
  return items.map((item) => ({
    ...item,
    status:
      (item.status as string) === "REQUESTED" ? "PENDING_REVIEW" : item.status,
    createdAt:
      item.createdAt ||
      (item as CorrectionRecord & { requestedAt?: string }).requestedAt ||
      "",
  }));
}
