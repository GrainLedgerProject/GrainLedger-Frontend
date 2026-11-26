import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { AppSidebar } from "@/app/layout/AppSidebar";
import { RoleHomePage } from "@/features/dashboard/pages/RoleHomePage";
import { Suspense, type ReactElement } from "react";
import { matchRoutes, MemoryRouter, useRoutes } from "react-router-dom";
import i18n from "@/app/i18n";
import { appRoutes } from "@/app/router/routes";
import { getSidebarItems } from "@/app/navigation/sidebarItems";
import { useAuthStore } from "@/app/store/authStore";
import { catalogsPaths } from "@/features/catalogs/paths";
import { compliancePaths } from "@/features/compliance/paths";
import { dashboardConfig } from "@/features/dashboard/model/dashboardConfig";
import { exportPaths } from "@/features/export/paths";
import { fieldPaths } from "@/features/field/paths";
import { millRoutes } from "@/features/mill/routes";
import { millPaths, requestCorrectionPermission } from "@/features/mill/paths";
import { riskPaths } from "@/features/risk/paths";
import { auditPaths } from "@/features/audit/paths";
import { ledgerEndpoints } from "@/api/ledger";
import type { UserRole } from "@/shared/types/roles";

const permissions = [requestCorrectionPermission, "export-orders.read", "residue.company-policy.manage"];
const itemsFor = (role: UserRole, grants = permissions) =>
  getSidebarItems(role, grants, i18n.t.bind(i18n), 0);

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
  useAuthStore.setState({ user: null, isAuthenticated: false, accessToken: null });
});

describe("application navigation", () => {
  it("resolves every sidebar and dashboard link to an explicit route", () => {
    for (const role of Object.keys(dashboardConfig) as UserRole[]) {
      const links = [...itemsFor(role), ...dashboardConfig[role].shortcuts];
      for (const { path } of links) {
        const route = matchRoutes(appRoutes, path)?.at(-1)?.route;
        expect(route?.path, path).toBeDefined();
        expect(route?.path, path).not.toBe("*");
      }
    }
  });

  const operator = (grants: string[]) => useAuthStore.setState({
    isAuthenticated: true,
    accessToken: "mock-access",
    user: { id: "operator", email: "operator@example.test", displayName: "Operator",
      role: "MILL_OPERATOR", isActive: true, permissions: grants },
  });

  function MillScreens({ home = <div /> }: { home?: ReactElement }) {
    return useRoutes([{ path: "/home", element: home }, ...millRoutes]);
  }

  it.each(["sidebar", "dashboard"])("opens the operator request from the %s", async (source) => {
    operator(permissions);
    vi.spyOn(ledgerEndpoints, "getOperations").mockResolvedValue([]);
    vi.spyOn(ledgerEndpoints, "getCorrections").mockResolvedValue([]);
    const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    render(<QueryClientProvider client={client}>
      <MemoryRouter initialEntries={["/home"]}>
        <MillScreens home={source === "sidebar" ? <AppSidebar /> : <RoleHomePage />} />
      </MemoryRouter>
    </QueryClientProvider>);
    const link = screen.getAllByRole("link").find(item => item.getAttribute("href") === millPaths.requestCorrection);
    expect(link).toBeDefined();
    fireEvent.click(link!);
    expect(await screen.findByRole("heading", { level: 1, name: "Tạo Yêu Cầu Sửa Bút Toán" })).toBeTruthy();
  });

  it("retries a correction with the same command ID and the selected committed operation", async () => {
    operator(permissions);
    vi.spyOn(ledgerEndpoints, "getOperations").mockResolvedValue([
      { id: "operation-id", status: "COMMITTED", kind: "MILLING" },
      { id: "draft-id", status: "DRAFT" },
    ]);
    vi.spyOn(ledgerEndpoints, "getCorrections").mockResolvedValue([]);
    const create = vi.spyOn(ledgerEndpoints, "createCorrection")
      .mockRejectedValueOnce(new Error("Connection interrupted"))
      .mockResolvedValue({ id: "saved" });
    render(<MemoryRouter initialEntries={[millPaths.requestCorrection]}><MillScreens /></MemoryRouter>);
    const select = await screen.findByRole("combobox");
    expect(Array.from((select as HTMLSelectElement).options).map(option => option.value)).toEqual(["", "operation-id"]);
    fireEvent.change(select, { target: { value: "operation-id" } });
    const reason = screen.getByLabelText(/Lý do sai sót/);
    fireEvent.change(reason, { target: { value: "Incorrect measurement" } });
    fireEvent.submit(reason.closest("form")!);
    expect((await screen.findByRole("alert")).textContent).toContain("Connection interrupted");
    fireEvent.submit(reason.closest("form")!);
    expect(await screen.findByText(/Đã gửi yêu cầu sửa công đoạn thành công/)).toBeTruthy();
    expect(create.mock.calls[0][0]).toEqual({ id: expect.any(String), operationId: "operation-id", reason: "Incorrect measurement" });
    expect(create.mock.calls[1][0]).toEqual(create.mock.calls[0][0]);
  });

  it("renders recent correction requests and filters them by search on the correction request page", async () => {
    operator(permissions);
    vi.spyOn(ledgerEndpoints, "getOperations").mockResolvedValue([]);
    vi.spyOn(ledgerEndpoints, "getCorrections").mockResolvedValue([
      {
        id: "corr-req-99",
        operationId: "op-committed-1",
        reason: "Cân đầu vào chênh lệch 50kg",
        status: "PENDING_REVIEW",
        createdAt: "2026-11-25T09:00:00Z",
      },
    ]);
    render(<MemoryRouter initialEntries={[millPaths.requestCorrection]}><MillScreens /></MemoryRouter>);
    expect(await screen.findByText("Cân đầu vào chênh lệch 50kg")).toBeTruthy();
    const search = screen.getByRole("searchbox");
    fireEvent.change(search, { target: { value: "NOT-FOUND" } });
    expect(screen.queryByText("Cân đầu vào chênh lệch 50kg")).toBeNull();
    fireEvent.click(screen.getByRole("button", { name: "Xóa bộ lọc tìm kiếm" }));
    expect(screen.getByText("Cân đầu vào chênh lệch 50kg")).toBeTruthy();
  });

  it("blocks direct access and hides the menu entry without write permission", () => {
    operator([]);
    expect(itemsFor("MILL_OPERATOR", []).some(item => item.path === millPaths.requestCorrection)).toBe(false);
    render(<MemoryRouter initialEntries={[millPaths.requestCorrection]}><MillScreens /></MemoryRouter>);
    expect(screen.getByText("Không có quyền truy cập màn hình này")).toBeTruthy();
  });

  it.each([
    ["/export/orders", "/export/orders"],
    ["/export/plans", "/export/orders"],
    ["/export/containers", "/export/orders"],
    ["/export/containers/cont-123/loading", "/export/orders"],
    ["/export/containers/cont-123/closure", "/export/orders"],
    ["/export/containers/cont-123/plan", "/export/orders"],
    ["/export/plans/plan-123/review", "/export/orders"],
    ["/export/dossiers", "/export/dossiers"],
    ["/export/containers/cont-123/dossier", "/export/dossiers"],
  ])("highlights the correct sidebar item when visiting %s", (pathname, expectedActivePath) => {
    useAuthStore.setState({
      isAuthenticated: true,
      accessToken: "mock-access",
      user: {
        id: "export-officer",
        email: "officer@example.test",
        displayName: "Export Officer",
        role: "CUSTOMER_EXPORT_OFFICER",
        isActive: true,
        permissions: ["export-orders.read"],
      },
    });
    const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    render(
      <QueryClientProvider client={client}>
        <MemoryRouter initialEntries={[pathname]}>
          <AppSidebar />
        </MemoryRouter>
      </QueryClientProvider>,
    );
    const links = screen.getAllByRole("link");
    const activeLink = links.find((link) => link.getAttribute("aria-current") === "page");
    expect(activeLink).toBeDefined();
    expect(activeLink?.getAttribute("href")).toBe(expectedActivePath);
  });

  it.each([
    [millPaths.operation, millPaths.operation],
    [millPaths.operationDrafts, millPaths.operation],
    [millPaths.varianceReview, millPaths.varianceReview],
    [millPaths.stock, millPaths.stock],
    ["/stock/lots/lot-1", millPaths.stock],
    [millPaths.stockTransfer, millPaths.stockTransfer],
  ])("highlights only the matching mill sidebar item when visiting %s", (pathname, expectedActivePath) => {
    operator(["conversions.write", "lots.read.facility"]);
    const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    render(
      <QueryClientProvider client={client}>
        <MemoryRouter initialEntries={[pathname]}>
          <AppSidebar />
        </MemoryRouter>
      </QueryClientProvider>,
    );
    const links = screen.getAllByRole("link");
    const activeLinks = links.filter((link) => link.getAttribute("aria-current") === "page");
    expect(activeLinks).toHaveLength(1);
    expect(activeLinks[0]?.getAttribute("href")).toBe(expectedActivePath);
  });

  it("adds ledger stock sidebar item based on lot read grants without duplicating /stock", () => {
    expect(itemsFor("MILL_OPERATOR", []).some((item) => item.path === millPaths.stock)).toBe(false);
    expect(itemsFor("MILL_OPERATOR", ["lots.read.facility"]).find((item) => item.path === millPaths.stock)?.label).toBe("Tồn kho sổ cái");
    expect(itemsFor("CUSTOMER_EXPORT_OFFICER", ["lots.read.tenant"]).find((item) => item.path === millPaths.stock)?.label).toBe("Tồn kho sổ cái");
    expect(itemsFor("MILL_MANAGER", ["lots.read.all"]).filter((item) => item.path === millPaths.stock)).toHaveLength(1);
  });

  it("enforces audit alignment between sidebar visibility, role permissions, and route guards", () => {
    const protectedChildren = appRoutes.find((route) => route.children)?.children ?? [];
    function ProtectedAppRoutes() {
      return <Suspense fallback={<div />}>{useRoutes(protectedChildren)}</Suspense>;
    }
    const renderRoute = (role: UserRole, grants: string[], pathname: string) => {
      useAuthStore.setState({
        isAuthenticated: true,
        accessToken: "mock-access",
        user: {
          id: "audit-user",
          email: "audit@example.test",
          displayName: "Audit User",
          role,
          hasAssignedRole: true,
          isActive: true,
          permissions: grants,
        },
      });
      const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
      render(
        <QueryClientProvider client={client}>
          <MemoryRouter initialEntries={[pathname]}>
            <ProtectedAppRoutes />
          </MemoryRouter>
        </QueryClientProvider>,
      );
    };

    // P0-1: CUSTOMER_MANAGER cannot see or open MRL Versions, sees Duyệt phương án when blend.approve present
    expect(
      itemsFor("CUSTOMER_MANAGER", ["blend.approve", "farms.read"]).some(
        (item) => item.path === catalogsPaths.mrlVersions,
      ),
    ).toBe(false);
    expect(
      itemsFor("CUSTOMER_MANAGER", ["blend.approve"]).some(
        (item) => item.path === exportPaths.pending,
      ),
    ).toBe(true);
    expect(
      itemsFor("CUSTOMER_EXPORT_OFFICER", ["mrl.read"]).some(
        (item) => item.path === catalogsPaths.mrlVersions,
      ),
    ).toBe(true);
    expect(
      itemsFor("CUSTOMER_EXPORT_OFFICER", []).some(
        (item) => item.path === catalogsPaths.mrlVersions,
      ),
    ).toBe(false);

    renderRoute("CUSTOMER_MANAGER", ["trace.read.tenant"], catalogsPaths.mrlVersions);
    expect(screen.getByText("Không có quyền truy cập màn hình này")).toBeTruthy();
    cleanup();

    // P0-2: MILL_MANAGER has Stock Transfer in sidebar and route with holds.process; hides Write Operation
    const managerItems = itemsFor("MILL_MANAGER", ["holds.process", "lots.read.all"]);
    expect(managerItems.some((item) => item.path === millPaths.stockTransfer)).toBe(true);
    expect(managerItems.some((item) => item.path === millPaths.operation)).toBe(false);

    vi.spyOn(ledgerEndpoints, "getLookups").mockResolvedValue({ facilities: [], locations: [] });
    vi.spyOn(ledgerEndpoints, "getLots").mockResolvedValue({ items: [], totalCount: 0, page: 1, pageSize: 30, hasMore: false });
    vi.spyOn(ledgerEndpoints, "getHolds").mockResolvedValue({ items: [], totalCount: 0, page: 1, pageSize: 50, hasMore: false });
    renderRoute("MILL_MANAGER", ["holds.process"], millPaths.stockTransfer);
    expect(screen.queryByText("Không có quyền truy cập màn hình này")).toBeNull();
    cleanup();

    // MILL_ADMIN is blocked from Field/Mill/Hold operational routes, allowed on Crop Seasons, Traceback, Container Trace & Events
    for (const blockedPath of [
      fieldPaths.farmers,
      fieldPaths.receipts,
      millPaths.receiving,
      riskPaths.holds,
      millPaths.stock,
    ]) {
      renderRoute(
        "MILL_ADMIN",
        ["identity.manage", "platform.configure", "trace.read.all", "residue.policy.manage"],
        blockedPath,
      );
      expect(screen.getByText("Không có quyền truy cập màn hình này"), blockedPath).toBeTruthy();
      cleanup();
    }

    vi.spyOn(ledgerEndpoints, "getLookups").mockResolvedValue({ facilities: [], locations: [] });
    vi.spyOn(ledgerEndpoints, "getTraceStarts").mockResolvedValue({ items: [], totalCount: 0, page: 1, pageSize: 25, hasMore: false });
    expect(
      itemsFor("MILL_ADMIN", ["trace.read.all"]).some(
        (item) => item.path === riskPaths.traceback,
      ),
    ).toBe(true);
    renderRoute("MILL_ADMIN", ["trace.read.all"], riskPaths.traceback);
    expect(screen.queryByText("Không có quyền truy cập màn hình này")).toBeNull();
    cleanup();

    // P1-4: Previously unguarded routes block missing permissions
    renderRoute("CUSTOMER_PROCUREMENT_OFFICER", ["farms.write", "purchases.write", "history.read"], millPaths.stock);
    expect(screen.getByText("Không có quyền truy cập màn hình này")).toBeTruthy();
    cleanup();

    renderRoute("CUSTOMER_PROCUREMENT_OFFICER", ["farms.write", "purchases.write", "history.read"], compliancePaths.profiles);
    expect(screen.getByText("Không có quyền truy cập màn hình này")).toBeTruthy();
    cleanup();

    renderRoute("AUTHORIZED_STOCK_VIEWER", [], auditPaths.events);
    expect(screen.getByText("Không có quyền truy cập màn hình này")).toBeTruthy();
  });
});
