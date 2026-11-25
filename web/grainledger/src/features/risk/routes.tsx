import { lazyScreen, screenRoute } from "@/app/router/screenRoute";
import { riskPaths } from "./paths";
const traceabilityPage = lazyScreen(() => import("./pages/TraceabilityPage").then(m => ({ default: m.TraceabilityPage })));
const containerTracePage = lazyScreen(() => import("./pages/ContainerTracePage").then(m => ({ default: m.ContainerTracePage })));

const holdManagementPage = lazyScreen(() =>
  import("./pages/HoldManagementPage").then(module => ({ default: module.HoldManagementPage })),
);

export const riskRoutes = [
  screenRoute(riskPaths.traceback, traceabilityPage, {
    roles: ["CUSTOMER_MANAGER", "CUSTOMER_EXPORT_OFFICER"],
    anyPermissions: ["trace.read.tenant", "trace.read.all"],
  }),
  screenRoute(riskPaths.containerTrace, containerTracePage, {
    roles: ["CUSTOMER_MANAGER", "MILL_ADMIN"],
    anyPermissions: ["trace.read.tenant", "trace.read.all"],
  }),
  screenRoute(riskPaths.newHold, holdManagementPage, {
    roles: ["CUSTOMER_MANAGER"],
    permission: "holds.manage",
  }),
  screenRoute(riskPaths.holds, holdManagementPage, {
    roles: ["MILL_MANAGER", "CUSTOMER_MANAGER", "CUSTOMER_EXPORT_OFFICER"],
  }),
];
