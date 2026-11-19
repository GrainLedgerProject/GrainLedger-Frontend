import { lazyScreen, screenRoute } from "@/app/router/screenRoute";
import { landingPaths } from "./paths";

const landingPage = lazyScreen(() =>
  import("./pages/LandingPage").then(module => ({ default: module.LandingPage })),
);

export const landingRoutes = [
  screenRoute(landingPaths.landing, landingPage),
];
