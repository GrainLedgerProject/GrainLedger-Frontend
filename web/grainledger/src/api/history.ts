/** History returns ledger event kinds and custody command kinds.
 * Source: InitialSchema.sql (ledger_read_before_mixed_bulk and ledger_read_before_equipment_retirement),
 * with container loading and traceability events defined in ContainerWorkflow.sql.
 */
export const ledgerHistoryKinds = [
  'RECEIPT',
  'ARRIVAL',
  'TRANSFER',
  'TRANSFER_TO_MIXED',
  'POOL_INGRESS',
  'POOL_WITHDRAW',
  'CLEARANCE',
  'DRYING',
  'MILLING',
  'MERGE',
  'BLENDING',
  'BAGGING',
  'PROCESSING',
  'PROCESSING_OUTPUT',
  'HOLD',
  'HOLD_RESPONSE',
  'VARIANCE_CONFIRMATION',
  'CORRECTION_REQUEST',
  'PHYSICAL_RECONCILIATION',
  'RECONCILIATION_INVALIDATED',
  'CORRECTION_CANCEL_VERIFIED_ORIGINAL',
  'PROCESSING_COMPENSATION',
  'CONTAINER_LOADING',
  'TRACEBACK',
] as const;

/** Confirmed against backend LedgerEndpoints.cs and InitialSchema.sql, ledger_read_before_mixed_bulk.
 * The supplied OpenAPI document omits these query and response definitions.
 */
export interface LedgerHistoryQuery {
  page?: number;
  pageSize?: number;
  search?: string;
  sortBy?: 'occurredAt' | 'kind' | 'quantity';
  sortDirection?: 'asc' | 'desc';
  ownerId?: string;
  facilityId?: string;
  locationId?: string;
  lotId?: string;
  kind?: string;
}

export interface LedgerHistoryEntry {
  id: string;
  postingId: string | null;
  kind: string;
  occurredAt: string;
  actorId: string;
  operationId: string | null;
  lotId: string | null;
  locationId: string | null;
  ownerId: string | null;
  ownerName: string | null;
  quantityKg: string | null;
  reversesPostingId: string | null;
  details: unknown;
}

export interface LedgerHistoryPage {
  items: LedgerHistoryEntry[];
  page: number;
  pageSize: number;
  totalCount: number;
  hasMore: boolean;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}

function isEntry(value: unknown): value is LedgerHistoryEntry {
  if (!isRecord(value)) return false;
  const strings = ['id', 'kind', 'occurredAt', 'actorId'];
  const nullable = ['postingId', 'operationId', 'lotId', 'locationId', 'ownerId', 'ownerName', 'quantityKg', 'reversesPostingId'];
  return strings.every(key => typeof value[key] === 'string')
    && Number.isFinite(Date.parse(String(value.occurredAt)))
    && nullable.every(key => value[key] === null || typeof value[key] === 'string')
    && 'details' in value;
}

export function parseLedgerHistoryResponse(value: unknown): LedgerHistoryPage {
  if (!isRecord(value) || !Array.isArray(value.items) || !value.items.every(isEntry)
    || !Number.isInteger(value.page) || Number(value.page) < 1
    || !Number.isInteger(value.pageSize) || Number(value.pageSize) < 1
    || !Number.isInteger(value.totalCount) || Number(value.totalCount) < 0
    || typeof value.hasMore !== 'boolean') {
    throw new Error('Dữ liệu lịch sử từ máy chủ không đúng định dạng.');
  }
  return value as unknown as LedgerHistoryPage;
}
