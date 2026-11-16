import { useState } from "react";
import { createRoot } from "react-dom/client";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { MemoryRouter } from "react-router-dom";
import { useAuthStore } from "@/app/store/authStore";
import { useUiStore } from "@/app/store/uiStore";
import { RoleHomePage } from "@/features/dashboard/pages/RoleHomePage";
import { ROLE_DEFINITIONS, type UserRole } from "@/shared/types/roles";
import "@/index.css";
import "@/app/i18n";
import {
  dashboardFixtures,
  dashboardPaths,
  dashboardPermissions,
} from "./dashboardData";

// Developer-only entry point. It never contacts the backend or stores credentials.
window.fetch = async (input, init) => {
  if ((init?.method ?? "GET") !== "GET")
    return Response.json({ title: "Preview is read-only" }, { status: 405 });
  const url = new URL(
    typeof input === "string"
      ? input
      : input instanceof URL
        ? input.href
        : input.url,
    location.origin,
  );
  if (url.pathname === "/api/ledger/lookups")
    return Response.json({
      facilities: [
        { id: "facility-1", name: "Nhà máy Tiền Giang" },
        { id: "facility-2", name: "Trạm An Giang" },
      ],
    });
  const source = dashboardPaths[url.pathname];
  return source
    ? Response.json(dashboardFixtures[source])
    : Response.json(
        { title: "Preview endpoint not provided" },
        { status: 404 },
      );
};
function selectRole(role: UserRole) {
  useAuthStore.setState({
    user: {
      id: `preview-${role}`,
      email: "preview@example.test",
      displayName: "Nguyễn Minh Anh",
      role,
      organizationName: role.startsWith("MILL")
        ? "Nhà máy Tiền Giang"
        : "Doanh nghiệp An Hòa",
      organizationId: "org-1",
      isActive: true,
      permissions: dashboardPermissions[role],
    },
    accessToken: "mock-preview-access",
    refreshToken: null,
    isAuthenticated: true,
  });
  useUiStore.setState({
    isBackendConnected: true,
    hasInitialChecked: true,
    pendingOfflineCount: 3,
  });
}
selectRole("MILL_MANAGER");
const queryClient = new QueryClient({
  defaultOptions: { queries: { retry: false } },
});
export function Preview() {
  const [role, setRole] = useState<UserRole>("MILL_MANAGER");
  const [dark, setDark] = useState(
    document.documentElement.classList.contains("dark"),
  );
  return (
    <div className="app-workspace min-h-screen bg-surface-canvas p-4 text-ink-primary sm:p-8">
      <div className="mx-auto mb-6 flex max-w-screen-2xl flex-wrap items-center gap-3 rounded-xl border border-accent-warning/30 bg-surface-base p-4 text-xs">
        <strong className="text-accent-warning">
          UI PREVIEW · DỮ LIỆU MÔ PHỎNG
        </strong>
        <label htmlFor="preview-role">Vai trò</label>
        <select
          id="preview-role"
          value={role}
          onChange={(event) => {
            const next = event.target.value as UserRole;
            setRole(next);
            selectRole(next);
          }}
          className="min-h-11 rounded-full border border-ink-tertiary/20 bg-surface-raised px-3"
        >
          {Object.entries(ROLE_DEFINITIONS).map(([key, meta]) => (
            <option key={key} value={key}>
              {meta.labelVi}
            </option>
          ))}
        </select>
        <button
          className="min-h-11 rounded-full border border-ink-tertiary/20 px-4"
          onClick={() => {
            document.documentElement.classList.toggle("dark", !dark);
            setDark(!dark);
          }}
        >
          {dark ? "Chế độ sáng" : "Chế độ tối"}
        </button>
      </div>
      <RoleHomePage />
    </div>
  );
}
createRoot(document.getElementById("root")!).render(
  <QueryClientProvider client={queryClient}>
    <MemoryRouter>
      <Preview />
    </MemoryRouter>
  </QueryClientProvider>,
);
