import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen, within, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { AppSidebar } from "@/app/layout/AppSidebar";
import { RoleHomePage } from "@/features/dashboard/pages/RoleHomePage";
import type { ReactElement } from "react";
import { matchRoutes, MemoryRouter, useRoutes } from "react-router-dom";
import i18n from "@/app/i18n";
import { appRoutes } from "@/app/router/routes";
import { getSidebarItems } from "@/app/navigation/sidebarItems";
import { useAuthStore } from "@/app/store/authStore";
import { dashboardConfig } from "@/features/dashboard/model/dashboardConfig";
import { millRoutes } from "@/features/mill/routes";
import { millPaths, requestCorrectionPermission } from "@/features/mill/paths";
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
    const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    render(<QueryClientProvider client={client}>
      <MemoryRouter initialEntries={["/home"]}>
        <MillScreens home={source === "sidebar" ? <AppSidebar /> : <RoleHomePage />} />
      </MemoryRouter>
    </QueryClientProvider>);
    const link = screen.getAllByRole("link").find(item => item.getAttribute("href") === millPaths.requestCorrection);
    expect(link).toBeDefined();
    fireEvent.click(link!);
    expect(await screen.findByRole("dialog")).toBeTruthy();
  });

  it("retries a correction with the same command ID and the selected committed operation", async () => {
    operator(permissions);
    vi.spyOn(ledgerEndpoints, "getOperations").mockResolvedValue([
      { id: "operation-id", status: "COMMITTED", kind: "MILLING" },
      { id: "draft-id", status: "DRAFT" },
    ]);
    const create = vi.spyOn(ledgerEndpoints, "createCorrection")
      .mockRejectedValueOnce(new Error("Connection interrupted"))
      .mockResolvedValue({ id: "saved" });
    render(<MemoryRouter initialEntries={[millPaths.requestCorrection]}><MillScreens /></MemoryRouter>);
    const dialog = within(await screen.findByRole("dialog"));
    const select = await dialog.findByRole("combobox");
    expect(Array.from((select as HTMLSelectElement).options).map(option => option.value)).toEqual(["", "operation-id"]);
    fireEvent.change(select, { target: { value: "operation-id" } });
    const reason = dialog.getByRole("textbox");
    fireEvent.change(reason, { target: { value: "Incorrect measurement" } });
    fireEvent.submit(reason.closest("form")!);
    expect((await dialog.findByRole("alert")).textContent).toContain("Connection interrupted");
    fireEvent.submit(reason.closest("form")!);
    await waitFor(() => expect(screen.queryByRole("dialog")).toBeNull());
    expect(create.mock.calls[0][0]).toEqual({ id: expect.any(String), operationId: "operation-id", reason: "Incorrect measurement" });
    expect(create.mock.calls[1][0]).toEqual(create.mock.calls[0][0]);
  });

  it("blocks direct access and hides the menu entry without write permission", () => {
    operator([]);
    expect(itemsFor("MILL_OPERATOR", []).some(item => item.path === millPaths.requestCorrection)).toBe(false);
    render(<MemoryRouter initialEntries={[millPaths.requestCorrection]}><MillScreens /></MemoryRouter>);
    expect(screen.getByText("Không có quyền truy cập màn hình này")).toBeTruthy();
  });
});
