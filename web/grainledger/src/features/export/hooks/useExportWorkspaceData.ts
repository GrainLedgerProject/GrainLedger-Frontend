import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useSearchParams } from "react-router-dom";
import { exportEndpoints } from "@/api/exports";
import { collectPages } from "@/api/query";
import type { ExportView } from "../model/exportPresentation";

export function useExportWorkspaceData(
  view: ExportView,
  selectedOrderId?: string,
) {
  const [params, setParams] = useSearchParams();
  const cache = useQueryClient();
  const orders = useQuery({
    queryKey: ["export-workspace-orders"],
    queryFn: () => collectPages(exportEndpoints.getOrders),
  });
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
