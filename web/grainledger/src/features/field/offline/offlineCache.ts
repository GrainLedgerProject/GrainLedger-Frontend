/**
 * Offline Reference Data & Farmer Cache
 * Persists farmer lists, receiving options, commodities, mass units and plot seasons
 * Enables creating procurement receipts completely offline with zero network connectivity.
 */

import {
  procurementEndpoints,
  type ProcurementCommodity,
  type ProcurementMassUnit,
  type ProcurementReceivingOption,
  type ProcurementReferenceResponse,
} from "@/api/procurement";
import { logger } from "@/shared/utils/logger";
import { STORES, withStore } from "@/pwa/db";
import { currentOfflineOwnerKey } from "@/app/store/sessionOwner";

export interface CachedFarmer {
  id: string;
  name: string;
  code: string;
  contact?: string;
  totalPlots?: number;
  totalAreaHa?: number;
}

export interface CachedPlotSeason {
  id: string;
  plotId: string;
  seasonId?: string;
  plotCode?: string;
  seasonName?: string;
  riceVariety?: string;
}

export interface CachedPlot {
  id: string;
  farmerId: string;
  code: string;
  areaHa?: number;
}

export interface CachedReferenceData {
  receivingOptions?: ProcurementReceivingOption[];
  commodity?: ProcurementCommodity;
  massUnits?: ProcurementMassUnit[];
  maxLinesPerReceipt?: number;
  plotSeasons?: CachedPlotSeason[];
  plots?: CachedPlot[];
  // Backwards compatibility for legacy views
  collectionSites?: Array<{ id: string; name: string; code?: string }>;
  receivingLocations?: Array<{ id: string; name: string; code?: string }>;
  commodities?: Array<{ id: string; name: string; code?: string }>;
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
 * Reads cached farmers: first from IndexedDB, then fallback to LocalStorage.
 */
export async function getCachedFarmers(): Promise<CachedFarmer[]> {
  const ownerKey = currentOfflineOwnerKey();
  if (!ownerKey) return [];
  try {
    const record = await withStore<{ key: string; value: CachedFarmer[] }>(
      STORES.OFFLINE_CACHE,
      "readonly",
      (store) => store.get(`farmers:${ownerKey}`)
    );
    if (ownerKey !== currentOfflineOwnerKey()) return [];
    if (record?.value && Array.isArray(record.value) && record.value.length > 0) {
      return record.value;
    }
  } catch {
    // IndexedDB not ready or error, check localStorage
  }

  if (ownerKey !== currentOfflineOwnerKey()) return [];
  if (typeof localStorage !== "undefined") {
    try {
      const stored = localStorage.getItem(`${LOCAL_STORAGE_FARMERS_KEY}:${ownerKey}`);
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
 * @param notify Whether to broadcast cache update event (default: true).
 */
export async function saveCachedFarmers(farmers: CachedFarmer[], notify = true, ownerKey = currentOfflineOwnerKey()): Promise<void> {
  if (!ownerKey || !farmers || farmers.length === 0) return;

  if (typeof localStorage !== "undefined") {
    try {
      localStorage.setItem(`${LOCAL_STORAGE_FARMERS_KEY}:${ownerKey}`, JSON.stringify(farmers));
    } catch {
      // ignore
    }
  }

  try {
    await withStore(STORES.OFFLINE_CACHE, "readwrite", (store) =>
      store.put({ key: `farmers:${ownerKey}`, value: farmers, updatedAt: new Date().toISOString() })
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
  const ownerKey = currentOfflineOwnerKey();
  if (!ownerKey) return null;
  try {
    const record = await withStore<{ key: string; value: CachedReferenceData }>(
      STORES.OFFLINE_CACHE,
      "readonly",
      (store) => store.get(`reference_data:${ownerKey}`)
    );
    if (ownerKey !== currentOfflineOwnerKey()) return null;
    if (record?.value) {
      return record.value;
    }
  } catch {
    // fallback
  }

  if (ownerKey !== currentOfflineOwnerKey()) return null;
  if (typeof localStorage !== "undefined") {
    try {
      const stored = localStorage.getItem(`${LOCAL_STORAGE_REF_KEY}:${ownerKey}`);
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
 */
export async function saveCachedRefData(data: CachedReferenceData, notify = true, ownerKey = currentOfflineOwnerKey()): Promise<void> {
  if (!ownerKey || !data) return;

  if (typeof localStorage !== "undefined") {
    try {
      localStorage.setItem(`${LOCAL_STORAGE_REF_KEY}:${ownerKey}`, JSON.stringify(data));
    } catch {
      // ignore
    }
  }

  try {
    await withStore(STORES.OFFLINE_CACHE, "readwrite", (store) =>
      store.put({ key: `reference_data:${ownerKey}`, value: data, updatedAt: new Date().toISOString() })
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
 * Fetches fresh farmer list, reference options, plot seasons, and plots, storing them locally.
 */
export async function syncOfflineCache(): Promise<{ farmersCount: number; success: boolean }> {
  const ownerKey = currentOfflineOwnerKey();
  if (!ownerKey) return { farmersCount: 0, success: false };
  if (typeof navigator !== "undefined" && !navigator.onLine) {
    const current = await getCachedFarmers();
    return { farmersCount: current.length, success: false };
  }

  try {
    logger.info("Synchronizing offline reference data and farmer catalog...");
    const fetchAllPages = async <T,>(
      load: (q: { page: number; pageSize: number }) => Promise<unknown>,
    ): Promise<T[]> => {
      const all: T[] = [];
      for (let page = 1; ; page++) {
        const res = await load({ page, pageSize: 100 });
        if (Array.isArray(res)) {
          all.push(...(res as T[]));
          return all;
        }
        const paged = res as { items?: T[]; hasMore?: boolean } | null | undefined;
        const pageRows = Array.isArray(paged?.items) ? paged.items : [];
        all.push(...pageRows);
        if (!paged?.hasMore || pageRows.length === 0) return all;
      }
    };

    const [farmers, refRes, plotSeasonItems, plotItems] = await Promise.all([
      fetchAllPages<CachedFarmer>((q) => procurementEndpoints.getFarmers(q)),
      procurementEndpoints.getReferenceData(),
      fetchAllPages<CachedPlotSeason>((q) => procurementEndpoints.getPlotSeasons(q)).catch(() => [] as CachedPlotSeason[]),
      fetchAllPages<CachedPlot>((q) => procurementEndpoints.getPlots(q)).catch(() => [] as CachedPlot[]),
    ]);
    if (currentOfflineOwnerKey() !== ownerKey) return { farmersCount: 0, success: false };

    await saveCachedFarmers(farmers, false, ownerKey);
    const farmersCount = farmers.length;

    if (refRes) {
      const compositeRefData: CachedReferenceData = {
        ...(refRes as ProcurementReferenceResponse),
        plotSeasons: plotSeasonItems,
        plots: plotItems,
      };

      await saveCachedRefData(compositeRefData, false, ownerKey);
    }

    notifyCacheUpdated();
    logger.info(`Offline cache synchronized: ${farmersCount} farmers cached.`);
    return { farmersCount, success: true };
  } catch (err) {
    logger.warn("Unable to synchronize offline cache from network:", err);
    return { farmersCount: 0, success: false };
  }
}
