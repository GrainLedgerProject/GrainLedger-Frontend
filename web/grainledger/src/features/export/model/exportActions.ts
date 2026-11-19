import { createContext, useContext } from "react";
import { matchPath } from "react-router-dom";
import { exportPaths } from "../paths";

export type ExportAction =
  | { kind: "create-order" }
  | { kind: "order"; orderId: string }
  | { kind: "containers"; orderId: string }
  | { kind: "plan"; orderId: string; containerId: string; planId?: string }
  | { kind: "review"; planId: string }
  | { kind: "loading" | "closure" | "dossier"; containerId: string };

export const ExportActionContext = createContext<
  ((action: ExportAction) => void) | null
>(null);
export const useExportAction = () => useContext(ExportActionContext);

export function exportActionFromPath(path: string): ExportAction | null {
  const url = new URL(path, "https://grainledger.invalid");
  for (const kind of ["loading", "closure", "dossier"] as const) {
    const match = matchPath(exportPaths[kind], url.pathname);
    if (match?.params.id)
      return { kind, containerId: decodeURIComponent(match.params.id) };
  }
  const plan = matchPath(exportPaths.requestPlan, url.pathname);
  if (plan?.params.orderId && plan.params.containerId)
    return {
      kind: "plan",
      orderId: decodeURIComponent(plan.params.orderId),
      containerId: decodeURIComponent(plan.params.containerId),
      planId: url.searchParams.get("plan") ?? undefined,
    };
  const review = matchPath(exportPaths.review, url.pathname);
  if (review?.params.planId)
    return { kind: "review", planId: decodeURIComponent(review.params.planId) };
  const orderId = url.searchParams.get("order");
  if (orderId && url.pathname === exportPaths.orders)
    return { kind: "order", orderId };
  if (orderId && url.pathname === exportPaths.containers)
    return { kind: "containers", orderId };
  return null;
}
