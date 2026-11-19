import { lazyScreen, screenRoute } from "@/app/router/screenRoute";
import { dashboardPaths } from "./paths";

const roleHomePage = lazyScreen(() =>
  import("./pages/RoleHomePage").then(module => ({ default: module.RoleHomePage })),
);

export const dashboardRoutes = [
  screenRoute(dashboardPaths.home, roleHomePage),
];
