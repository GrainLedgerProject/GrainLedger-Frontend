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

/**
 * Seed data for field farmers across typical Mekong Delta agricultural cooperatives
 * Used when the application runs completely offline before any online sync has taken place.
 */
export const SEED_FARMERS: CachedFarmer[] = [
  {
    id: "farmer-tg-001",
    code: "FM-TG-001",
    name: "Nguyễn Văn An",
    contact: "0912 345 678",
    totalPlots: 2,
    totalAreaHa: 3.5,
  },
  {
    id: "farmer-tg-002",
    code: "FM-TG-002",
    name: "Trần Thị Bình",
    contact: "0923 456 789",
    totalPlots: 1,
    totalAreaHa: 2.0,
  },
  {
    id: "farmer-tg-003",
    code: "FM-TG-003",
    name: "Lê Hoàng Nam",
    contact: "0934 567 890",
    totalPlots: 3,
    totalAreaHa: 5.2,
  },
  {
    id: "farmer-tg-004",
    code: "FM-TG-004",
    name: "Phạm Quốc Cường",
    contact: "0945 678 901",
    totalPlots: 2,
    totalAreaHa: 4.1,
  },
  {
    id: "farmer-tg-005",
    code: "FM-TG-005",
    name: "Võ Thị Mai Lan",
    contact: "0956 789 012",
    totalPlots: 1,
    totalAreaHa: 1.8,
  },
];

export const SEED_REF_DATA: CachedReferenceData = {
  collectionSites: [
    {
      id: "site-tg-01",
      name: "Điểm cân Bờ Ruộng - Cánh đồng Cái Bè",
      code: "SITE-CB-01",
    },
    {
      id: "site-tg-02",
      name: "Điểm cân Cầu Kênh 2 - Huyện Cai Lậy",
      code: "SITE-CL-02",
    },
  ],
  receivingLocations: [
    {
      id: "loc-mill-01",
      name: "Trạm Tiếp Nhận Cụm Kho Sấy Tiền Giang",
      code: "LOC-TG-MAIN",
    },
  ],
  commodities: [
    { id: "comm-st25", name: "Lúa tươi ST25 (Đặc sản)", code: "ST25" },
    { id: "comm-om18", name: "Lúa tươi OM18 (Xuất khẩu)", code: "OM18" },
    { id: "comm-dt8", name: "Lúa tươi Đài Thơm 8", code: "DT8" },
  ],
  plotSeasons: [
    {
      id: "plot-s-01",
      name: "Vụ Đông Xuân 2026 - Lô ST25-01",
      riceVariety: "ST25",
    },
    {
      id: "plot-s-02",
      name: "Vụ Đông Xuân 2026 - Lô OM18-02",
      riceVariety: "OM18",
    },
  ],
};

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

  return SEED_FARMERS;
}

/**
 * Saves farmer list to IndexedDB and LocalStorage for offline use.
 */
export async function saveCachedFarmers(farmers: CachedFarmer[]): Promise<void> {
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
    notifyCacheUpdated();
  } catch (err) {
    logger.warn("Failed to write farmers to IndexedDB offline cache:", err);
  }
}

/**
 * Reads cached reference data: IndexedDB -> LocalStorage -> SEED_REF_DATA
 */
export async function getCachedRefData(): Promise<CachedReferenceData> {
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

  return SEED_REF_DATA;
}

/**
 * Saves reference data to IndexedDB and LocalStorage
 */
export async function saveCachedRefData(data: CachedReferenceData): Promise<void> {
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
    notifyCacheUpdated();
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
        : (farmersRes as any)?.items || [];

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

