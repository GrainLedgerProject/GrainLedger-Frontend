import { createBrowserRouter, Navigate, type RouteObject } from "react-router-dom";
import { AppLayout } from "@/app/layout/AppLayout";
import { ProtectedRoute } from "./ProtectedRoute";
import { dashboardPaths } from "@/features/dashboard/paths";
import { landingRoutes } from "@/features/landing/routes";
import { publicAuthRoutes, authRoutes } from "@/features/auth/routes";
import { dashboardRoutes } from "@/features/dashboard/routes";
import { auditRoutes } from "@/features/audit/routes";
import { adminRoutes } from "@/features/admin/routes";
import { catalogsRoutes } from "@/features/catalogs/routes";
import { fieldRoutes } from "@/features/field/routes";
import { millRoutes } from "@/features/mill/routes";
import { complianceRoutes } from "@/features/compliance/routes";
import { exportRoutes } from "@/features/export/routes";
import { riskRoutes } from "@/features/risk/routes";

export const appRoutes: RouteObject[] = [
  ...landingRoutes,
  ...publicAuthRoutes,
  {
    element: <ProtectedRoute><AppLayout /></ProtectedRoute>,
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
    ],
  },
  { path: "*", element: <Navigate to={dashboardPaths.home} replace />, handle: { kind: "fallback" } },
];

export const router = createBrowserRouter(appRoutes, {
  basename: import.meta.env.BASE_URL === "./" ? "/" : import.meta.env.BASE_URL || "/",
});
