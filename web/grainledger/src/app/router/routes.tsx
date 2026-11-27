import {
  createBrowserRouter,
  Navigate,
  type RouteObject,
} from "react-router-dom";
import { AppLayout } from "@/app/layout/AppLayout";
import { ProtectedRoute } from "./ProtectedRoute";
import { adminPaths } from "@/features/admin/paths";
import {
  LegacyAdminRedirect,
  LegacyFarmerRedirect,
  LegacyLabReportRedirect,
  LegacyLotRedirect,
  LegacyPlotRedirect,
  LegacyPlotSeasonRedirect,
  LegacyProcurementRedirect,
  LegacyRedirect,
  LegacySampleRedirect,
  LegacySourceLotRedirect,
  LegacySprayRedirect,
} from "./LegacyRedirect";
import { dashboardPaths } from "@/features/dashboard/paths";
import { landingRoutes } from "@/features/landing/routes";
import { publicAuthRoutes, authRoutes } from "@/features/auth/routes";
import { dashboardRoutes } from "@/features/dashboard/routes";
import { auditRoutes } from "@/features/audit/routes";
import { adminRoutes } from "@/features/admin/routes";
import { catalogsPaths } from "@/features/catalogs/paths";
import { catalogsRoutes } from "@/features/catalogs/routes";
import { fieldPaths } from "@/features/field/paths";
import { fieldRoutes } from "@/features/field/routes";
import { millPaths } from "@/features/mill/paths";
import { millRoutes } from "@/features/mill/routes";
import { compliancePaths } from "@/features/compliance/paths";
import { complianceRoutes } from "@/features/compliance/routes";
import { exportPaths } from "@/features/export/paths";
import { exportRoutes } from "@/features/export/routes";
import { riskPaths } from "@/features/risk/paths";
import { riskRoutes } from "@/features/risk/routes";

const legacyRedirectRoutes: RouteObject[] = [
  {
    path: "/lab-reports",
    element: <LegacyRedirect to={compliancePaths.results} />,
  },
  { path: "/lab-reports/:id", element: <LegacyLabReportRedirect /> },
  {
    path: "/samples",
    element: <LegacyRedirect to={compliancePaths.samples} />,
  },
  {
    path: "/residue-policies",
    element: <LegacyRedirect to={compliancePaths.profiles} />,
  },
  {
    path: "/byproduct-mixing",
    element: <LegacyRedirect to={compliancePaths.byproductMixing} />,
  },
  {
    path: "/export-assessment",
    element: <LegacyRedirect to={exportPaths.orders} />,
  },
  {
    path: "/export-orders",
    element: <LegacyRedirect to={exportPaths.orders} />,
  },
  {
    path: "/containers",
    element: <LegacyRedirect to={exportPaths.preparation} />,
  },
  { path: "/mrl", element: <LegacyRedirect to={catalogsPaths.mrlVersions} /> },
  {
    path: "/admin",
    element: <LegacyAdminRedirect />,
  },
  {
    path: "/admin/people",
    element: <LegacyRedirect to={adminPaths.access} />,
  },
  {
    path: "/admin/ledger",
    element: <LegacyRedirect to={adminPaths.facilities} />,
  },
  {
    path: "/admin/mrl",
    element: <LegacyRedirect to={catalogsPaths.mrlVersions} />,
  },
  {
    path: "/admin/mrl-lookup",
    element: <LegacyRedirect to={catalogsPaths.mrlVersions} />,
  },
  {
    path: "/admin/catalogs",
    element: <LegacyRedirect to={catalogsPaths.masterData} />,
  },
  {
    path: "/admin/crop-seasons",
    element: <LegacyRedirect to={fieldPaths.seasons} />,
  },
  {
    path: "/capture/farmers",
    element: <LegacyRedirect to={fieldPaths.farmers} />,
  },
  {
    path: "/capture/farmers/:id",
    element: <LegacyFarmerRedirect />,
  },
  { path: "/capture/plots", element: <LegacyRedirect to={fieldPaths.plots} /> },
  { path: "/capture/plots/:id", element: <LegacyPlotRedirect /> },
  {
    path: "/capture/crop-seasons",
    element: <LegacyRedirect to={fieldPaths.seasons} />,
  },
  {
    path: "/capture/plot-seasons/:id",
    element: <LegacyPlotSeasonRedirect />,
  },
  {
    path: "/capture/procurements",
    element: <LegacyRedirect to={fieldPaths.receipts} />,
  },
  {
    path: "/capture/procurements/new",
    element: <LegacyRedirect to={fieldPaths.receipts} />,
  },
  {
    path: "/capture/procurements/:id",
    element: <LegacyProcurementRedirect />,
  },
  {
    path: "/capture/source-lots/:id",
    element: <LegacySourceLotRedirect />,
  },
  {
    path: "/capture/samples",
    element: <LegacyRedirect to={fieldPaths.samples} />,
  },
  {
    path: "/capture/samples/:id",
    element: <LegacySampleRedirect />,
  },
  {
    path: "/capture/spray-declarations",
    element: <LegacyRedirect to={fieldPaths.declarations} />,
  },
  {
    path: "/capture/spray-declarations/:id",
    element: <LegacySprayRedirect />,
  },
  { path: "/ledger", element: <LegacyRedirect to={millPaths.stock} /> },
  { path: "/ledger/lots", element: <LegacyRedirect to={millPaths.stock} /> },
  { path: "/ledger/lots/:id", element: <LegacyLotRedirect /> },
  {
    path: "/ledger/operations",
    element: <LegacyRedirect to={millPaths.operationDrafts} />,
  },
  { path: "/ledger/holds", element: <LegacyRedirect to={riskPaths.holds} /> },
];

export const appRoutes: RouteObject[] = [
  ...landingRoutes,
  ...publicAuthRoutes,
  {
    element: (
      <ProtectedRoute>
        <AppLayout />
      </ProtectedRoute>
    ),
    children: [
      ...authRoutes,
      ...dashboardRoutes,
      ...auditRoutes,
      ...adminRoutes,
      ...catalogsRoutes,
      ...fieldRoutes,
      ...millRoutes,
      ...complianceRoutes,
      ...exportRoutes,
      ...riskRoutes,
      ...legacyRedirectRoutes,
    ],
  },
  {
    path: "*",
    element: <Navigate to={dashboardPaths.home} replace />,
    handle: { kind: "fallback" },
  },
];

export const router = createBrowserRouter(appRoutes, {
  basename:
    import.meta.env.BASE_URL === "./" ? "/" : import.meta.env.BASE_URL || "/",
});
