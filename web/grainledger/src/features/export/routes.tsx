import { lazyScreen, screenRoute } from "@/app/router/screenRoute";
import { exportPaths } from "./paths";

const orders = lazyScreen(() =>
  import("./pages/ExportWorkspacePage").then((m) => ({
    default: m.ExportWorkspacePage,
  })),
);
const containers = lazyScreen(() =>
  import("./pages/ExportWorkspacePage").then((m) => ({
    default: () => <m.ExportWorkspacePage view="containers" />,
  })),
);
const plans = lazyScreen(() =>
  import("./pages/ExportWorkspacePage").then((m) => ({
    default: () => <m.ExportWorkspacePage view="plans" />,
  })),
);
const dossiers = lazyScreen(() =>
  import("./pages/ExportWorkspacePage").then((m) => ({
    default: () => <m.ExportWorkspacePage view="dossiers" />,
  })),
);
const request = lazyScreen(() =>
  import("./pages/BlendPlanRequestPage").then((m) => ({
    default: m.BlendPlanRequestPage,
  })),
);
const review = lazyScreen(() =>
  import("./pages/BlendPlanReviewPage").then(m => ({ default: m.BlendPlanReviewPage })),
);
const planStep = lazyScreen(() =>
  import("./pages/ContainerWorkflowPage").then((m) => ({
    default: m.ContainerPlanPage,
  })),
);
const loading = lazyScreen(() =>
  import("./pages/ContainerWorkflowPage").then((m) => ({
    default: m.ContainerLoadingPage,
  })),
);
const closure = lazyScreen(() =>
  import("./pages/ContainerWorkflowPage").then((m) => ({
    default: m.ContainerClosurePage,
  })),
);
const dossier = lazyScreen(() =>
  import("./pages/ContainerWorkflowPage").then((m) => ({
    default: m.ContainerDossierPage,
  })),
);
const preparation = lazyScreen(() =>
  import("./pages/ContainerPreparationPage").then(m => ({ default: m.ContainerPreparationPage })),
);

const readers = {
  roles: [
    "CUSTOMER_EXPORT_OFFICER",
    "CUSTOMER_MANAGER",
    "MILL_ADMIN",
  ] as ("CUSTOMER_EXPORT_OFFICER" | "CUSTOMER_MANAGER" | "MILL_ADMIN")[],
  permission: "export-orders.read",
};

export const exportRoutes = [
  screenRoute(exportPaths.orders, orders, readers),
  screenRoute(exportPaths.requestPlan, request, readers),
  screenRoute(exportPaths.plans, plans, readers),
  screenRoute(exportPaths.pending, plans, readers),
  screenRoute(exportPaths.review, review, readers),
  screenRoute(exportPaths.containers, containers, readers),
  screenRoute(exportPaths.preparation, preparation, { roles: ["CUSTOMER_EXPORT_OFFICER", "CUSTOMER_MANAGER", "MILL_OPERATOR", "MILL_MANAGER"] }),
  screenRoute(exportPaths.planStep, planStep, readers),
  screenRoute(exportPaths.loading, loading, readers),
  screenRoute(exportPaths.closure, closure, readers),
  screenRoute(exportPaths.dossiers, dossiers, readers),
  screenRoute(exportPaths.dossier, dossier, readers),
];
