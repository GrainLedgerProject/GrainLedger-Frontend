import { lazyScreen, screenRoute } from "@/app/router/screenRoute";
import { auditPaths } from "./paths";

const eventHistoryPage = lazyScreen(() =>
  import("./pages/EventHistoryPage").then(module => ({ default: module.EventHistoryPage })),
);

export const auditRoutes = [
  screenRoute(auditPaths.events, eventHistoryPage),
  screenRoute(auditPaths.event, eventHistoryPage),
];
