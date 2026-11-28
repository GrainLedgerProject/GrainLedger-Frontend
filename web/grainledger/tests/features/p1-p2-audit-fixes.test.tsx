import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import i18n from "@/app/i18n";
import { useAuthStore } from "@/app/store/authStore";
import { ledgerEndpoints, type SetupApiResponse } from "@/api/ledger";
import { residueEndpoints } from "@/api/residue";
import { containerExecutionEndpoints } from "@/api/containerExecution";
import { ResidueRiskPage } from "@/features/compliance/pages/ResidueRiskPage";
import { compliancePaths } from "@/features/compliance/paths";
import { ApprovedPlanExecutionPage } from "@/features/mill/pages/ApprovedPlanExecutionPage";
import { StockOverviewPage } from "@/features/mill/pages/StockOverviewPage";
import { StockTransferPage } from "@/features/mill/pages/StockTransferPage";
import { millPaths } from "@/features/mill/paths";
import { HoldBanner } from "@/features/risk/components/HoldBanner";
import { ActualLoading } from "@/features/risk/components/ActualLoading";
import { ContainerTracePage } from "@/features/risk/pages/ContainerTracePage";
import { TraceabilityPage } from "@/features/risk/pages/TraceabilityPage";
import { authApi } from "@/features/auth/api/authApi";
import { authEndpoints } from "@/api/auth";
import { ApiError } from "@/api/client";

function renderWithQuery(ui: React.ReactNode, initialEntry = "/") {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
  return render(
    <MemoryRouter initialEntries={[initialEntry]}>
      <QueryClientProvider client={client}>{ui}</QueryClientProvider>
    </MemoryRouter>,
  );
}

const setupFixture: SetupApiResponse = {
  facilities: [{ id: "fac-1", name: "Mill A", version: "1" }],
  locations: [
    {
      id: "loc-1",
      facilityId: "fac-1",
      name: "Silo 1",
      kind: "SILO",
      cleared: true,
      mixedBulk: false,
      ownerId: "org-1",
      version: "1",
    },
    {
      id: "loc-iso",
      facilityId: "fac-1",
      name: "Isolation Bay",
      kind: "ISOLATION",
      cleared: true,
      mixedBulk: false,
      ownerId: "org-1",
      version: "1",
    },
  ],
  commodities: [{ id: "com-1", name: "Paddy" }],
  owners: [{ id: "org-1", name: "Customer A" }],
};

beforeEach(async () => {
  await i18n.changeLanguage("en");
});

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
  useAuthStore.setState({ user: null, isAuthenticated: false, accessToken: null });
});

describe("P1 & P2 audit fixes", () => {
  it("renders PR #28 location stock breakdown and rice variety on StockOverviewPage", async () => {
    vi.spyOn(ledgerEndpoints, "getLookups").mockResolvedValue(setupFixture);
    vi.spyOn(ledgerEndpoints, "getLots").mockResolvedValue({
      items: [
        {
          id: "lot-1",
          code: "LOT-ST25",
          stage: "DRIED_PADDY",
          productIdentity: "DRIED_PADDY",
          riceVariety: "ST25",
          varietyStatus: "SINGLE",
          ownerId: "org-1",
          ownerName: "Customer A",
          commodityId: "com-1",
          positions: [
            {
              facilityId: "fac-1",
              locationId: "loc-1",
              quantityKg: "2500",
              availableKg: "2500",
            },
          ],
          restrictions: [],
        },
      ],
      page: 1,
      pageSize: 30,
      totalCount: 1,
      hasMore: false,
    });
    const locStockSpy = vi
      .spyOn(ledgerEndpoints, "getLocationStock")
      .mockResolvedValue({
        locationId: "loc-1",
        totalKg: "2500",
        items: [
          {
            lotId: "lot-1",
            code: "LOT-ST25",
            stage: "DRIED_PADDY",
            riceVariety: "ST25",
            varietyStatus: "SINGLE",
            ownerName: "Customer A",
            quantityKg: "2500",
            availableKg: "2500",
            restrictions: [],
          },
        ],
        page: 1,
        pageSize: 25,
        totalCount: 1,
        hasMore: false,
      });

    renderWithQuery(
      <Routes>
        <Route path={millPaths.stock} element={<StockOverviewPage />} />
      </Routes>,
      `${millPaths.stock}?locationId=loc-1`,
    );

    expect(await screen.findByText("Location stock breakdown · Silo 1")).toBeTruthy();
    expect(locStockSpy).toHaveBeenCalledWith("loc-1", { page: 1, pageSize: 25 });
    expect((await screen.findAllByText("ST25")).length).toBeGreaterThanOrEqual(2);
    expect(screen.getByText("SINGLE")).toBeTruthy();
  });

  it("renders PR #27 ResidueRiskPage events and drills down to change targets", async () => {
    vi.spyOn(residueEndpoints, "getResidueRiskEvents").mockResolvedValue({
      items: [
        {
          id: "risk-1",
          changeId: "chg-1",
          targetType: "LOT",
          targetId: "11111111-1111-4111-8111-111111111111",
          relationshipBasis: "DIRECT_LOT",
          assessmentStatus: "FAIL",
          evaluatedAt: "2026-11-28T01:00:00Z",
        },
      ],
      page: 1,
      pageSize: 25,
      total: 1,
      hasNext: false,
    });
    vi.spyOn(residueEndpoints, "getResidueChange").mockResolvedValue({
      id: "chg-1",
      companyId: "org-1",
      globalCause: false,
      changeKind: "MRL_POLICY_UPDATED",
      subjectId: "rule-1",
      state: "COMPLETED",
      discoveryComplete: true,
      progress: { totalTargets: 2, completedTargets: 2, remainingTargets: 0 },
      dueAt: "2026-11-28T02:00:00Z",
    });
    vi.spyOn(residueEndpoints, "getResidueChangeTargets").mockResolvedValue({
      items: [
        {
          id: "tgt-1",
          changeId: "chg-1",
          targetType: "LOT",
          targetId: "11111111-1111-4111-8111-111111111111",
          relationshipBasis: "DIRECT_LOT",
          state: "COMPLETED",
          latestRiskEventId: "risk-1",
        },
      ],
      page: 1,
      pageSize: 20,
      total: 1,
      hasNext: false,
    });

    renderWithQuery(
      <Routes>
        <Route path={compliancePaths.residueRisk} element={<ResidueRiskPage />} />
      </Routes>,
      compliancePaths.residueRisk,
    );

    expect(await screen.findByText("FAIL")).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: /Change/i }));
    expect(await screen.findByText("MRL_POLICY_UPDATED")).toBeTruthy();
    expect(screen.getByText("2/2 (0 remaining)")).toBeTruthy();
  });

  it("preserves selected downstream lotId when picking an ancestor HOLD order on StockTransferPage", async () => {
    useAuthStore.setState({
      isAuthenticated: true,
      accessToken: "mock",
      user: {
        id: "mm-1",
        email: "mm@example.test",
        displayName: "Mill Manager",
        role: "MILL_MANAGER",
        isActive: true,
        permissions: ["lots.transfer", "holds.process", "holds.read"],
      },
    });
    vi.spyOn(ledgerEndpoints, "getLookups").mockResolvedValue(setupFixture);
    vi.spyOn(ledgerEndpoints, "getLots").mockResolvedValue({ items: [], hasMore: false });
    vi.spyOn(ledgerEndpoints, "getLot").mockResolvedValue({
      id: "descendant-lot",
      code: "CHILD-LOT",
      ownerId: "org-1",
      positions: [{ locationId: "loc-1", facilityId: "fac-1", availableKg: "0", quantityKg: "100" }],
    });
    const holdsSpy = vi.spyOn(ledgerEndpoints, "getHolds").mockResolvedValue({
      items: [
        { id: "hold-1", lotId: "root-lot", lotCode: "ROOT-LOT", reason: "High MRL", status: "ACTIVE" },
      ],
      hasMore: false,
    });

    renderWithQuery(
      <Routes>
        <Route path={millPaths.stockTransfer} element={<StockTransferPage />} />
      </Routes>,
      `${millPaths.stockTransfer}?isolation=1&lotId=descendant-lot`,
    );

    await waitFor(() => expect(holdsSpy).toHaveBeenCalled());
    const holdSelect = await screen.findByLabelText(/Original HOLD order \*/i);
    fireEvent.change(holdSelect, { target: { value: "hold-1" } });

    expect(
      await screen.findByText(/Keeping selected downstream lot \(inherited HOLD\)/i),
    ).toBeTruthy();
    expect(
      screen.getByRole("button", { name: /Switch to root lot \(ROOT-LOT\)/i }),
    ).toBeTruthy();
  });

  it("does not call GET /execution for MILL_MANAGER lacking export-orders.read on ApprovedPlanExecutionPage", async () => {
    useAuthStore.setState({
      isAuthenticated: true,
      accessToken: "mock",
      user: {
        id: "mm-1",
        email: "mm@example.test",
        displayName: "Mill Manager",
        role: "MILL_MANAGER",
        isActive: true,
        permissions: ["holds.process", "holds.read", "containers.operate"],
      },
    });
    vi.spyOn(ledgerEndpoints, "getLookups").mockResolvedValue(setupFixture);
    vi.spyOn(containerExecutionEndpoints, "getWorkItems").mockResolvedValue({
      items: [],
    });
    vi.spyOn(containerExecutionEndpoints, "listProduction").mockResolvedValue({
      items: [],
    });
    const detailSpy = vi.spyOn(containerExecutionEndpoints, "getDetail");
    const wfSpy = vi
      .spyOn(containerExecutionEndpoints, "getWorkflow")
      .mockResolvedValue({
        containerId: "cont-99",
        version: 2,
        ownerId: "org-1",
        status: "CLOSED",
        documents: [],
        supplements: [],
        reviews: [],
        handoffs: [],
        holds: [{ id: "h-1", reason: "Container Quarantine" }],
      });

    renderWithQuery(
      <Routes>
        <Route path="/mill/executions" element={<ApprovedPlanExecutionPage />} />
      </Routes>,
      "/mill/executions?container=cont-99",
    );

    await waitFor(() => expect(wfSpy).toHaveBeenCalledWith("cont-99"));
    expect(detailSpy).not.toHaveBeenCalled();
  });

  it("omits hardcoded timestamp on HoldBanner when issuedAt is not provided", () => {
    render(<HoldBanner targetType="Lô hàng" targetId="LOT-1" reason="Test HOLD" />);
    expect(screen.queryByText(/15\/10\/2026/)).toBeNull();
    expect(screen.getByText(/Test HOLD/)).toBeTruthy();
  });

  it("clears local session during single-device logout even when offline", async () => {
    useAuthStore.setState({
      isAuthenticated: true,
      accessToken: "mock-access",
      refreshToken: "mock-refresh",
      user: {
        id: "u-offline",
        email: "offline@example.test",
        displayName: "Offline User",
        role: "MILL_OPERATOR",
        isActive: true,
        permissions: ["lots.read.facility"],
      },
    });
    vi.spyOn(authEndpoints, "logout").mockRejectedValue(
      new ApiError(0, "Không thể kết nối đến máy chủ."),
    );

    await authApi.logout();
    expect(useAuthStore.getState().isAuthenticated).toBe(false);
    expect(useAuthStore.getState().user).toBeNull();
  });

  it("omits line source share on ActualLoading when lines lack sourceContributions", () => {
    renderWithQuery(
      <ActualLoading
        names={new Map([["lot-1", "LOT-001"]])}
        tracedLotId="lot-1"
        edges={[
          {
            containerId: "cont-1",
            lotId: "lot-1",
            quantityKg: "5000",
            lines: [
              {
                id: "line-1",
                proposalId: "prop-1",
                lotId: "lot-1",
                locationId: "loc-1",
                quantityKg: "5000",
                loadedAt: "2026-11-28T00:00:00Z",
              },
            ],
          },
        ]}
        containers={[
          {
            containerId: "cont-1",
            code: "CONT-001",
            linkedLoadedKg: "5000",
            sourceLoadedKg: null,
            status: "OPEN",
            held: false,
          },
        ]}
      />,
    );

    expect(screen.getByText("CONT-001")).toBeTruthy();
    expect(screen.queryByText(/Line source share/i)).toBeNull();
    expect(screen.queryByText(/Phân bổ theo dòng xếp/i)).toBeNull();
  });

  it("validates invalid ?lotId UUID param on TraceabilityPage without querying traceLot", async () => {
    useAuthStore.setState({
      isAuthenticated: true,
      accessToken: "mock-access",
      user: {
        id: "cm-trace",
        email: "cm@example.test",
        displayName: "Customer Manager",
        role: "CUSTOMER_MANAGER",
        isActive: true,
        permissions: ["trace.read.all"],
      },
    });
    vi.spyOn(ledgerEndpoints, "getLookups").mockResolvedValue(setupFixture);
    vi.spyOn(ledgerEndpoints, "getTraceStarts").mockResolvedValue({
      items: [],
      totalCount: 0,
    });
    const traceSpy = vi.spyOn(ledgerEndpoints, "traceLot");

    renderWithQuery(
      <Routes>
        <Route path="/risk/trace" element={<TraceabilityPage />} />
      </Routes>,
      "/risk/trace?lotId=not-a-valid-uuid",
    );

    expect(
      await screen.findByText(/valid UUID|định dạng UUID hợp lệ/i),
    ).toBeTruthy();
    expect(traceSpy).not.toHaveBeenCalled();
  });

  it("uses plotContributions for identified plot count, deduplicates unique HOLD orders, and renders container code & HOLD in flowchart", async () => {
    const cid = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";
    useAuthStore.setState({
      isAuthenticated: true,
      accessToken: "mock-access",
      user: {
        id: "cm-trace-2",
        email: "cm2@example.test",
        displayName: "Customer Manager",
        role: "CUSTOMER_MANAGER",
        isActive: true,
        permissions: ["trace.read.all", "holds.manage"],
      },
    });
    vi.spyOn(ledgerEndpoints, "getLookups").mockResolvedValue(setupFixture);
    vi.spyOn(containerExecutionEndpoints, "trace").mockResolvedValue({
      traceId: "trace-3-fixes",
      schemaVersion: 2,
      loadedKg: "10",
      complete: false,
      findings: ["SOURCE_PROVENANCE_UNAVAILABLE"],
      holds: [
        {
          id: "hold-container-1",
          reason: "Audit quarantine",
          recordedAt: "2026-11-28T01:00:00Z",
        },
      ],
      plotContributions: [],
      sourceContributions: [
        {
          sourceLotId: "raw-held",
          quantityKg: "6",
          percentage: "60",
          status: "SOURCE_PROVENANCE_UNAVAILABLE",
          provenance: null,
        },
        {
          sourceLotId: "raw-clean",
          quantityKg: "4",
          percentage: "40",
          status: "SOURCE_PROVENANCE_UNAVAILABLE",
          provenance: null,
        },
      ],
      graph: {
        lots: [
          {
            id: "raw-held",
            code: "RAW-HELD-01",
            stage: "RAW_PADDY",
            producedKg: "6",
            directHold: true,
            directHoldIds: ["hold-lot-1"],
          },
          {
            id: "raw-clean",
            code: "RAW-CLEAN-01",
            stage: "RAW_PADDY",
            producedKg: "4",
          },
          {
            id: "bld-1",
            code: "BLD-OUT-01",
            stage: "BLENDED_RICE",
            producedKg: "10",
            effectiveHold: true,
            effectiveHoldIds: ["hold-lot-1"],
          },
        ],
        edges: [
          {
            inputLotId: "raw-held",
            outputLotId: "bld-1",
            operationId: "op-1",
            kind: "BLENDING",
            inputConsumedKg: "6",
            outputProducedKg: "10",
          },
          {
            inputLotId: "raw-clean",
            outputLotId: "bld-1",
            operationId: "op-1",
            kind: "BLENDING",
            inputConsumedKg: "4",
            outputProducedKg: "10",
          },
        ],
        actualContainers: [
          {
            containerId: cid,
            code: "CONT-CLOSED-10",
            status: "CLOSED",
            linkedLoadedKg: "10.000000",
            held: true,
          },
        ],
        loadingEdges: [
          {
            containerId: cid,
            lotId: "bld-1",
            quantityKg: "10",
            lines: [
              {
                id: "line-1",
                proposalId: "prop-1",
                lotId: "bld-1",
                locationId: "loc-1",
                quantityKg: "10",
                loadedAt: "2026-11-28T00:00:00Z",
              },
            ],
          },
        ],
      },
    });

    renderWithQuery(
      <Routes>
        <Route path="/risk/container-trace" element={<ContainerTracePage />} />
      </Routes>,
      `/risk/container-trace?container=${cid}`,
    );

    await screen.findByText(/Trace ID: trace-3-fixes/);
    // Fix 1: KPI identified plot count is 0 while unassigned row keeps 10 kg breakdown
    const sourcePlotsCard = screen
      .getByText(/Thửa ruộng nguồn|Source plots/i)
      .closest("div")!.parentElement!;
    expect(sourcePlotsCard.textContent).toContain("0");
    expect(
      screen.getAllByText(/Chưa gán thửa ruộng|Unassigned plot/i).length,
    ).toBeGreaterThan(0);

    // Fix 2: 2 unique HOLD orders (container + lot) and 2 lineage lots (1 source, 1 inherited)
    const holdCard = screen
      .getByText(/Lệnh HOLD liên quan|Related HOLD orders/i)
      .closest("div")!.parentElement!;
    expect(holdCard.textContent).toContain("2");
    expect(
      screen.getByText(
        /2 lô trong phả hệ bị HOLD \(1 lô nguồn đóng góp, 1 lô kế thừa\)|2 lineage lots held \(1 contributing source, 1 inherited\)/i,
      ),
    ).toBeTruthy();

    // Fix 3: Flowchart renders container code CONT-CLOSED-10, CLOSED status, and HOLD container badge
    fireEvent.click(screen.getByRole("tab", { name: /Sơ đồ dòng|Flowchart/i }));
    const containerNode = await screen.findByRole("button", {
      name: /CONT-CLOSED-10 · CLOSED/i,
    });
    fireEvent.click(containerNode);
    expect(screen.getAllByText("CONT-CLOSED-10").length).toBeGreaterThan(0);
    expect(screen.getAllByText("HOLD container").length).toBeGreaterThan(0);
  });

  it("handles PLANNED container trace payload with empty loads, graph.asOf, NO_ACTUAL_LOADING, and renders flowchart focus node", async () => {
    const cid = "32273a40-e0fc-4da1-9064-fd172dfe0cf4";
    useAuthStore.setState({
      isAuthenticated: true,
      accessToken: "mock-access",
      user: {
        id: "cm-trace-planned",
        email: "cm-planned@example.test",
        displayName: "Customer Manager",
        role: "CUSTOMER_MANAGER",
        isActive: true,
        permissions: ["trace.read.all", "holds.manage"],
      },
    });
    vi.spyOn(ledgerEndpoints, "getLookups").mockResolvedValue(setupFixture);
    vi.spyOn(containerExecutionEndpoints, "trace").mockResolvedValue({
      id: cid,
      code: "CTN-20261111-000001",
      holds: [],
      loads: [],
      status: "PLANNED",
      orderId: "425a25d8-b1c6-404a-a1d9-ede578528ff4",
      traceId: "ee99a6f4-cd15-4d93-915d-4a79f759a9c6",
      version: 1,
      loadedKg: "0.000000",
      targetKg: "200.000000",
      companyId: "948e0af2-dbee-4638-aade-2a3411187ef4",
      facilityId: null,
      proposalId: null,
      sealNumber: null,
      remainingKg: "200.000000",
      closingScopes: [],
      containerNumber: null,
      dossierAvailable: false,
      workflowAvailable: true,
      sourceContributions: [],
      complete: false,
      basis: "ACTUAL_LOADING",
      plotContributions: [],
      findings: ["NO_ACTUAL_LOADING"],
      graph: {
        asOf: "2026-11-28T08:23:40.473439+00:00",
        lots: [],
        root: {
          id: cid,
          type: "container",
        },
        view: "current",
        edges: [],
        ownerId: "948e0af2-dbee-4638-aade-2a3411187ef4",
        traceId: "ee99a6f4-cd15-4d93-915d-4a79f759a9c6",
        complete: false,
        lotCount: 0,
        snapshot: "22696:22696:",
        direction: "backward",
        edgeCount: 0,
        graphBasis: "RECORDED_MATERIAL_RELATIONSHIPS",
        operations: [],
        corrections: [],
        loadingEdges: [],
        custodyEvents: [],
        schemaVersion: 2,
        actualContainers: [
          {
            code: "CTN-20261111-000001",
            held: false,
            basis: "ACTUAL_LOADING",
            status: "PLANNED",
            restricted: false,
            containerId: cid,
            linkedLoadedKg: "0.000000",
          },
        ],
        containerCoverage: "ACTUAL_LOADING",
        sourceContributionsVisible: true,
        sources: [],
        findings: ["NO_ACTUAL_LOADING"],
      },
    });

    renderWithQuery(
      <Routes>
        <Route path="/risk/container-trace" element={<ContainerTracePage />} />
      </Routes>,
      `/risk/container-trace?container=${cid}`,
    );

    await screen.findByText(/Trace ID: ee99a6f4-cd15-4d93-915d-4a79f759a9c6/);
    expect(screen.getAllByText("CTN-20261111-000001").length).toBeGreaterThan(0);
    expect(screen.getByText(/200\.000000 kg/)).toBeTruthy();
    expect(screen.getByText(/NO_ACTUAL_LOADING/)).toBeTruthy();

    const holdCard = screen
      .getByText(/Lệnh HOLD liên quan|Related HOLD orders/i)
      .closest("div")!.parentElement!;
    expect(holdCard.textContent).toContain("0");

    const sourcePlotsCard = screen
      .getByText(/Thửa ruộng nguồn|Source plots/i)
      .closest("div")!.parentElement!;
    expect(sourcePlotsCard.textContent).toContain("0");

    expect(
      screen.getByText(
        /Container chưa có dữ liệu thực xếp nên chưa phát sinh đóng góp từ lô nguồn|No actual loading has been recorded for this container yet/i,
      ),
    ).toBeTruthy();

    fireEvent.click(screen.getByRole("tab", { name: /Sơ đồ dòng|Flowchart/i }));
    const plannedNode = await screen.findByRole("button", {
      name: /CTN-20261111-000001 · PLANNED/i,
    });
    expect(plannedNode).toBeTruthy();
  });
});
