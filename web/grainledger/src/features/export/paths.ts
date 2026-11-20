export const exportPaths = {
  orders: "/export/orders",
  requestPlan: "/export/orders/:orderId/containers/:containerId/plan",
  plans: "/export/plans",
  pending: "/export/plans/pending",
  review: "/export/plans/:planId/review",
  containers: "/export/containers",
  planStep: "/export/containers/:id/plan",
  loading: "/export/containers/:id/loading",
  closure: "/export/containers/:id/closure",
  dossiers: "/export/dossiers",
  dossier: "/export/containers/:id/dossier",
} as const;

export function blendPlanRequestPath(orderId: string, containerId: string) {
  return exportPaths.requestPlan.replace(":orderId", encodeURIComponent(orderId)).replace(":containerId", encodeURIComponent(containerId));
}

export function planReviewPath(planId: string) {
  return exportPaths.review.replace(":planId", encodeURIComponent(planId));
}

export function containerPath(pattern: string, id: string) {
  return pattern.replace(":id", encodeURIComponent(id));
}
