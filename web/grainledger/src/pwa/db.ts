/**
 * Shared IndexedDB instance for Field Operations & Offline Cache
 * Database: grainledger-field (Version 2)
 */

export const DB_NAME = "grainledger-field";
export const DB_VERSION = 2;

export const STORES = {
  PROCUREMENT_QUEUE: "procurement-queue",
  OFFLINE_CACHE: "offline-cache",
} as const;

export function openDatabase(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (typeof indexedDB === "undefined") {
      reject(new Error("IndexedDB is not supported in this environment"));
      return;
    }

    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(STORES.PROCUREMENT_QUEUE)) {
        db.createObjectStore(STORES.PROCUREMENT_QUEUE, { keyPath: "id" });
      }
      if (!db.objectStoreNames.contains(STORES.OFFLINE_CACHE)) {
        db.createObjectStore(STORES.OFFLINE_CACHE, { keyPath: "key" });
      }
    };

    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

export async function withStore<T>(
  storeName: string,
  mode: IDBTransactionMode,
  action: (store: IDBObjectStore) => IDBRequest<T>
): Promise<T> {
  const database = await openDatabase();
  return new Promise((resolve, reject) => {
    let transaction: IDBTransaction;
    let request: IDBRequest<T>;
    try {
      transaction = database.transaction(storeName, mode);
      request = action(transaction.objectStore(storeName));
    } catch (error) {
      database.close();
      reject(error);
      return;
    }
    let result: T;
    request.onsuccess = () => { result = request.result; };
    transaction.oncomplete = () => {
      database.close();
      resolve(result);
    };
    transaction.onerror = () => {
      database.close();
      reject(transaction.error ?? request.error);
    };
    transaction.onabort = () => {
      database.close();
      reject(transaction.error ?? new Error("IndexedDB transaction aborted"));
    };
  });
}

