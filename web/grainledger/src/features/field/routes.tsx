import { lazyScreen, screenRoute } from "@/app/router/screenRoute";
import { fieldPaths } from "./paths";

const farmerRegistrationPage = lazyScreen(() =>
  import("./pages/FarmerRegistrationPage").then(module => ({ default: module.FarmerRegistrationPage })),
);
const plotRegistrationPage = lazyScreen(() =>
  import("./pages/PlotRegistrationPage").then(module => ({ default: module.PlotRegistrationPage })),
);
const cropSeasonsPage = lazyScreen(() =>
  import("./pages/CropSeasonsPage").then(module => ({ default: module.CropSeasonsPage })),
);
const pesticideDeclarationPage = lazyScreen(() =>
  import("./pages/PesticideDeclarationPage").then(module => ({ default: module.PesticideDeclarationPage })),
);
const procurementReceiptPage = lazyScreen(() =>
  import("./pages/ProcurementReceiptPage").then(module => ({ default: module.ProcurementReceiptPage })),
);
const fieldSampleRegistrationPage = lazyScreen(() =>
  import("./pages/FieldSampleRegistrationPage").then(module => ({ default: module.FieldSampleRegistrationPage })),
);
const offlineSyncQueuePage = lazyScreen(() =>
  import("./pages/OfflineSyncQueuePage").then(module => ({ default: module.OfflineSyncQueuePage })),
);

export const fieldRoutes = [
  screenRoute(fieldPaths.farmers, farmerRegistrationPage, {
    roles: ["CUSTOMER_PROCUREMENT_OFFICER", "CUSTOMER_MANAGER"],
    anyPermissions: ["farms.read", "farms.write"],
  }),
  screenRoute(fieldPaths.plots, plotRegistrationPage, {
    roles: ["CUSTOMER_PROCUREMENT_OFFICER", "CUSTOMER_MANAGER"],
    anyPermissions: ["farms.read", "farms.write"],
  }),
  screenRoute(fieldPaths.seasons, cropSeasonsPage, {
    roles: ["MILL_ADMIN", "CUSTOMER_PROCUREMENT_OFFICER", "CUSTOMER_MANAGER"],
    anyPermissions: ["platform.configure", "farms.write", "farms.read"],
  }),
  screenRoute(fieldPaths.declarations, pesticideDeclarationPage, { roles: ["CUSTOMER_PROCUREMENT_OFFICER", "CUSTOMER_MANAGER"] }),
  screenRoute(fieldPaths.receipts, procurementReceiptPage, { roles: ["CUSTOMER_PROCUREMENT_OFFICER", "CUSTOMER_MANAGER"] }),
  screenRoute(fieldPaths.receipt, lazyScreen(() => import("./pages/ProcurementDetailPages").then(m => ({ default: m.ProcurementDetailPage }))), { roles: ["CUSTOMER_PROCUREMENT_OFFICER", "CUSTOMER_MANAGER"] }),
  screenRoute(fieldPaths.sourceLot, lazyScreen(() => import("./pages/ProcurementDetailPages").then(m => ({ default: m.SourceLotDetailPage }))), { roles: ["CUSTOMER_PROCUREMENT_OFFICER", "CUSTOMER_MANAGER"] }),
  screenRoute(fieldPaths.samples, fieldSampleRegistrationPage, { roles: ["CUSTOMER_PROCUREMENT_OFFICER", "CUSTOMER_MANAGER"] }),
  screenRoute(fieldPaths.sync, offlineSyncQueuePage, { roles: ["CUSTOMER_PROCUREMENT_OFFICER"], permission: "purchases.write" }),
];
