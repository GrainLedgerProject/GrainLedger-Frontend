import { lazyScreen, screenRoute } from "@/app/router/screenRoute";
import { catalogsPaths } from "./paths";

const masterDataPage = lazyScreen(() =>
  import("./pages/MasterDataPage").then(module => ({ default: module.MasterDataPage })),
);
const mrlVersionsPage = lazyScreen(() =>
  import("./pages/MrlVersionsPage").then(module => ({ default: module.MrlVersionsPage })),
);

export const catalogsRoutes = [
  screenRoute(catalogsPaths.masterData, masterDataPage, { roles: ["MILL_ADMIN"] }),
  screenRoute(catalogsPaths.mrlVersions, mrlVersionsPage, {
    roles: ["MILL_ADMIN", "CUSTOMER_EXPORT_OFFICER"],
    anyPermissions: ["platform.configure", "mrl.read"],
  }),
];
