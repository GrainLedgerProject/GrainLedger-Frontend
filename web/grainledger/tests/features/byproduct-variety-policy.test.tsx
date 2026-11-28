import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Suspense } from "react";
import { MemoryRouter, Route, Routes, useLocation, useRoutes } from "react-router-dom";
import i18n from "@/app/i18n";
import { ApiError } from "@/api/client";
import { ledgerEndpoints, type ByproductVarietyPolicyItem } from "@/api/ledger";
import { getSidebarItems } from "@/app/navigation/sidebarItems";
import { appRoutes } from "@/app/router/routes";
import { useAuthStore } from "@/app/store/authStore";
import { ByproductVarietyPolicyPage } from "@/features/compliance/pages/ByproductVarietyPolicyPage";
import { compliancePaths } from "@/features/compliance/paths";

function wrap(ui: React.ReactElement) {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
  return render(
    <QueryClientProvider client={client}>
      <MemoryRouter>{ui}</MemoryRouter>
    </QueryClientProvider>,
  );
}

function signInCustomerManager(permissions: string[] = ["byproduct.variety-policy.manage"]) {
  useAuthStore.setState({
    isAuthenticated: true,
    accessToken: "mock-token",
    user: {
      id: "cm-1",
      email: "cm@grainledger.test",
      displayName: "Customer Manager",
      role: "CUSTOMER_MANAGER",
      organizationId: "cust-1",
      organizationName: "Mekong Export",
      hasAssignedRole: true,
      isActive: true,
      permissions,
    },
  });
}

describe("ByproductVarietyPolicyPage (Gap 3.2)", () => {
  beforeEach(async () => {
    await i18n.changeLanguage("en");
  });

  afterEach(() => {
    cleanup();
    vi.restoreAllMocks();
    useAuthStore.setState({ user: null, isAuthenticated: false, accessToken: null });
  });

  it("denies access without CUSTOMER_MANAGER authority and byproduct permission", () => {
    signInCustomerManager(["trace.read.tenant"]);
    wrap(<ByproductVarietyPolicyPage />);
    expect(screen.getByRole("alert").textContent ?? "").toContain(
      "byproduct.variety-policy.manage",
    );
  });

  it("saves BRAN independently, resets back to default, and reloads on 409 conflict without touching HUSK", async () => {
    signInCustomerManager();

    let serverItems: ByproductVarietyPolicyItem[] = [
      { stage: "BRAN", allowCrossVariety: true, source: "SYSTEM_DEFAULT", revision: null },
      { stage: "HUSK", allowCrossVariety: true, source: "SYSTEM_DEFAULT", revision: null },
    ];
    let simulateConflict = false;

    const getSpy = vi
      .spyOn(ledgerEndpoints, "getByproductVarietyPolicy")
      .mockImplementation(async () => ({
        companyId: "cust-1",
        items: serverItems.map((item) => ({ ...item })),
      }));

    const putSpy = vi
      .spyOn(ledgerEndpoints, "updateByproductVarietyPolicy")
      .mockImplementation(async (stage, req) => {
        if (simulateConflict) {
          serverItems = serverItems.map((item) =>
            item.stage === stage
              ? {
                  stage,
                  allowCrossVariety: true,
                  source: "COMPANY_OVERRIDE",
                  revision: "rev-server-latest",
                }
              : item,
          );
          throw new ApiError(409, "Byproduct variety policy changed; reload before saving");
        }
        const updated: ByproductVarietyPolicyItem = {
          stage,
          allowCrossVariety: req.allowCrossVariety ?? true,
          source: req.allowCrossVariety === null ? "SYSTEM_DEFAULT" : "COMPANY_OVERRIDE",
          revision: stage === "BRAN" ? "rev-bran-1" : "rev-husk-1",
        };
        serverItems = serverItems.map((item) => (item.stage === stage ? updated : item));
        return { ...updated };
      });

    wrap(<ByproductVarietyPolicyPage />);

    const branHeading = await screen.findByRole("heading", { name: "Bran (BRAN)" });
    const huskHeading = screen.getByRole("heading", { name: "Husk (HUSK)" });
    const branCard = branHeading.closest("section")!;
    const huskCard = huskHeading.closest("section")!;

    fireEvent.click(within(branCard).getByLabelText(/Keep rice varieties separate/));
    const reasonField = within(branCard).getByLabelText(/Reason for change/);
    expect(reasonField.getAttribute("aria-invalid")).toBe("false");

    // Submitting without reason highlights and moves focus to the reason field
    fireEvent.click(within(branCard).getByRole("button", { name: /Save Bran \(BRAN\) policy/ }));
    expect(reasonField.getAttribute("aria-invalid")).toBe("true");
    expect(document.activeElement).toBe(reasonField);
    expect(putSpy).not.toHaveBeenCalled();

    // Entering valid reason clears invalid state immediately and submits BRAN only
    fireEvent.change(reasonField, { target: { value: "  Separate bran by variety  " } });
    expect(reasonField.getAttribute("aria-invalid")).toBe("false");
    fireEvent.click(within(branCard).getByRole("button", { name: /Save Bran \(BRAN\) policy/ }));

    await waitFor(() =>
      expect(putSpy).toHaveBeenCalledWith("BRAN", {
        allowCrossVariety: false,
        expectedRevision: null,
        reason: "Separate bran by variety",
      }),
    );

    const updatedBranCard = screen.getByRole("heading", { name: "Bran (BRAN)" }).closest("section")!;
    expect(within(updatedBranCard).getByText("Company override")).toBeTruthy();
    expect(within(updatedBranCard).getByText("Keep varieties separate")).toBeTruthy();
    expect(within(huskCard).getByText("System default")).toBeTruthy();
    expect(within(huskCard).getByText("Allow different varieties")).toBeTruthy();

    // Resetting back to system default sends allowCrossVariety: null with the latest revision
    fireEvent.click(within(updatedBranCard).getByLabelText(/Use system default/));
    fireEvent.change(within(updatedBranCard).getByLabelText(/Reason for change/), {
      target: { value: "Reset to platform default" },
    });
    fireEvent.click(
      within(updatedBranCard).getByRole("button", { name: /Save Bran \(BRAN\) policy/ }),
    );

    await waitFor(() =>
      expect(putSpy).toHaveBeenLastCalledWith("BRAN", {
        allowCrossVariety: null,
        expectedRevision: "rev-bran-1",
        reason: "Reset to platform default",
      }),
    );

    // 409 Conflict reloads server settings and alerts the user without touching HUSK
    simulateConflict = true;
    const conflictCard = screen.getByRole("heading", { name: "Bran (BRAN)" }).closest("section")!;
    fireEvent.change(within(conflictCard).getByLabelText(/Reason for change/), {
      target: { value: "Conflict check" },
    });
    fireEvent.click(within(conflictCard).getByRole("button", { name: /Save Bran \(BRAN\) policy/ }));

    await waitFor(() =>
      expect(screen.getByRole("alert").textContent ?? "").toContain("Reloaded current settings"),
    );
    expect(getSpy.mock.calls.length).toBeGreaterThanOrEqual(2);
    expect(putSpy.mock.calls.filter(([stage]) => stage === "HUSK")).toHaveLength(0);
  });

  it("wires sidebar item, route guard, and /byproduct-mixing legacy redirect", async () => {
    const allowedItems = getSidebarItems(
      "CUSTOMER_MANAGER",
      ["byproduct.variety-policy.manage"],
      i18n.t.bind(i18n),
      0,
    );
    expect(allowedItems.some((item) => item.path === compliancePaths.byproductMixing)).toBe(true);

    const deniedItems = getSidebarItems("CUSTOMER_MANAGER", ["trace.read.tenant"], i18n.t.bind(i18n), 0);
    expect(deniedItems.some((item) => item.path === compliancePaths.byproductMixing)).toBe(false);

    const protectedChildren = appRoutes.find((route) => route.children)?.children ?? [];
    function ProbeRoute() {
      const loc = useLocation();
      const matched = useRoutes(protectedChildren);
      return (
        <>
          <div data-testid="path-echo">{loc.pathname}</div>
          <Suspense fallback={<div />}>{matched}</Suspense>
        </>
      );
    }

    signInCustomerManager(["trace.read.tenant"]);
    const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    render(
      <QueryClientProvider client={client}>
        <MemoryRouter initialEntries={["/byproduct-mixing"]}>
          <Routes>
            <Route path="*" element={<ProbeRoute />} />
          </Routes>
        </MemoryRouter>
      </QueryClientProvider>,
    );

    expect(screen.getByTestId("path-echo").textContent).toBe(compliancePaths.byproductMixing);
    expect(
      await screen.findByText(/Không có quyền truy cập màn hình này|Access denied for this screen/i),
    ).toBeTruthy();
  });
});
