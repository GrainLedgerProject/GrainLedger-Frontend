import { useState } from "react";
import { keepPreviousData, useQuery, useQueryClient } from "@tanstack/react-query";
import { useSearchParams } from "react-router-dom";
import { catalogsEndpoints } from "@/api/catalogs";
import { exportEndpoints, type ExportOrderQuery } from "@/api/exports";
import { collectPages } from "@/api/query";
import type { ExportView } from "../model/exportPresentation";

export interface ExportOrderFilterState {
  q: string;
  marketId: string;
  commodityId: string;
  from: string;
  to: string;
  sortBy: "createdAt" | "code" | "shippingFrom";
  sortDirection: "asc" | "desc";
  page: number;
}

const DEFAULT_ORDER_FILTERS: ExportOrderFilterState = {
  q: "",
  marketId: "",
  commodityId: "",
  from: "",
  to: "",
  sortBy: "shippingFrom",
  sortDirection: "asc",
  page: 1,
};

export function useExportWorkspaceData(
  view: ExportView,
  selectedOrderId?: string,
) {
  const [params, setParams] = useSearchParams();
  const cache = useQueryClient();
  const [orderFilters, setOrderFilters] = useState<ExportOrderFilterState>(DEFAULT_ORDER_FILTERS);
  const queryArgs: ExportOrderQuery = {
    page: orderFilters.page,
    pageSize: 20,
    ...(orderFilters.q.trim() ? { q: orderFilters.q.trim() } : {}),
    ...(orderFilters.marketId ? { marketId: orderFilters.marketId } : {}),
    ...(orderFilters.commodityId ? { commodityId: orderFilters.commodityId } : {}),
    ...(orderFilters.from ? { from: orderFilters.from } : {}),
    ...(orderFilters.to ? { to: orderFilters.to } : {}),
    sortBy: orderFilters.sortBy,
    sortDirection: orderFilters.sortDirection,
  };
  const ordersPage = useQuery({
    queryKey: ["export-workspace-orders", queryArgs],
    queryFn: () => exportEndpoints.getOrders(queryArgs),
    placeholderData: keepPreviousData,
  });
  const orders = {
    ...ordersPage,
    data: ordersPage.data?.items,
    totalCount: ordersPage.data?.totalCount ?? ordersPage.data?.items?.length ?? 0,
    hasMore: Boolean(ordersPage.data?.hasMore),
  };
  const marketsQuery = useQuery({
    queryKey: ["export-workspace-markets"],
    queryFn: () =>
      typeof catalogsEndpoints.getMarkets === "function"
        ? collectPages((q) => catalogsEndpoints.getMarkets({ ...q, pageSize: 50 }))
        : Promise.resolve([]),
    enabled: view === "orders",
    retry: false,
    staleTime: 60_000,
  });
  const commoditiesQuery = useQuery({
    queryKey: ["export-workspace-commodities"],
    queryFn: () =>
      typeof catalogsEndpoints.getCommodities === "function"
        ? collectPages((q) => catalogsEndpoints.getCommodities({ ...q, pageSize: 50 }))
        : Promise.resolve([]),
    enabled: view === "orders",
    retry: false,
    staleTime: 60_000,
  });
  function updateOrderFilters(patch: Partial<ExportOrderFilterState>) {
    setOrderFilters((prev) => ({
      ...prev,
      ...patch,
      page: patch.page !== undefined ? patch.page : 1,
    }));
  }
  const orderId =
    selectedOrderId ?? params.get("order") ?? orders.data?.[0]?.id ?? "";
  const order = orders.data?.find((o) => o.id === orderId);
  const detail = useQuery({
    queryKey: ["export-order-detail", orderId],
    queryFn: () => exportEndpoints.getOrderResource(orderId),
    enabled:
      Boolean(orderId) && view === "orders" && selectedOrderId !== undefined,
  });
  const containers = useQuery({
    queryKey: ["export-container-list", orderId],
    queryFn: () =>
      collectPages((q) => exportEndpoints.getContainers(orderId, q)),
    enabled:
      Boolean(orderId) && (view !== "orders" || selectedOrderId !== undefined),
  });
  function selectOrder(id: string) {
    const next = new URLSearchParams(params);
    next.set("order", id);
    next.delete("container");
    next.delete("plan");
    setParams(next);
  }
  async function refresh() {
    await Promise.all([
      cache.invalidateQueries({ queryKey: ["export-workspace-orders"] }),
      cache.invalidateQueries({ queryKey: ["export-order-detail", orderId] }),
      cache.invalidateQueries({ queryKey: ["export-container-list", orderId] }),
      cache.invalidateQueries({ queryKey: ["container-plans"] }),
      cache.invalidateQueries({ queryKey: ["container-dossier"] }),
      cache.invalidateQueries({ queryKey: ["container-workflow"] }),
    ]);
  }
  return {
    orders,
    orderFilters,
    updateOrderFilters,
    markets: marketsQuery.data ?? [],
    commodities: commoditiesQuery.data ?? [],
    order,
    orderId,
    detail,
    containers,
    params,
    setParams,
    selectOrder,
    refresh,
  };
}
