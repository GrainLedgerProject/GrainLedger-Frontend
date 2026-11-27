import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { MemoryRouter, Route, Routes, useLocation } from "react-router-dom";
import i18n from "@/app/i18n";
import { useAuthStore } from "@/app/store/authStore";
import { getSidebarItems } from "@/app/navigation/sidebarItems";
import { LegacyLabReportRedirect, LegacyRedirect } from "@/app/router/LegacyRedirect";
import { adminEndpoints } from "@/api/admin";
import { containerExecutionEndpoints } from "@/api/containerExecution";
import { ledgerEndpoints } from "@/api/ledger";
import { parseLabCsv } from "@/features/compliance/model/labCsv";
import { BlendRatioEditor } from "@/features/export/components/BlendInvestigation";
import { classifyDocumentOrigin } from "@/features/export/model/packingList";
import { FacilityConfigPage } from "@/features/admin/pages/FacilityConfigPage";
import { ReceivingThresholdsPage } from "@/features/admin/pages/ReceivingThresholdsPage";
import { UserAccessManagementPage } from "@/features/admin/pages/UserAccessManagementPage";
import { EventHistoryPage } from "@/features/audit/pages/EventHistoryPage";
import { ContainerTracePage } from "@/features/risk/pages/ContainerTracePage";

function wrap(ui: React.ReactNode, initialPath = "/") {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={client}>
      <MemoryRouter initialEntries={[initialPath]}>{ui}</MemoryRouter>
    </QueryClientProvider>,
  );
}

beforeEach(async () => {
  await i18n.changeLanguage("en");
});

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
  useAuthStore.setState({ user: null, isAuthenticated: false, accessToken: null });
});

describe("Frontend report 1 & gap report fixes", () => {
  it("prioritizes explicit UPLOADED origin over [SYSTEM_GENERATED] reason tags in packingList classification", () => {
    const result = classifyDocumentOrigin({
      id: "doc-1",
      documentType: "PACKING_LIST",
      version: 1,
      filename: "uploaded.pdf",
      contentType: "application/pdf",
      sha256: "abc",
      reason: "[SYSTEM_GENERATED] legacy tag",
      recordedAt: "2026-11-26T00:00:00Z",
      origin: "UPLOADED",
    });
    expect(result).toBe("UPLOADED");
  });

  it("enforces whole-integer kg values in BlendRatioEditor", () => {
    const onDirty = vi.fn();
    const onAssess = vi.fn();
    render(
      <BlendRatioEditor
        result={{
          selection: {
            selectedMassKg: "100",
            allocations: [
              { lotId: "lot-1", lotCode: "LOT-01", locationId: "loc-1", quantityKg: "40" },
              { lotId: "lot-2", lotCode: "LOT-02", locationId: "loc-2", quantityKg: "60" },
            ],
          },
          ratioRange: { minimumKg: "5.2", maximumKg: "80.8", incrementKg: "1" },
        } as Parameters<typeof BlendRatioEditor>[0]["result"]}
        disabled={false}
        onDirty={onDirty}
        onAssess={onAssess}
      />,
    );

    const numberInput = screen.getByRole("spinbutton") as HTMLInputElement;
    expect(numberInput.step).toBe("1");
    expect(numberInput.min).toBe("6");
    expect(numberInput.max).toBe("80");

    fireEvent.change(numberInput, { target: { value: "9.5" } });
    expect(screen.getByText(/whole integer/i)).toBeTruthy();
    const submitBtn = screen.getByRole("button", { name: /Reassess ratio/i }) as HTMLButtonElement;
    expect(submitBtn.disabled).toBe(true);

    fireEvent.change(numberInput, { target: { value: "10" } });
    expect(submitBtn.disabled).toBe(false);
    fireEvent.click(submitBtn);
    expect(onAssess).toHaveBeenCalledWith("10");
  });

  it("sends eventType filter from Business History mode in EventHistoryPage", async () => {
    useAuthStore.setState({
      isAuthenticated: true,
      accessToken: "mock",
      user: {
        id: "admin-1",
        email: "admin@grainledger.test",
        displayName: "Admin",
        role: "MILL_ADMIN",
        permissions: ["platform.configure", "trace.read.all"],
        isActive: true,
      },
    });
    const bizSpy = vi.spyOn(ledgerEndpoints, "getBusinessHistory").mockResolvedValue({
      items: [],
      page: 1,
      pageSize: 25,
      totalCount: 0,
      hasMore: false,
    });
    wrap(<EventHistoryPage />);

    const eventTypeInput = await screen.findByLabelText("Event type");
    fireEvent.change(eventTypeInput, { target: { value: "TRACEBACK" } });

    await waitFor(() =>
      expect(bizSpy).toHaveBeenCalledWith(
        expect.objectContaining({ eventType: "TRACEBACK" }),
        expect.any(Object),
      ),
    );
  });

  it("displays partial trace data and incomplete banner instead of discarding complete=false results in ContainerTracePage", async () => {
    useAuthStore.setState({
      isAuthenticated: true,
      accessToken: "mock",
      user: {
        id: "mgr-1",
        email: "mgr@grainledger.test",
        displayName: "Manager",
        role: "CUSTOMER_MANAGER",
        permissions: ["trace.read.tenant", "holds.manage"],
        isActive: true,
      },
    });
    const cid = "11111111-1111-4111-8111-111111111111";
    vi.spyOn(containerExecutionEndpoints, "trace").mockResolvedValue({
      traceId: "TRACE-PARTIAL-01",
      schemaVersion: 2,
      loadedKg: "12500",
      complete: false,
      findings: ["MISSING_UPSTREAM_RECEIPT"],
      sourceContributions: [
        { sourceLotId: "src-1", quantityKg: "12500", percentage: "100", status: "OK" },
      ],
      graph: { lots: [], edges: [] },
    });

    wrap(<ContainerTracePage />, `/risk/container-trace?container=${cid}`);
    expect(await screen.findByText(/Container trace is incomplete/i)).toBeTruthy();
    expect(screen.getAllByText(/12500/).length).toBeGreaterThan(0);
    expect(screen.getByText(/MISSING_UPSTREAM_RECEIPT/)).toBeTruthy();
  });

  it("preserves SILO and COMPARTMENT location kinds in FacilityConfigPage editor", async () => {
    useAuthStore.setState({
      isAuthenticated: true,
      accessToken: "mock",
      user: {
        id: "admin-1",
        email: "admin@grainledger.test",
        displayName: "Admin",
        role: "MILL_ADMIN",
        permissions: ["platform.configure"],
        isActive: true,
      },
    });
    vi.spyOn(ledgerEndpoints, "getSetup").mockResolvedValue({
      facilities: [{ id: "fac-1", name: "Mill One", version: "v1", canEdit: true }],
      locations: [
        {
          id: "loc-silo",
          facilityId: "fac-1",
          name: "Silo S1",
          kind: "SILO",
          cleared: true,
          mixedBulk: false,
          ownerId: null,
          version: "v1",
          canEdit: true,
        },
      ],
    });
    wrap(<FacilityConfigPage />);
    expect(await screen.findByText("SILO")).toBeTruthy();
    fireEvent.click(screen.getByTitle("Chỉnh sửa vị trí"));
    const kindSelect = (await screen.findByLabelText(/Phân loại Vị trí/)) as HTMLSelectElement;
    expect(kindSelect.value).toBe("SILO");
    expect(Array.from(kindSelect.options).map((o) => o.value)).toEqual([
      "STORE",
      "SILO",
      "COMPARTMENT",
      "ISOLATION",
    ]);
  });

  it("validates CSV and TSV rows accurately in parseLabCsv", () => {
    const valid = parseLabCsv(
      "testLabel\toriginalResultText\tresultKind\tnumericValue\tunit\nAzoxystrobin\t0.01 mg/kg\tNUMERIC\t0.01\tmg/kg",
    );
    expect(valid.errors).toEqual([]);
    expect(valid.rows).toHaveLength(1);
    expect(valid.rows[0].testLabel).toBe("Azoxystrobin");

    const invalid = parseLabCsv("testLabel,originalResultText,resultKind\nCarbaryl,0.5,NUMERIC");
    expect(invalid.errors[0]).toContain("numericValue is required");
  });

  it("requires explicit user-entered delete reason in ReceivingThresholdsPage", async () => {
    vi.spyOn(ledgerEndpoints, "getReceivingThresholds").mockResolvedValue({
      systemDefault: { percentage: "1.0", version: "v1" },
      companyOverrides: [
        { companyId: "comp-1", companyName: "Acme Rice", percentage: "0.5", version: "v2" },
      ],
    });
    vi.spyOn(adminEndpoints, "getOrganizations").mockResolvedValue([]);
    const delSpy = vi
      .spyOn(ledgerEndpoints, "deleteCompanyReceivingThreshold")
      .mockResolvedValue({});

    wrap(<ReceivingThresholdsPage />);
    fireEvent.click(await screen.findByRole("button", { name: /^Xóa$/ }));

    const submitDeleteBtn = screen.getByRole("button", { name: "Xóa ngưỡng" }) as HTMLButtonElement;
    expect(submitDeleteBtn.disabled).toBe(true);

    const deleteReasonInput = await screen.findByLabelText(/Lý do xóa ngưỡng riêng/);
    fireEvent.change(deleteReasonInput, { target: { value: "Hết hạn thỏa thuận riêng" } });
    expect(submitDeleteBtn.disabled).toBe(false);
    fireEvent.click(submitDeleteBtn);

    await waitFor(() =>
      expect(delSpy).toHaveBeenCalledWith("comp-1", {
        version: "v2",
        reason: "Hết hạn thỏa thuận riêng",
      }),
    );
  });

  it("disables self role, org, and active edits in UserAccessManagementPage", async () => {
    useAuthStore.setState({
      isAuthenticated: true,
      accessToken: "mock",
      user: {
        id: "admin-self",
        email: "self@grainledger.test",
        displayName: "Self Admin",
        role: "MILL_ADMIN",
        permissions: ["identity.manage", "platform.configure"],
        isActive: true,
      },
    });
    vi.spyOn(adminEndpoints, "getUsers").mockResolvedValue([
      {
        id: "admin-self",
        email: "self@grainledger.test",
        displayName: "Self Admin",
        role: "Administrator",
        organizationId: "mill-1",
        organizationName: "Mill One",
        isActive: true,
        etag: '"v1"',
      },
    ]);
    vi.spyOn(adminEndpoints, "getOrganizations").mockResolvedValue([
      { id: "mill-1", kind: "Mill", name: "Mill One", version: 1, canEdit: true, canDelete: false },
    ]);
    vi.spyOn(adminEndpoints, "getRoles").mockResolvedValue([
      { name: "Administrator", organizationKind: "Mill" },
    ]);

    wrap(<UserAccessManagementPage />);
    fireEvent.click(await screen.findByRole("button", { name: /Grant access/i }));

    const selfWarning = await screen.findByRole("alert");
    expect(selfWarning.textContent ?? "").toMatch(
      /You cannot change the organization, role, or active status of your own signed-in account/i,
    );
    expect((document.getElementById("access-role") as HTMLSelectElement).disabled).toBe(true);
    expect((document.getElementById("access-org") as HTMLSelectElement).disabled).toBe(true);
    expect((document.getElementById("userActiveCheck") as HTMLInputElement).disabled).toBe(true);
    const submitBtn = document.querySelector('form button[type="submit"]') as HTMLButtonElement;
    expect(submitBtn.disabled).toBe(true);
  });

  it("includes read-only sidebar items for farms.read, platform.read, and lab.read, and preserves legacy redirects", () => {
    const t = ((_: string, fallback?: string) => fallback ?? _) as Parameters<typeof getSidebarItems>[2];
    const cmItems = getSidebarItems("CUSTOMER_MANAGER", ["farms.read", "lab.write"], t, 0);
    expect(cmItems.some((item) => item.path === "/field/farmers/new")).toBe(true);
    expect(cmItems.some((item) => item.path === "/field/plots/new")).toBe(true);

    const mmItems = getSidebarItems("MILL_MANAGER", ["platform.read"], t, 0);
    expect(mmItems.some((item) => item.path === "/admin/facilities")).toBe(true);

    const eoItems = getSidebarItems("CUSTOMER_EXPORT_OFFICER", ["lab.read", "mrl.read"], t, 0);
    expect(eoItems.some((item) => item.path === "/compliance/lab-results")).toBe(true);
    expect(eoItems.some((item) => item.path === "/compliance/lab-samples")).toBe(true);

    function LocationEcho() {
      const loc = useLocation();
      return <div data-testid="loc">{loc.pathname}</div>;
    }
    const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    render(
      <QueryClientProvider client={client}>
        <MemoryRouter initialEntries={["/lab-reports/rep-99"]}>
          <Routes>
            <Route path="/lab-reports" element={<LegacyRedirect to="/compliance/lab-results" />} />
            <Route path="/lab-reports/:id" element={<LegacyLabReportRedirect />} />
            <Route path="/compliance/lab-results/:id" element={<LocationEcho />} />
          </Routes>
        </MemoryRouter>
      </QueryClientProvider>,
    );
    expect(screen.getByTestId("loc").textContent).toBe("/compliance/lab-results/rep-99");
  });
});
