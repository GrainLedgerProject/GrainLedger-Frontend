import {
  ledgerEndpoints,
  type BusinessHistoryDto,
  type BusinessHistoryQuery,
} from "@/api/ledger";

export type BusinessCategory =
  | "ALL"
  | "PROCUREMENT"
  | "LAB"
  | "PLAN"
  | "RESERVATION"
  | "CONTAINER"
  | "HOLD"
  | "TRACE"
  | "LEDGER"
  | "ADMINISTRATION";

export interface BusinessHistoryItem {
  id: string;
  category: string;
  eventType: string;
  subjectId: string;
  referenceCode: string;
  actorName: string;
  status: string;
  timestamp: string;
  evidenceId: string | null;
  details: unknown;
}

export interface BusinessHistoryPageResult {
  items: BusinessHistoryItem[];
  page: number;
  pageSize: number;
  totalCount: number;
  hasMore: boolean;
}

export const BUSINESS_CATEGORIES: Exclude<BusinessCategory, "ALL">[] = [
  "PROCUREMENT",
  "LAB",
  "PLAN",
  "RESERVATION",
  "CONTAINER",
  "HOLD",
  "TRACE",
  "LEDGER",
  "ADMINISTRATION",
];

/** Exact `eventType` values emitted per category by `grainledger.ledger_business_history`. */
export const BUSINESS_EVENT_TYPES: ReadonlyArray<{
  category: Exclude<BusinessCategory, "ALL">;
  eventType: string;
}> = [
  // PROCUREMENT
  { category: "PROCUREMENT", eventType: "PROCUREMENT_COMMITTED" },
  { category: "PROCUREMENT", eventType: "ARRIVAL_MEASURED" },
  { category: "PROCUREMENT", eventType: "ARRIVAL_APPROVE_SHORTAGE" },
  { category: "PROCUREMENT", eventType: "ARRIVAL_REQUEST_REMEASUREMENT" },
  { category: "PROCUREMENT", eventType: "ARRIVAL_KEEP_BLOCKED" },
  // LAB
  { category: "LAB", eventType: "LAB_REPORT_RECEIVED" },
  { category: "LAB", eventType: "LAB_REPORT_REVISED" },
  { category: "LAB", eventType: "LAB_REPORT_CONFIRMED" },
  { category: "LAB", eventType: "LAB_REPORT_DELETED" },
  // PLAN
  { category: "PLAN", eventType: "ORDER_CREATED" },
  { category: "PLAN", eventType: "ORDER_UPDATED" },
  { category: "PLAN", eventType: "SPECIFICATION_VERSION_ADDED" },
  { category: "PLAN", eventType: "CONTAINERS_ADDED" },
  { category: "PLAN", eventType: "CONTAINER_UPDATED" },
  { category: "PLAN", eventType: "DRAFT_CREATED" },
  { category: "PLAN", eventType: "DRAFT_CANCELLED" },
  { category: "PLAN", eventType: "PLAN_PROPOSED" },
  { category: "PLAN", eventType: "PLAN_APPROVED" },
  { category: "PLAN", eventType: "PLAN_REJECTED" },
  { category: "PLAN", eventType: "PLAN_REVOKED" },
  { category: "PLAN", eventType: "PLAN_EXECUTION_STARTED" },
  { category: "PLAN", eventType: "SCOPE_APPROVED" },
  { category: "PLAN", eventType: "SCOPE_REJECTED" },
  { category: "PLAN", eventType: "SCOPE_STALE" },
  // RESERVATION
  { category: "RESERVATION", eventType: "RESERVE" },
  { category: "RESERVATION", eventType: "CONSUME" },
  { category: "RESERVATION", eventType: "RELEASE" },
  // CONTAINER
  { category: "CONTAINER", eventType: "METADATA" },
  { category: "CONTAINER", eventType: "LOAD" },
  { category: "CONTAINER", eventType: "CLOSE" },
  { category: "CONTAINER", eventType: "HANDOFF_DRAFT" },
  { category: "CONTAINER", eventType: "HANDOFF_APPROVE" },
  { category: "CONTAINER", eventType: "HANDOFF_QUALITY" },
  { category: "CONTAINER", eventType: "DOCUMENT" },
  { category: "CONTAINER", eventType: "SUPPLEMENT" },
  // HOLD
  { category: "HOLD", eventType: "CONTAINER_HOLD" },
  { category: "HOLD", eventType: "HOLD" },
  { category: "HOLD", eventType: "HOLD_RESPONSE" },
  // TRACE
  { category: "TRACE", eventType: "TRACEBACK" },
  // LEDGER
  { category: "LEDGER", eventType: "DRYING" },
  { category: "LEDGER", eventType: "MILLING" },
  { category: "LEDGER", eventType: "MERGE" },
  { category: "LEDGER", eventType: "BLENDING" },
  { category: "LEDGER", eventType: "BAGGING" },
  { category: "LEDGER", eventType: "CORRECTION_REQUEST" },
  { category: "LEDGER", eventType: "CORRECTION_CANCEL_VERIFIED_ORIGINAL" },
  // ADMINISTRATION
  { category: "ADMINISTRATION", eventType: "auth.login" },
  { category: "ADMINISTRATION", eventType: "auth.login_failed" },
  { category: "ADMINISTRATION", eventType: "auth.logout" },
  { category: "ADMINISTRATION", eventType: "auth.logout_all" },
  { category: "ADMINISTRATION", eventType: "auth.refresh" },
  { category: "ADMINISTRATION", eventType: "auth.refresh_reuse" },
  { category: "ADMINISTRATION", eventType: "auth.registration_started" },
  { category: "ADMINISTRATION", eventType: "auth.email_verification_failed" },
  { category: "ADMINISTRATION", eventType: "auth.email_verification_resent" },
  { category: "ADMINISTRATION", eventType: "auth.password_reset_requested" },
  { category: "ADMINISTRATION", eventType: "auth.password_reset" },
  { category: "ADMINISTRATION", eventType: "user.registered" },
  { category: "ADMINISTRATION", eventType: "user.access_updated" },
  { category: "ADMINISTRATION", eventType: "profile.updated" },
  { category: "ADMINISTRATION", eventType: "organization.created" },
  { category: "ADMINISTRATION", eventType: "ACTIVE_SUBSTANCE_CREATED" },
  { category: "ADMINISTRATION", eventType: "ACTIVE_SUBSTANCE_UPDATED" },
  { category: "ADMINISTRATION", eventType: "ACTIVE_SUBSTANCE_DELETED" },
  { category: "ADMINISTRATION", eventType: "COMMODITY_CREATED" },
  { category: "ADMINISTRATION", eventType: "COMMODITY_UPDATED" },
  { category: "ADMINISTRATION", eventType: "COMMODITY_ARCHIVED" },
  { category: "ADMINISTRATION", eventType: "MARKET_CREATED" },
  { category: "ADMINISTRATION", eventType: "MARKET_UPDATED" },
  { category: "ADMINISTRATION", eventType: "MEASUREMENT_UNIT_CREATED" },
  { category: "ADMINISTRATION", eventType: "MEASUREMENT_UNIT_UPDATED" },
  { category: "ADMINISTRATION", eventType: "MEASUREMENT_UNIT_DELETED" },
  { category: "ADMINISTRATION", eventType: "QUALITY_ATTRIBUTE_CREATED" },
  { category: "ADMINISTRATION", eventType: "QUALITY_ATTRIBUTE_UPDATED" },
  { category: "ADMINISTRATION", eventType: "RICE_VARIETY_CREATED" },
  { category: "ADMINISTRATION", eventType: "RICE_VARIETY_UPDATED" },
  { category: "ADMINISTRATION", eventType: "MRL_VERSION_CREATED" },
  { category: "ADMINISTRATION", eventType: "MRL_VERSION_UPDATED" },
  { category: "ADMINISTRATION", eventType: "MRL_VERSION_PUBLISHED" },
  { category: "ADMINISTRATION", eventType: "MRL_VERSION_CLOSED" },
  { category: "ADMINISTRATION", eventType: "MRL_VERSION_IMPORTED" },
  { category: "ADMINISTRATION", eventType: "MRL_LIMIT_CREATED" },
  { category: "ADMINISTRATION", eventType: "MRL_LIMIT_UPDATED" },
  { category: "ADMINISTRATION", eventType: "MRL_LIMIT_DELETED" },
];

export function getBusinessEventTypes(category: BusinessCategory): string[] {
  const matching =
    category === "ALL"
      ? BUSINESS_EVENT_TYPES
      : BUSINESS_EVENT_TYPES.filter((item) => item.category === category);
  return Array.from(new Set(matching.map((item) => item.eventType)));
}

function toBusinessHistoryItem(row: BusinessHistoryDto): BusinessHistoryItem {
  return {
    id: row.id,
    category: row.category,
    eventType: row.eventType,
    subjectId: row.subjectId,
    referenceCode: row.reference || row.subjectId || row.id,
    actorName: row.actorName || row.actorId || "Hệ thống",
    status: row.eventType,
    timestamp: row.recordedAt,
    evidenceId: row.evidenceId,
    details: row.context ?? row,
  };
}

export async function fetchBusinessHistory(
  query: BusinessHistoryQuery = {},
  options: { signal?: AbortSignal } = {},
): Promise<BusinessHistoryPageResult> {
  const res = await ledgerEndpoints.getBusinessHistory(query, options);
  return {
    items: (res.items ?? []).map(toBusinessHistoryItem),
    page: res.page ?? 1,
    pageSize: res.pageSize ?? 25,
    totalCount: res.totalCount ?? 0,
    hasMore: Boolean(res.hasMore),
  };
}
