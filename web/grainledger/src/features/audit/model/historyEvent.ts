import type { LedgerHistoryEntry } from '@/api/history';

export interface AuditEvent extends LedgerHistoryEntry {
  rowKey: string;
  eventType: string;
  timestamp: string;
  entityType: 'Lot' | 'Operation' | 'Event';
  entityId: string;
  payload: unknown;
}

/** Display fields are derived explicitly; no email, hash or verification is returned by this API. */
export function toAuditEvent(entry: LedgerHistoryEntry): AuditEvent {
  return {
    ...entry,
    rowKey: `${entry.id}:${entry.postingId ?? 'event'}`,
    eventType: entry.kind,
    timestamp: entry.occurredAt,
    entityType: entry.lotId ? 'Lot' : entry.operationId ? 'Operation' : 'Event',
    entityId: entry.lotId ?? entry.operationId ?? entry.id,
    payload: entry.details,
  };
}
