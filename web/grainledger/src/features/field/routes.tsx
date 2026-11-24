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
  screenRoute(fieldPaths.farmers, farmerRegistrationPage, { roles: ["CUSTOMER_PROCUREMENT_OFFICER", "MILL_ADMIN"] }),
  screenRoute(fieldPaths.plots, plotRegistrationPage, { roles: ["CUSTOMER_PROCUREMENT_OFFICER", "MILL_ADMIN"] }),
  screenRoute(fieldPaths.seasons, cropSeasonsPage, { roles: ["MILL_ADMIN", "CUSTOMER_PROCUREMENT_OFFICER", "CUSTOMER_MANAGER"] }),
  screenRoute(fieldPaths.declarations, pesticideDeclarationPage, { roles: ["CUSTOMER_PROCUREMENT_OFFICER", "MILL_ADMIN"] }),
  screenRoute(fieldPaths.receipts, procurementReceiptPage, { roles: ["CUSTOMER_PROCUREMENT_OFFICER", "MILL_ADMIN"] }),
  screenRoute(fieldPaths.samples, fieldSampleRegistrationPage, { roles: ["CUSTOMER_PROCUREMENT_OFFICER", "MILL_ADMIN"] }),
  screenRoute(fieldPaths.sync, offlineSyncQueuePage, { roles: ["CUSTOMER_PROCUREMENT_OFFICER", "MILL_ADMIN"] }),
];
