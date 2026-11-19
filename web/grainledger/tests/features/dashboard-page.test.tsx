import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
  within,
} from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { MemoryRouter } from "react-router-dom";
import { apiFetch } from "@/api/client";
import { useAuthStore } from "@/app/store/authStore";
import { useUiStore } from "@/app/store/uiStore";
import { RoleHomePage } from "@/features/dashboard/pages/RoleHomePage";
import { dashboardConfig } from "@/features/dashboard/model/dashboardConfig";
import type { UserRole } from "@/shared/types/roles";
import {
  dashboardFixtures,
  dashboardPaths,
  dashboardPermissions,
} from "../fixtures/dashboardData";

vi.mock("@/api/client", () => ({ apiFetch: vi.fn() }));
const roles = Object.keys(dashboardConfig) as UserRole[];
let cache: QueryClient;
beforeEach(() => {
  vi.mocked(apiFetch).mockImplementation(async (path) => {
    const pathname = path.split("?")[0];
    if (pathname === "/api/ledger/lookups")
      return {
        facilities: [
          { id: "facility-1", name: "Nhà máy Tiền Giang" },
          { id: "facility-2", name: "Trạm An Giang" },
        ],
      };
    const source = dashboardPaths[pathname];
    if (!source) throw new Error(`Unexpected API: ${path}`);
    return dashboardFixtures[source];
  });
  useUiStore.setState({
    isBackendConnected: true,
    hasInitialChecked: true,
    pendingOfflineCount: 3,
  });
  cache = new QueryClient({
    defaultOptions: { queries: { retry: false, gcTime: Infinity } },
  });
});
afterEach(() => {
  cleanup();
  cache.clear();
  useAuthStore.setState({ user: null });
});
function mount(role: UserRole, permissions = dashboardPermissions[role]) {
  useAuthStore.setState({
    user: {
      id: `user-${role}`,
      email: "preview@example.test",
      displayName: "Nguyễn An",
      role,
      organizationId: "org-1",
      organizationName: "Doanh nghiệp An Hòa",
      isActive: true,
      permissions,
    },
  });
  return render(
    <QueryClientProvider client={cache}>
      <MemoryRouter>
        <RoleHomePage />
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

describe("Role dashboards", () => {
  it.each(roles)(
    "renders useful metrics, a chart and shortcuts for %s",
    async (role) => {
      mount(role);
      expect(
        screen.getByRole("heading", {
          level: 1,
          name: dashboardConfig[role].title[0],
        }),
      ).toBeTruthy();
      await screen.findByRole("img");
      expect(
        within(
          screen.getByRole("region", { name: "Chỉ số tổng quan" }),
        ).getAllByRole("article"),
      ).toHaveLength(4);
      expect(
        screen.getByRole("heading", { name: "Cần bạn chú ý" }),
      ).toBeTruthy();
      expect(
        within(
          screen.getByRole("complementary", { name: "Truy cập nhanh" }),
        ).getAllByRole("link").length,
      ).toBeGreaterThan(0);
      await waitFor(() =>
        expect(
          (screen.getByRole("button", { name: "Làm mới" }) as HTMLButtonElement)
            .disabled,
        ).toBe(false),
      );
    },
  );

  it("does not request admin or customer sources for a qualified stock viewer", async () => {
    mount("AUTHORIZED_STOCK_VIEWER");
    await screen.findByRole("table");
    expect(
      vi
        .mocked(apiFetch)
        .mock.calls.every(([path]) => path.startsWith("/api/ledger/lots?")),
    ).toBe(true);
    expect(
      screen.queryByRole("link", { name: /Quản lý tài khoản/ }),
    ).toBeNull();
  });

  it("refetches facility-scoped data and recomputes stock from matching positions", async () => {
    mount("MILL_MANAGER");
    await screen.findByRole("img");
    fireEvent.change(screen.getByLabelText("Cơ sở vận hành"), {
      target: { value: "facility-2" },
    });
    await waitFor(() =>
      expect(
        vi
          .mocked(apiFetch)
          .mock.calls.some(
            ([path]) =>
              path.includes("/receiving-tasks?") &&
              path.includes("facilityId=facility-2"),
          ),
      ).toBe(true),
    );
    const card = screen.getByText("Tồn khả dụng đã tải").closest("article")!;
    await within(card).findByText("5.000,200");
  });

  it("shows missing permission without making the protected request", async () => {
    mount("MILL_ADMIN", []);
    expect(
      screen.getAllByText("Chưa có quyền xem dữ liệu này").length,
    ).toBeGreaterThan(0);
    expect(apiFetch).not.toHaveBeenCalled();
    expect(
      screen.queryByRole("link", { name: /Quản lý tài khoản/ }),
    ).toBeNull();
  });

  it("preserves independent successful sources when one endpoint fails", async () => {
    vi.mocked(apiFetch).mockImplementation(async (path) => {
      if (path === "/api/admin/users")
        throw new Error("Account source unavailable");
      return dashboardFixtures[dashboardPaths[path.split("?")[0]]];
    });
    mount("MILL_ADMIN");
    await screen.findByText("1 nguồn dữ liệu chưa cập nhật được");
    const organizations = screen
      .getByText("Doanh nghiệp khách hàng")
      .closest("article")!;
    expect(within(organizations).getByText("2")).toBeTruthy();
    const accounts = screen
      .getByText("Tài khoản đang hoạt động")
      .closest("article")!;
    expect(within(accounts).getByText("—")).toBeTruthy();
    expect(within(accounts).queryByText("0")).toBeNull();
  });
});
