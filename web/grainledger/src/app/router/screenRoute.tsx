import { lazy, Suspense, type ComponentType, type ReactElement } from "react";
import type { RouteObject } from "react-router-dom";
import { GrainLoader } from "@/shared/ui/GrainLoader";
import type { UserRole } from "@/shared/types/roles";
import { ProtectedRoute } from "./ProtectedRoute";

export function lazyScreen(load: () => Promise<{ default: ComponentType }>) {
  const Screen = lazy(load);
  return <Screen />;
}

interface ScreenOptions {
  roles?: UserRole[];
  permission?: string;
  kind?: "placeholder" | "integration-pending";
}

export function screenRoute(path: string, screen: ReactElement, { roles, permission, kind }: ScreenOptions = {}): RouteObject {
  const content = <Suspense fallback={<GrainLoader />}>{screen}</Suspense>;
  return {
    path,
    handle: { kind: kind ?? "screen" },
    element: roles || permission
      ? <ProtectedRoute allowedRoles={roles} requiredPermission={permission}>{content}</ProtectedRoute>
      : content,
  };
}
