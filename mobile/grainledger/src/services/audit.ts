// Read-only fields from web/grainledger/src/features/audit/pages/EventHistoryPage.tsx.
export interface AuditEvent {
  id: string;
  eventType: string;
  entityType: string;
  entityId: string;
  timestamp: string;
  version: number;
  actorEmail?: string;
}

function isAuditEvent(value: unknown): value is AuditEvent {
  if (!value || typeof value !== 'object') return false;
  return 'id' in value && typeof value.id === 'string'
    && 'eventType' in value && typeof value.eventType === 'string'
    && 'entityType' in value && typeof value.entityType === 'string'
    && 'entityId' in value && typeof value.entityId === 'string'
    && 'timestamp' in value && typeof value.timestamp === 'string'
    && 'version' in value && typeof value.version === 'number' && Number.isFinite(value.version)
    && (!('actorEmail' in value) || value.actorEmail === undefined || typeof value.actorEmail === 'string');
}

export function parseAuditEvents(value: unknown): AuditEvent[] {
  let list: unknown = value;
  if (value && typeof value === 'object' && !Array.isArray(value)) {
    list = 'items' in value ? value.items : 'events' in value ? value.events : undefined;
  }
  if (!Array.isArray(list) || !list.every(isAuditEvent)) {
    throw new Error('Lịch sử nghiệp vụ từ máy chủ không đúng định dạng.');
  }
  return list;
}

export function filterAuditEvents(events: AuditEvent[], query: string): AuditEvent[] {
  const search = query.trim().toLocaleLowerCase('vi');
  return events.filter((event) => [event.id, event.eventType, event.entityType, event.entityId, event.actorEmail ?? '']
    .some((value) => value.toLocaleLowerCase('vi').includes(search)));
}
