export const millPaths = {
  receiving: "/mill/receiving",
  operation: "/mill/operations/new",
  operationDrafts: "/mill/operations/drafts",
  varianceReview: "/mill/operations/variance",
  stockTransfer: "/stock/transfer",
  requestCorrection: "/mill/corrections/new",
  reconciliations: "/mill/reconciliations",
  reconciliation: "/mill/reconciliations/:id",
  executePlans: "/mill/plan-executions",
  executePlan: "/mill/plan-executions/:planId",
  stock: "/stock",
  lot: "/stock/lots/:lotId",
} as const;

export const requestCorrectionPermission = "conversions.write";

export function stockSearchPath(code: string) {
  return millPaths.stock + "?search=" + encodeURIComponent(code);
}

export function reconciliationPath(id: string) {
  return millPaths.reconciliation.replace(":id", encodeURIComponent(id));
}
