import { procurementEndpoints, type RegisterProcurementRequest } from "@/api/procurement";
import { useAuthStore } from "@/app/store/authStore";
import { STORES, withStore } from "@/pwa/db";
import { currentOfflineOwnerKey } from "@/app/store/sessionOwner";

const STORE_NAME = STORES.PROCUREMENT_QUEUE;
const QUEUE_CHANGED = "grainledger:procurement-queue-changed";
const SYNC_CHANGED = "grainledger:procurement-sync-changed";
type QueueChangeReason = "queued" | "synced";
let syncPromise: Promise<{ synced: number; failed: number }> | null = null;

export const isProcurementSyncing = () => syncPromise !== null;

export function onProcurementSyncStateChanged(listener: () => void) {
  window.addEventListener(SYNC_CHANGED, listener);
  return () => window.removeEventListener(SYNC_CHANGED, listener);
}

export interface QueuedProcurement {
  id: string;
  ownerKey: string;
  request: RegisterProcurementRequest;
  capturedAt: string;
  attempts: number;
  lastError?: string;
}

function notifyQueueChanged(reason: QueueChangeReason) {
  if (typeof window !== "undefined") {
    window.dispatchEvent(new CustomEvent(QUEUE_CHANGED, { detail: reason }));
  }
}

export function onProcurementQueueChanged(listener: (reason: QueueChangeReason) => void) {
  if (typeof window === "undefined") return () => {};
  const handleChange = (event: Event) => listener((event as CustomEvent<QueueChangeReason>).detail);
  window.addEventListener(QUEUE_CHANGED, handleChange);
  return () => window.removeEventListener(QUEUE_CHANGED, handleChange);
}

export async function getQueuedProcurements(): Promise<QueuedProcurement[]> {
  const ownerKey = currentOfflineOwnerKey();
  if (!ownerKey) return [];
  try {
    const records = await withStore<QueuedProcurement[]>(STORE_NAME, "readonly", (store) => store.getAll());
    if (currentOfflineOwnerKey() !== ownerKey) return [];
    return (records || []).filter((record) => record.ownerKey === ownerKey)
      .sort((a, b) => a.capturedAt.localeCompare(b.capturedAt));
  } catch {
    return [];
  }
}

export async function getQueuedProcurementCount(): Promise<number> {
  return (await getQueuedProcurements()).length;
}

export async function getUnassignedProcurementCount(): Promise<number> {
  try {
    const records = await withStore<QueuedProcurement[]>(STORE_NAME, "readonly", (store) => store.getAll());
    return (records || []).filter((record) => !record.ownerKey).length;
  } catch { return 0; }
}

export async function queueProcurement(request: RegisterProcurementRequest): Promise<QueuedProcurement> {
  const ownerKey = currentOfflineOwnerKey();
  if (!ownerKey || !useAuthStore.getState().isAuthenticated) {
    throw new Error("Cần đăng nhập trước khi lưu phiếu ngoại tuyến.");
  }
  const record: QueuedProcurement = {
    id: `${ownerKey}:${request.clientOperationId}`,
    ownerKey,
    request,
    capturedAt: request.capturedAt,
    attempts: 0,
  };
  await withStore(STORE_NAME, "readwrite", (store) => store.put(record));
  notifyQueueChanged("queued");
  return record;
}

// Manual and automatic triggers share one batch and preserve clientOperationId.
export function syncQueuedProcurements(
  shouldContinue: () => boolean = () => true,
): Promise<{ synced: number; failed: number }> {
  if (syncPromise) return syncPromise;
  syncPromise = runSync(shouldContinue).finally(() => {
    syncPromise = null;
    window.dispatchEvent(new Event(SYNC_CHANGED));
  });
  window.dispatchEvent(new Event(SYNC_CHANGED));
  return syncPromise;
}

async function runSync(shouldContinue: () => boolean): Promise<{ synced: number; failed: number }> {
  const ownerKey = currentOfflineOwnerKey();
  if (!ownerKey || !useAuthStore.getState().isAuthenticated) return { synced: 0, failed: 0 };
  if (typeof navigator !== "undefined" && !navigator.onLine) {
    return { synced: 0, failed: 0 };
  }

  const records = await getQueuedProcurements();
  let synced = 0;
  let failed = 0;

  for (const record of records) {
    if (!shouldContinue() || currentOfflineOwnerKey() !== ownerKey || !useAuthStore.getState().isAuthenticated ||
      (typeof navigator !== "undefined" && !navigator.onLine)) break;
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

  notifyQueueChanged("synced");
  return { synced, failed };
}
