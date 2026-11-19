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
  screenRoute(millPaths.receiving, receivingTasksPage, { roles: ["MILL_OPERATOR", "MILL_MANAGER", "MILL_ADMIN"] }),
  screenRoute(millPaths.operation, operationEntryPage, { roles: ["MILL_OPERATOR", "MILL_MANAGER", "MILL_ADMIN"] }),
  screenRoute(millPaths.requestCorrection, correctionRequestPage, { roles: ["MILL_OPERATOR"], permission: requestCorrectionPermission }),
  screenRoute(millPaths.reconciliations, correctionManagementPage, { roles: ["MILL_OPERATOR", "MILL_MANAGER", "MILL_ADMIN"] }),
  screenRoute(millPaths.reconciliation, correctionManagementPage, { roles: ["MILL_OPERATOR", "MILL_MANAGER", "MILL_ADMIN"] }),
  screenRoute(millPaths.executePlan, executionPage, { roles: ["MILL_OPERATOR", "MILL_ADMIN"], kind: "integration-pending" }),
  screenRoute(millPaths.stock, stockOverviewPage),
  screenRoute(millPaths.lot, stockOverviewPage),
];
