// Schemas/paths copied from web dashboardApi; mobile transport and permission-scoped orchestration below.
import { z } from "zod";
import type { ApiClient } from "../../../services/api/http-client";
import { ApiError, normalizeApiError } from "../../../services/api/errors";
import type { AuthUser } from "../../auth/contracts";
import type { DashboardData } from "../model/dashboardData";
import { dashboardConfig, canReadSource, type Source } from "../model/dashboardConfig";

export type DashboardRow = Record<string, unknown>;
export interface DashboardCollection {
  items: DashboardRow[];
  totalCount: number | null;
  hasMore: boolean;
}
const decimal = z.string().regex(/^-?\d+(\.\d+)?$/);
const identity = { id: z.string() };
const schemas: Record<Source, z.ZodType<DashboardRow>> = {
  organizations: z
    .object({ ...identity, name: z.string(), kind: z.string() })
    .passthrough(),
  users: z
    .object({
      ...identity,
      email: z.string(),
      isActive: z.boolean(),
      role: z.string().nullable(),
    })
    .passthrough(),
  setup: z
    .object({ ...identity, name: z.string(), setupKind: z.string() })
    .passthrough(),
  stock: z
    .object({
      ...identity,
      code: z.string(),
      stage: z.string(),
      positions: z.array(
        z
          .object({
            facilityId: z.string(),
            quantityKg: decimal,
            availableKg: decimal,
          })
          .passthrough(),
      ),
      restrictions: z.array(z.string()),
    })
    .passthrough(),
  receiving: z
    .object({
      ...identity,
      code: z.string(),
      status: z.string(),
      expectedTotalKg: decimal,
    })
    .passthrough(),
  operations: z
    .object({ ...identity, kind: z.string(), status: z.string() })
    .passthrough(),
  corrections: z
    .object({ ...identity, status: z.string(), reason: z.string() })
    .passthrough(),
  holds: z
    .object({ ...identity, status: z.string(), lotCode: z.string() })
    .passthrough(),
  farmers: z
    .object({ ...identity, name: z.string(), code: z.string() })
    .passthrough(),
  plots: z.object({ ...identity, code: z.string() }).passthrough(),
  procurements: z
    .object({
      ...identity,
      code: z.string(),
      totalNetMassKg: decimal,
      receivedAt: z.string(),
    })
    .passthrough(),
  labs: z
    .object({
      ...identity,
      reportNumber: z.string(),
      status: z.string(),
      confirmedAt: z.string().nullable(),
      assessmentStatus: z.string(),
    })
    .passthrough(),
  samples: z
    .object({ ...identity, code: z.string(), handoverCount: z.number() })
    .passthrough(),
  orders: z
    .object({
      ...identity,
      code: z.string(),
      requiredMassKg: decimal,
      shippingFrom: z.string(),
      shippingTo: z.string(),
    })
    .passthrough(),
};
const paths: Record<Source, string> = {
  organizations: "/api/admin/organizations",
  users: "/api/admin/users",
  setup: "/api/ledger/setup",
  stock: "/api/ledger/lots",
  receiving: "/api/ledger/receiving-tasks",
  operations: "/api/ledger/operations",
  corrections: "/api/ledger/corrections",
  holds: "/api/ledger/holds",
  farmers: "/api/farmers",
  plots: "/api/plots",
  procurements: "/api/procurements",
  labs: "/api/lab-reports",
  samples: "/api/samples",
  orders: "/api/export-orders",
};

/** Validate before aggregating: a failed/malformed response must never become a zero KPI. */
export function parseDashboardCollection(
  source: Source,
  value: unknown,
): DashboardCollection {
  const input = Array.isArray(value) ? { items: value } : value;
  const result = z
    .object({
      items: z.array(schemas[source]),
      totalCount: z.number().int().nonnegative().optional(),
      hasMore: z.boolean().optional(),
    })
    .safeParse(input);
  if (!result.success)
    throw new ApiError(
      `Dữ liệu tổng quan không đúng định dạng (${source}). / Invalid dashboard data (${source}).`, 0, "contract",
    );
  return {
    items: result.data.items,
    totalCount:
      result.data.totalCount ??
      (result.data.hasMore === true ? null : result.data.items.length),
    hasMore: result.data.hasMore ?? false,
  };
}

export interface DashboardOverview {
  data: DashboardData;
  errors: Partial<Record<Source, ApiError>>;
  sources: Source[];
  facilities: { id: string; name: string }[];
  facilityId?: string;
  facilityError: ApiError | null;
  updatedAt: number;
}

export const dashboardSources = (user: AuthUser) => dashboardConfig[user.normalizedRole].sources
  .filter((source) => canReadSource(source, user.normalizedRole, user.permissions));
export const dashboardShortcuts = (user: AuthUser) => dashboardConfig[user.normalizedRole].shortcuts
  .filter((shortcut) => !shortcut.permissions || shortcut.permissions.some((permission) => user.permissions.includes(permission)));

export function createDashboardService(api: ApiClient, user: AuthUser) {
  const role = user.normalizedRole;
  const needsFacility = role === 'MILL_MANAGER' || role === 'MILL_OPERATOR';
  const sources = dashboardSources(user);
  const checkActive = () => { if (!user.isActive) throw new ApiError('This account is inactive.', 403, 'inactive'); };

  async function loadDashboardSource(source: Source, facilityId?: string, signal?: AbortSignal): Promise<DashboardCollection> {
    checkActive();
    if (!sources.includes(source)) throw new ApiError('Access to this dashboard source has not been granted.', 403, 'http');
    if ((needsFacility || source === 'receiving') && !facilityId) throw new ApiError('Select an assigned facility to load operational data.', 0, 'configuration');
    const query: Record<string, string | number> = { page: 1, pageSize: 25 };
    if (facilityId && ['stock', 'receiving', 'operations', 'corrections', 'holds'].includes(source)) query.facilityId = facilityId;
    if (source === 'stock') { query.sortBy = 'quantity'; query.sortDirection = 'desc'; }
    if (source === 'operations') { query.sortBy = 'occurredAt'; query.sortDirection = 'desc'; }
    const value = await api.request(paths[source], {
      query: ['organizations', 'users', 'setup'].includes(source) ? undefined : query, signal,
    });
    if (source === 'setup') {
      const setup = z.object({ facilities: z.array(z.record(z.string(), z.unknown())), locations: z.array(z.record(z.string(), z.unknown())),
        equipment: z.array(z.record(z.string(), z.unknown())) }).safeParse(value);
      if (!setup.success) throw new ApiError('Invalid dashboard setup data.', 0, 'contract');
      return parseDashboardCollection(source, [
        ...setup.data.facilities.map((row) => ({ ...row, setupKind: 'facility' })),
        ...setup.data.locations.map((row) => ({ ...row, setupKind: 'location' })),
        ...setup.data.equipment.map((row) => ({ ...row, setupKind: 'equipment' })),
      ]);
    }
    const collection = parseDashboardCollection(source, value);
    if (source === 'stock' && facilityId) collection.items = collection.items.map((row) => ({ ...row,
      positions: (row.positions as DashboardRow[]).filter((position) => position.facilityId === facilityId) }));
    return collection;
  }

  async function loadDashboardFacilities(signal?: AbortSignal) {
    checkActive();
    if (!needsFacility || !user.permissions.includes('platform.read')) throw new ApiError('Facility lookup access has not been granted.', 403, 'http');
    const result = z.object({ facilities: z.array(z.object({ id: z.string(), name: z.string() })) })
      .safeParse(await api.request('/api/ledger/lookups', { signal }));
    if (!result.success) throw new ApiError('Invalid dashboard facility lookup data.', 0, 'contract');
    return result.data.facilities;
  }

  async function loadOverview(selectedFacility?: string, signal?: AbortSignal): Promise<DashboardOverview> {
    checkActive();
    const result: DashboardOverview = { data: {}, errors: {}, sources, facilities: [], facilityError: null, updatedAt: 0 };
    if (signal?.aborted) throw new ApiError('The request was cancelled.', 0, 'cancelled');
    if (needsFacility) {
      try { result.facilities = await loadDashboardFacilities(signal); }
      catch (failure) {
        const error = normalizeApiError(failure);
        if (error.code === 'cancelled') throw error;
        result.facilityError = error; return result;
      }
      result.facilityId = result.facilities.some((facility) => facility.id === selectedFacility)
        ? selectedFacility : result.facilities[0]?.id;
      if (!result.facilityId) return result; // Never issue unscoped mill requests.
    }
    const settled = await Promise.allSettled(sources.map(async (source) => ({
      collection: await loadDashboardSource(source, needsFacility ? result.facilityId : undefined, signal), receivedAt: Date.now(),
    })));
    if (signal?.aborted) throw new ApiError('The request was cancelled.', 0, 'cancelled');
    const timestamps: number[] = [];
    settled.forEach((entry, index) => {
      if (entry.status === 'fulfilled') { result.data[sources[index]] = entry.value.collection; timestamps.push(entry.value.receivedAt); }
      else {
        const error = normalizeApiError(entry.reason);
        if (error.code === 'cancelled') throw error;
        result.errors[sources[index]] = error;
      }
    });
    result.updatedAt = sources.length > 0 && timestamps.length === sources.length ? Math.min(...timestamps) : 0;
    return result;
  }
  return { loadDashboardSource, loadDashboardFacilities, loadOverview };
}

