import { useState } from "react";
import { useQueries, useQuery, useQueryClient } from "@tanstack/react-query";
import { useAuthStore } from "@/app/store/authStore";
import { isPendingUserAccess } from "@/features/auth/api/sessionUser";
import {
  loadDashboardFacilities,
  loadDashboardSource,
} from "../api/dashboardApi";
import { canReadSource, dashboardConfig, type Source } from "./dashboardConfig";
import type { DashboardData } from "./dashboardData";

export function useDashboard() {
  const user = useAuthStore((state) => state.user);
  const cache = useQueryClient();
  const [selectedFacility, setSelectedFacility] = useState("");
  const pendingAccess = isPendingUserAccess(user);
  const role = user?.role ?? "AUTHORIZED_STOCK_VIEWER";
  const config = dashboardConfig[role];
  const permissions = user?.permissions ?? [];
  const needsFacility =
    !pendingAccess && (role === "MILL_MANAGER" || role === "MILL_OPERATOR");
  const scope = [
    user?.id ?? "",
    user?.organizationId ?? "",
    role,
    pendingAccess ? "pending" : "active",
    [...permissions].sort().join("|"),
  ];
  const key = ["dashboard", ...scope];
  const facilities = useQuery({
    queryKey: [...key, "facilities"],
    queryFn: ({ signal }) => loadDashboardFacilities(signal),
    enabled: Boolean(
      user &&
        !pendingAccess &&
        needsFacility &&
        permissions.includes("platform.read"),
    ),
    staleTime: 30_000,
    retry: false,
    refetchOnWindowFocus: true,
  });
  // A selection from a previous session must never override the new user's scope.
  const facilityId = facilities.data?.some(
    (facility) => facility.id === selectedFacility,
  )
    ? selectedFacility
    : facilities.data?.[0]?.id;
  const sources = pendingAccess
    ? []
    : config.sources.filter((source) =>
        canReadSource(source, role, permissions),
      );
  const queries = useQueries({
    queries: sources.map((source) => ({
      queryKey: [...key, source, needsFacility ? (facilityId ?? "") : "all"],
      queryFn: ({ signal }: { signal: AbortSignal }) =>
        loadDashboardSource(
          source,
          needsFacility ? facilityId : undefined,
          signal,
        ),
      enabled: Boolean(user && !pendingAccess && (!needsFacility || facilityId)),
      staleTime: 30_000,
      retry: false,
      refetchOnWindowFocus: true,
    })),
  });
  const data: DashboardData = {};
  const states: Partial<
    Record<Source, { pending: boolean; error: Error | null; updatedAt: number }>
  > = {};
  queries.forEach((query, index) => {
    const source = sources[index];
    if (query.data) data[source] = query.data;
    states[source] = {
      pending: query.isPending,
      error: query.error,
      updatedAt: query.dataUpdatedAt,
    };
  });
  const fetching =
    queries.some((query) => query.isFetching) ||
    (needsFacility && facilities.isFetching);
  const updatedAt =
    queries.length && queries.every((query) => query.dataUpdatedAt > 0)
      ? Math.min(...queries.map((query) => query.dataUpdatedAt))
      : 0;
  return {
    user,
    role,
    pendingAccess,
    config,
    data,
    states,
    sources,
    needsFacility,
    facilities: facilities.data ?? [],
    facilityError: facilities.error,
    facilityLoading: facilities.isFetching,
    facilityId,
    setSelectedFacility,
    fetching,
    updatedAt,
    refresh: () => cache.invalidateQueries({ queryKey: key }),
  };
}
