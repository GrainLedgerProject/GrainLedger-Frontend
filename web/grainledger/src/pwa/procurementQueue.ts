import { procurementEndpoints, type RegisterProcurementRequest } from "@/api/procurement";

const DB_NAME = "grainledger-field";
const STORE_NAME = "procurement-queue";
const QUEUE_CHANGED = "grainledger:procurement-queue-changed";

export interface QueuedProcurement {
  id: string;
  request: RegisterProcurementRequest;
  capturedAt: string;
  attempts: number;
  lastError?: string;
}

function openDatabase(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, 1);
    request.onupgradeneeded = () => {
      if (!request.result.objectStoreNames.contains(STORE_NAME)) {
        request.result.createObjectStore(STORE_NAME, { keyPath: "id" });
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

async function withStore<T>(mode: IDBTransactionMode, action: (store: IDBObjectStore) => IDBRequest<T>): Promise<T> {
  const database = await openDatabase();
  return new Promise((resolve, reject) => {
    const transaction = database.transaction(STORE_NAME, mode);
    const request = action(transaction.objectStore(STORE_NAME));
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
    transaction.oncomplete = () => database.close();
    transaction.onerror = () => reject(transaction.error);
  });
}

function notifyQueueChanged() {
  window.dispatchEvent(new Event(QUEUE_CHANGED));
}

export function onProcurementQueueChanged(listener: () => void) {
  window.addEventListener(QUEUE_CHANGED, listener);
  return () => window.removeEventListener(QUEUE_CHANGED, listener);
}

export async function getQueuedProcurements(): Promise<QueuedProcurement[]> {
  const records = await withStore<QueuedProcurement[]>("readonly", (store) => store.getAll());
  return records.sort((a, b) => a.capturedAt.localeCompare(b.capturedAt));
}

export async function getQueuedProcurementCount() {
  return withStore<number>("readonly", (store) => store.count());
}

export async function queueProcurement(request: RegisterProcurementRequest) {
  const record: QueuedProcurement = {
    id: request.clientOperationId,
    request,
    capturedAt: request.capturedAt,
    attempts: 0,
  };
  await withStore("readwrite", (store) => store.put(record));
  notifyQueueChanged();
  return record;
}

export async function syncQueuedProcurements() {
  if (!navigator.onLine) return { synced: 0, failed: 0 };

  const records = await getQueuedProcurements();
  let synced = 0;
  let failed = 0;

  for (const record of records) {
    try {
      // clientOperationId is retained from capture to make retries idempotent server-side.
      await procurementEndpoints.registerProcurement(record.request);
      await withStore("readwrite", (store) => store.delete(record.id));
      synced += 1;
    } catch (error) {
      const message = error instanceof Error ? error.message : "Không thể đồng bộ bản ghi.";
      await withStore("readwrite", (store) => store.put({ ...record, attempts: record.attempts + 1, lastError: message }));
      failed += 1;
      // Stop here: a network failure usually affects all following records.
      if (!navigator.onLine) break;
    }
  }

  notifyQueueChanged();
  return { synced, failed };
}
