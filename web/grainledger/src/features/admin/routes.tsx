import { lazyScreen, screenRoute } from "@/app/router/screenRoute";
import { adminPaths } from "./paths";

const customerOrganizationsPage = lazyScreen(() =>
  import("./pages/CustomerOrganizationsPage").then(module => ({ default: module.CustomerOrganizationsPage })),
);
const userAccessManagementPage = lazyScreen(() =>
  import("./pages/UserAccessManagementPage").then(module => ({ default: module.UserAccessManagementPage })),
);
const facilityConfigPage = lazyScreen(() =>
  import("./pages/FacilityConfigPage").then(module => ({ default: module.FacilityConfigPage })),
);
const balancePolicyPage = lazyScreen(() =>
  import("./pages/BalancePolicyPage").then(module => ({ default: module.BalancePolicyPage })),
);
const receivingThresholdsPage = lazyScreen(() =>
  import("./pages/ReceivingThresholdsPage").then(module => ({ default: module.ReceivingThresholdsPage })),
);

export const adminRoutes = [
  screenRoute(adminPaths.customers, customerOrganizationsPage, { roles: ["MILL_ADMIN"] }),
  screenRoute(adminPaths.access, userAccessManagementPage, { roles: ["MILL_ADMIN"] }),
  screenRoute(adminPaths.facilities, facilityConfigPage, {
    roles: ["MILL_ADMIN", "MILL_MANAGER", "MILL_OPERATOR"],
    anyPermissions: ["platform.configure", "platform.read"],
  }),
  screenRoute(adminPaths.balancePolicy, balancePolicyPage, { roles: ["MILL_ADMIN", "MILL_MANAGER"] }),
  screenRoute(adminPaths.receivingThresholds, receivingThresholdsPage, { roles: ["MILL_ADMIN"] }),
  screenRoute(adminPaths.receivingThresholdHistory, lazyScreen(() => import("./pages/ReceivingThresholdReadPages").then(module => ({ default: module.ReceivingThresholdHistoryPage }))), { roles: ["MILL_ADMIN"], permission: "platform.configure" }),
  screenRoute(adminPaths.companyReceivingThreshold, lazyScreen(() => import("./pages/ReceivingThresholdReadPages").then(module => ({ default: module.OwnReceivingThresholdPage }))), { roles: ["CUSTOMER_MANAGER", "CUSTOMER_EXPORT_OFFICER", "CUSTOMER_PROCUREMENT_OFFICER"] }),
];
