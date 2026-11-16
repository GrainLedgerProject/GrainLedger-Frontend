import { z } from "zod";
import { apiFetch } from "@/api/client";
import { withApiQuery } from "@/api/query";
import type { Source } from "../model/dashboardConfig";

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
    throw new Error(
      `Dữ liệu tổng quan không đúng định dạng (${source}). / Invalid dashboard data (${source}).`,
    );
  return {
    items: result.data.items,
    totalCount:
      result.data.totalCount ??
      (result.data.hasMore === true ? null : result.data.items.length),
    hasMore: result.data.hasMore ?? false,
  };
}

export async function loadDashboardSource(
  source: Source,
  facilityId: string | undefined,
  signal?: AbortSignal,
): Promise<DashboardCollection> {
  if (source === "receiving" && !facilityId)
    throw new Error("Cần chọn cơ sở tiếp nhận. / Select a receiving facility.");
  const query: Record<string, string | number> = { page: 1, pageSize: 25 };
  if (
    facilityId &&
    ["stock", "receiving", "operations", "corrections", "holds"].includes(
      source,
    )
  )
    query.facilityId = facilityId;
  if (source === "stock") {
    query.sortBy = "quantity";
    query.sortDirection = "desc";
  }
  if (source === "operations") {
    query.sortBy = "occurredAt";
    query.sortDirection = "desc";
  }
  const value = await apiFetch<unknown>(
    withApiQuery(
      paths[source],
      ["organizations", "users", "setup"].includes(source) ? undefined : query,
    ),
    { signal },
  );
  if (source === "setup") {
    const setup = z
      .object({
        facilities: z.array(z.record(z.unknown())),
        locations: z.array(z.record(z.unknown())),
        equipment: z.array(z.record(z.unknown())),
      })
      .parse(value);
    return parseDashboardCollection(source, [
      ...setup.facilities.map((row) => ({ ...row, setupKind: "facility" })),
      ...setup.locations.map((row) => ({ ...row, setupKind: "location" })),
      ...setup.equipment.map((row) => ({ ...row, setupKind: "equipment" })),
    ]);
  }
  const collection = parseDashboardCollection(source, value);
  if (source === "stock" && facilityId) {
    collection.items = collection.items.map((row) => ({
      ...row,
      positions: (row.positions as DashboardRow[]).filter(
        (position) => position.facilityId === facilityId,
      ),
    }));
  }
  return collection;
}

export async function loadDashboardFacilities(signal?: AbortSignal) {
  const value = await apiFetch<unknown>("/api/ledger/lookups", { signal });
  return z
    .object({
      facilities: z.array(z.object({ id: z.string(), name: z.string() })),
    })
    .parse(value).facilities;
}
