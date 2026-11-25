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
