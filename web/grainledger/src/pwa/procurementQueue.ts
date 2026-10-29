import { procurementEndpoints, type RegisterProcurementRequest } from "@/api/procurement";
import { STORES, withStore } from "./db";

const STORE_NAME = STORES.PROCUREMENT_QUEUE;
const QUEUE_CHANGED = "grainledger:procurement-queue-changed";

export interface QueuedProcurement {
  id: string;
  request: RegisterProcurementRequest;
  capturedAt: string;
  attempts: number;
  lastError?: string;
}

function notifyQueueChanged() {
  if (typeof window !== "undefined") {
    window.dispatchEvent(new Event(QUEUE_CHANGED));
  }
}

export function onProcurementQueueChanged(listener: () => void) {
  if (typeof window === "undefined") return () => {};
  window.addEventListener(QUEUE_CHANGED, listener);
  return () => window.removeEventListener(QUEUE_CHANGED, listener);
}

export async function getQueuedProcurements(): Promise<QueuedProcurement[]> {
  try {
    const records = await withStore<QueuedProcurement[]>(STORE_NAME, "readonly", (store) => store.getAll());
    return (records || []).sort((a, b) => a.capturedAt.localeCompare(b.capturedAt));
  } catch {
    return [];
  }
}

export async function getQueuedProcurementCount(): Promise<number> {
  try {
    return await withStore<number>(STORE_NAME, "readonly", (store) => store.count());
  } catch {
    return 0;
  }
}

export async function queueProcurement(request: RegisterProcurementRequest): Promise<QueuedProcurement> {
  const record: QueuedProcurement = {
    id: request.clientOperationId,
    request,
    capturedAt: request.capturedAt,
    attempts: 0,
  };
  await withStore(STORE_NAME, "readwrite", (store) => store.put(record));
  notifyQueueChanged();
  return record;
}

export async function syncQueuedProcurements(): Promise<{ synced: number; failed: number }> {
  if (typeof navigator !== "undefined" && !navigator.onLine) {
    return { synced: 0, failed: 0 };
  }

  const records = await getQueuedProcurements();
  let synced = 0;
  let failed = 0;

  for (const record of records) {
    try {
      // clientOperationId is retained from capture to make retries idempotent server-side.
      await procurementEndpoints.registerProcurement(record.request);
      await withStore(STORE_NAME, "readwrite", (store) => store.delete(record.id));
      synced += 1;
    } catch (error) {
      const message = error instanceof Error ? error.message : "Không thể đồng bộ bản ghi.";
      await withStore(STORE_NAME, "readwrite", (store) =>
        store.put({ ...record, attempts: record.attempts + 1, lastError: message })
      );
      failed += 1;
      // Stop early if connection drops during sync
      if (typeof navigator !== "undefined" && !navigator.onLine) break;
    }
  }

  notifyQueueChanged();
  return { synced, failed };
}
