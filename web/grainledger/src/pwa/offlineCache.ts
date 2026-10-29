/**
 * Offline Reference Data & Farmer Cache
 * Persists farmer lists and procurement reference catalogs in IndexedDB & LocalStorage
 * Enables creating procurement receipts completely offline with zero network connectivity.
 */

import { procurementEndpoints } from "@/api/procurement";
import { logger } from "@/shared/utils/logger";
import { STORES, withStore } from "./db";

export interface CachedFarmer {
  id: string;
  name: string;
  code: string;
  contact?: string;
  totalPlots?: number;
  totalAreaHa?: number;
}

export interface CachedReferenceData {
  collectionSites?: Array<{ id: string; name: string; code?: string }>;
  receivingLocations?: Array<{ id: string; name: string; code?: string }>;
  commodities?: Array<{ id: string; name: string; code?: string }>;
  plotSeasons?: Array<{ id: string; name: string; riceVariety?: string }>;
}

const LOCAL_STORAGE_FARMERS_KEY = "grainledger_cached_farmers";
const LOCAL_STORAGE_REF_KEY = "grainledger_cached_ref_data";
const CACHE_UPDATED_EVENT = "grainledger:offline-cache-updated";

function notifyCacheUpdated() {
  if (typeof window !== "undefined") {
    window.dispatchEvent(new Event(CACHE_UPDATED_EVENT));
  }
}

export function onOfflineCacheUpdated(listener: () => void) {
  if (typeof window === "undefined") return () => {};
  window.addEventListener(CACHE_UPDATED_EVENT, listener);
  return () => window.removeEventListener(CACHE_UPDATED_EVENT, listener);
}

/**
 * Reads cached farmers: first from IndexedDB, then fallback to LocalStorage, then SEED_FARMERS.
 */
export async function getCachedFarmers(): Promise<CachedFarmer[]> {
  try {
    const record = await withStore<{ key: string; value: CachedFarmer[] }>(
      STORES.OFFLINE_CACHE,
      "readonly",
      (store) => store.get("farmers")
    );
    if (record?.value && Array.isArray(record.value) && record.value.length > 0) {
      return record.value;
    }
  } catch {
    // IndexedDB not ready or error, check localStorage
  }

  if (typeof localStorage !== "undefined") {
    try {
      const stored = localStorage.getItem(LOCAL_STORAGE_FARMERS_KEY);
      if (stored) {
        const parsed = JSON.parse(stored);
        if (Array.isArray(parsed) && parsed.length > 0) {
          return parsed;
        }
      }
    } catch {
      // ignore
    }
  }

  return [];
}

/**
 * Saves farmer list to IndexedDB and LocalStorage for offline use.
 * @param notify Whether to broadcast cache update event (default: true). Set to false when saving from within a fetch handler to avoid feedback loops.
 */
export async function saveCachedFarmers(farmers: CachedFarmer[], notify = true): Promise<void> {
  if (!farmers || farmers.length === 0) return;

  // Mirror to LocalStorage for instant synchronous access
  if (typeof localStorage !== "undefined") {
    try {
      localStorage.setItem(LOCAL_STORAGE_FARMERS_KEY, JSON.stringify(farmers));
    } catch {
      // ignore quota exceeded
    }
  }

  // Persist to IndexedDB
  try {
    await withStore(STORES.OFFLINE_CACHE, "readwrite", (store) =>
      store.put({ key: "farmers", value: farmers, updatedAt: new Date().toISOString() })
    );
    if (notify) {
      notifyCacheUpdated();
    }
  } catch (err) {
    logger.warn("Failed to write farmers to IndexedDB offline cache:", err);
  }
}

/**
 * Reads cached reference data: IndexedDB -> LocalStorage
 */
export async function getCachedRefData(): Promise<CachedReferenceData | null> {
  try {
    const record = await withStore<{ key: string; value: CachedReferenceData }>(
      STORES.OFFLINE_CACHE,
      "readonly",
      (store) => store.get("reference_data")
    );
    if (record?.value) {
      return record.value;
    }
  } catch {
    // fallback
  }

  if (typeof localStorage !== "undefined") {
    try {
      const stored = localStorage.getItem(LOCAL_STORAGE_REF_KEY);
      if (stored) {
        return JSON.parse(stored);
      }
    } catch {
      // ignore
    }
  }

  return null;
}

/**
 * Saves reference data to IndexedDB and LocalStorage
 * @param notify Whether to broadcast cache update event (default: true). Set to false when saving from within a fetch handler to avoid feedback loops.
 */
export async function saveCachedRefData(data: CachedReferenceData, notify = true): Promise<void> {
  if (!data) return;

  if (typeof localStorage !== "undefined") {
    try {
      localStorage.setItem(LOCAL_STORAGE_REF_KEY, JSON.stringify(data));
    } catch {
      // ignore
    }
  }

  try {
    await withStore(STORES.OFFLINE_CACHE, "readwrite", (store) =>
      store.put({ key: "reference_data", value: data, updatedAt: new Date().toISOString() })
    );
    if (notify) {
      notifyCacheUpdated();
    }
  } catch (err) {
    logger.warn("Failed to write reference data to IndexedDB offline cache:", err);
  }
}

/**
 * Synchronizes offline cache with server when online.
 * Fetches fresh farmer list and reference data, storing them locally.
 */
export async function syncOfflineCache(): Promise<{ farmersCount: number; success: boolean }> {
  if (typeof navigator !== "undefined" && !navigator.onLine) {
    const current = await getCachedFarmers();
    return { farmersCount: current.length, success: false };
  }

  try {
    logger.info("Synchronizing offline reference data and farmer catalog...");
    const [farmersRes, refRes] = await Promise.all([
      procurementEndpoints.getFarmers({ pageSize: 200 }).catch(() => null),
      procurementEndpoints.getProcurementReferenceData().catch(() => null),
    ]);

    let farmersCount = 0;

    if (farmersRes) {
      const items = Array.isArray(farmersRes)
        ? farmersRes
        : (farmersRes as { items?: CachedFarmer[] })?.items || [];

      if (items.length > 0) {
        await saveCachedFarmers(items);
        farmersCount = items.length;
      }
    }

    if (refRes) {
      await saveCachedRefData(refRes as CachedReferenceData);
    }

    logger.info(`Offline cache synchronized: ${farmersCount} farmers cached.`);
    return { farmersCount, success: true };
  } catch (err) {
    logger.warn("Unable to synchronize offline cache from network:", err);
    return { farmersCount: 0, success: false };
  }
}

