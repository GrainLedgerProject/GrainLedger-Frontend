import { ApiError } from "@/api/client";
import { apiSession } from "@/api/session";

export type PendingCommandStatus = "inflight" | "uncertain";

export interface PendingCommandRecord<T = unknown> {
  storageKey: string;
  operationId: string;
  payload: T;
  payloadJson: string;
  etag?: string;
  status: PendingCommandStatus;
  createdAt: string;
  updatedAt: string;
}

const DB_NAME = "grainledger-pending-commands";
const DB_VERSION = 1;
const STORE_NAME = "commands";
const SESSION_PREFIX = "grainledger.pendingCommand.";
const MAX_AGE_MS = 7 * 24 * 60 * 60 * 1000;

let ownerKeyReader: () => string | null = () => apiSession.read().ownerKey;
let scopeSubscriber: (onChange: () => void) => () => void = () => () => {};

export function configurePendingCommandScope(
  reader: () => string | null,
  subscribe: (onChange: () => void) => () => void,
): void {
  ownerKeyReader = reader;
  scopeSubscriber = subscribe;
}

export function subscribePendingCommandScope(onChange: () => void): () => void {
  return scopeSubscriber(onChange);
}

export function getCurrentPendingOwnerKey(): string {
  return ownerKeyReader() ?? apiSession.read().ownerKey ?? "anonymous";
}

export function buildPendingStorageKey(
  persistKey: string,
  ownerKey = getCurrentPendingOwnerKey(),
): string {
  return `${ownerKey}:${persistKey}`;
}

export function isUncertainCommandError(error: unknown): boolean {
  return (
    !(error instanceof ApiError) ||
    error.status === 0 ||
    error.status === 408 ||
    error.status >= 500
  );
}

export function extractCommandEtag(input: unknown): string | undefined {
  if (!input || typeof input !== "object") return undefined;
  const record = input as Record<string, unknown>;
  if (typeof record.etag === "string" && record.etag.trim()) {
    return record.etag.trim();
  }
  if (typeof record.version === "number" && Number.isFinite(record.version)) {
    return String(record.version);
  }
  if (
    record.body &&
    typeof record.body === "object" &&
    "version" in record.body
  ) {
    const version = (record.body as Record<string, unknown>).version;
    if (typeof version === "number" && Number.isFinite(version)) {
      return String(version);
    }
  }
  return undefined;
}

function isExpired(record: PendingCommandRecord): boolean {
  const created = Date.parse(record.createdAt);
  if (!Number.isFinite(created)) return false;
  return Date.now() - created > MAX_AGE_MS;
}

function sessionStorageKey(storageKey: string): string {
  return `${SESSION_PREFIX}${storageKey}`;
}

export function readPendingCommandSync<T>(
  storageKey: string,
): PendingCommandRecord<T> | null {
  if (typeof sessionStorage === "undefined") return null;
  try {
    const raw = sessionStorage.getItem(sessionStorageKey(storageKey));
    if (!raw) return null;
    const parsed = JSON.parse(raw) as PendingCommandRecord<T>;
    if (!parsed || typeof parsed.operationId !== "string" || isExpired(parsed)) {
      sessionStorage.removeItem(sessionStorageKey(storageKey));
      return null;
    }
    return parsed;
  } catch {
    return null;
  }
}

function writeSessionPendingCommand<T>(
  record: PendingCommandRecord<T>,
): void {
  if (typeof sessionStorage === "undefined") return;
  try {
    sessionStorage.setItem(
      sessionStorageKey(record.storageKey),
      JSON.stringify(record),
    );
  } catch {
    // Ignore quota or restricted storage errors cleanly.
  }
}

function removeSessionPendingCommand(storageKey: string): void {
  if (typeof sessionStorage === "undefined") return;
  try {
    sessionStorage.removeItem(sessionStorageKey(storageKey));
  } catch {
    // Ignore restricted storage errors cleanly.
  }
}

function openPendingDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (typeof indexedDB === "undefined") {
      reject(new Error("IndexedDB unavailable"));
      return;
    }
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME, { keyPath: "storageKey" });
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

async function withPendingStore<T>(
  mode: IDBTransactionMode,
  run: (store: IDBObjectStore) => IDBRequest<T>,
): Promise<T> {
  const db = await openPendingDb();
  return new Promise((resolve, reject) => {
    let tx: IDBTransaction;
    let request: IDBRequest<T>;
    try {
      tx = db.transaction(STORE_NAME, mode);
      request = run(tx.objectStore(STORE_NAME));
    } catch (error) {
      db.close();
      reject(error);
      return;
    }
    let result: T;
    request.onsuccess = () => {
      result = request.result;
    };
    tx.oncomplete = () => {
      db.close();
      resolve(result);
    };
    tx.onerror = () => {
      db.close();
      reject(tx.error ?? request.error);
    };
    tx.onabort = () => {
      db.close();
      reject(tx.error ?? new Error("IndexedDB transaction aborted"));
    };
  });
}

export async function loadPendingCommand<T>(
  storageKey: string,
): Promise<PendingCommandRecord<T> | null> {
  const cached = readPendingCommandSync<T>(storageKey);
  if (cached) return cached;
  try {
    const row = (await withPendingStore("readonly", (store) =>
      store.get(storageKey),
    )) as PendingCommandRecord<T> | undefined;
    if (!row || typeof row.operationId !== "string") return null;
    if (isExpired(row)) {
      void clearPendingCommand(storageKey);
      return null;
    }
    writeSessionPendingCommand(row);
    return row;
  } catch {
    return null;
  }
}

export function savePendingCommandSync<T>(
  record: PendingCommandRecord<T>,
): void {
  writeSessionPendingCommand(record);
  void withPendingStore("readwrite", (store) => store.put(record)).catch(
    () => undefined,
  );
}

export async function clearPendingCommand(storageKey: string): Promise<void> {
  removeSessionPendingCommand(storageKey);
  try {
    await withPendingStore("readwrite", (store) => store.delete(storageKey));
  } catch {
    // IndexedDB unavailable or mocked out cleanly.
  }
}
