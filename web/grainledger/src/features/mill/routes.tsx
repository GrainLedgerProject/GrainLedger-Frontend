import { lazyScreen, screenRoute } from "@/app/router/screenRoute";
import { millPaths, requestCorrectionPermission } from "./paths";
const executionPage = lazyScreen(() => import("./pages/ApprovedPlanExecutionPage").then(m => ({ default: m.ApprovedPlanExecutionPage })));

const receivingTasksPage = lazyScreen(() =>
  import("./pages/ReceivingTasksPage").then(module => ({ default: module.ReceivingTasksPage })),
);
const operationEntryPage = lazyScreen(() =>
  import("./pages/OperationEntryPage").then(module => ({ default: module.OperationEntryPage })),
);
const correctionRequestPage = lazyScreen(() =>
  import("./pages/CorrectionRequestPage").then(module => ({ default: module.CorrectionRequestPage })),
);
const correctionManagementPage = lazyScreen(() =>
  import("./pages/CorrectionManagementPage").then(module => ({ default: module.CorrectionManagementPage })),
);
const stockOverviewPage = lazyScreen(() =>
  import("./pages/StockOverviewPage").then(module => ({ default: module.StockOverviewPage })),
);

export const millRoutes = [
  screenRoute(millPaths.receiving, receivingTasksPage, {
    roles: ["MILL_OPERATOR", "MILL_MANAGER"],
    anyPermissions: ["lots.receive", "receiving.reconcile"],
  }),
  screenRoute(millPaths.operation, operationEntryPage, {
    roles: ["MILL_OPERATOR", "MILL_MANAGER"],
    anyPermissions: ["conversions.write", "conversions.read"],
  }),
  screenRoute(millPaths.operationDrafts, lazyScreen(() => import("./pages/OperationDraftsPage").then(m => ({ default: m.OperationDraftsPage }))), { roles: ["MILL_OPERATOR"], permission: "conversions.write" }),
  screenRoute(millPaths.varianceReview, lazyScreen(() => import("./pages/VarianceReviewPage").then(module => ({ default: module.VarianceReviewPage }))), {
    roles: ["MILL_OPERATOR", "MILL_MANAGER"],
    anyPermissions: ["conversions.write", "conversions.confirm"],
  }),
  screenRoute(millPaths.stockTransfer, lazyScreen(() => import("./pages/StockTransferPage").then(module => ({ default: module.StockTransferPage }))), {
    roles: ["MILL_OPERATOR", "MILL_MANAGER"],
    anyPermissions: ["conversions.write", "holds.process"],
  }),
  screenRoute(millPaths.requestCorrection, correctionRequestPage, { roles: ["MILL_OPERATOR"], permission: requestCorrectionPermission }),
  screenRoute(millPaths.reconciliations, correctionManagementPage, {
    roles: ["MILL_OPERATOR", "MILL_MANAGER"],
    anyPermissions: ["conversions.write", "corrections.reconcile", "reconciliation.read"],
  }),
  screenRoute(millPaths.reconciliation, correctionManagementPage, {
    roles: ["MILL_OPERATOR", "MILL_MANAGER"],
    anyPermissions: ["conversions.write", "corrections.reconcile", "reconciliation.read"],
  }),
  screenRoute(millPaths.executePlans, executionPage, {
    roles: ["MILL_OPERATOR", "MILL_MANAGER"],
    anyPermissions: ["containers.operate", "holds.process"],
  }),
  screenRoute(millPaths.executePlan, executionPage, {
    roles: ["MILL_OPERATOR", "MILL_MANAGER"],
    anyPermissions: ["containers.operate", "holds.process"],
  }),
  screenRoute(millPaths.stock, stockOverviewPage, {
    roles: [
      "MILL_OPERATOR",
      "MILL_MANAGER",
      "CUSTOMER_MANAGER",
      "CUSTOMER_EXPORT_OFFICER",
      "AUTHORIZED_STOCK_VIEWER",
    ],
    anyPermissions: ["lots.read.all", "lots.read.facility", "lots.read.tenant"],
  }),
  screenRoute(millPaths.lot, stockOverviewPage, {
    roles: [
      "MILL_OPERATOR",
      "MILL_MANAGER",
      "CUSTOMER_MANAGER",
      "CUSTOMER_EXPORT_OFFICER",
      "AUTHORIZED_STOCK_VIEWER",
    ],
    anyPermissions: ["lots.read.all", "lots.read.facility", "lots.read.tenant"],
  }),
];
