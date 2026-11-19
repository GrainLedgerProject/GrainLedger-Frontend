import { lazyScreen, screenRoute } from "@/app/router/screenRoute";
import { millPaths, requestCorrectionPermission } from "./paths";
import { PlaceholderPage } from "@/app/router/PlaceholderPage";

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
  screenRoute(millPaths.reconciliations, correctionManagementPage, { roles: ["MILL_MANAGER", "MILL_ADMIN"] }),
  screenRoute(millPaths.reconciliation, correctionManagementPage, { roles: ["MILL_MANAGER", "MILL_ADMIN"] }),
  screenRoute(millPaths.executePlan, <PlaceholderPage
    titleVi="Thực thi Phương án Phối trộn đã Duyệt (Approved Plan Execution)"
    titleEn="Approved Plan Execution"
    roles={["MILL_OPERATOR"]}
    descriptionVi="Nhân viên vận hành lấy đúng số lượng gạo từ các silo đã được Customer Manager phê duyệt để thực hiện mẻ phối trộn xuất khẩu."
  />, { roles: ["MILL_OPERATOR", "MILL_ADMIN"], kind: "placeholder" }),
  screenRoute(millPaths.stock, stockOverviewPage),
  screenRoute(millPaths.lot, stockOverviewPage),
];
