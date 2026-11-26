import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import {
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
} from "@testing-library/react";
import type { ReactNode } from "react";
import { MemoryRouter } from "react-router-dom";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import i18n from "@/app/i18n";
import { NotificationCenter } from "@/app/layout/NotificationCenter";
import { useAuthStore } from "@/app/store/authStore";
import { useUiStore } from "@/app/store/uiStore";
import { catalogsEndpoints } from "@/api/catalogs";
import { ApiError } from "@/api/client";
import { labReportEndpoints, sampleEndpoints } from "@/api/compliance";
import {
  containerExecutionEndpoints,
  type ContainerDossier,
  type ContainerExecution,
  type ContainerWorkflowDetail,
} from "@/api/containerExecution";
import { exportEndpoints } from "@/api/exports";
import { ledgerEndpoints } from "@/api/ledger";
import { configureApiSession } from "@/api/session";
import { EventHistoryPage } from "@/features/audit/pages/EventHistoryPage";
import { MrlComplianceCheckPage } from "@/features/compliance/pages/MrlComplianceCheckPage";
import { ContainerClosureForm } from "@/features/export/components/ContainerClosureForm";
import { ContainerDossierPanel } from "@/features/export/components/ContainerDossierPanel";
import { ContainerHoldForm } from "@/features/export/components/ContainerHoldForm";
import { ExportDossiersWorkspace } from "@/features/export/components/ExportDossiersWorkspace";
import {
  ExportOrderDetails,
} from "@/features/export/components/ExportOrdersWorkspace";
import { classifyDocumentOrigin } from "@/features/export/model/packingList";
import { ApprovedPlanExecutionPage } from "@/features/mill/pages/ApprovedPlanExecutionPage";
import { StockTransferPage } from "@/features/mill/pages/StockTransferPage";
import { PlaceHoldModal } from "@/features/risk/components/PlaceHoldModal";
import { ContainerTracePage } from "@/features/risk/pages/ContainerTracePage";
import { HoldManagementPage } from "@/features/risk/pages/HoldManagementPage";
import { TraceabilityPage } from "@/features/risk/pages/TraceabilityPage";
import { ResidueBounds } from "@/features/risk/components/ResidueBounds";
import type { UserRole } from "@/shared/types/roles";

const page = <T,>(items: T[], hasMore = false) => ({
  items,
  page: 1,
  pageSize: 25,
  totalCount: items.length,
  hasMore,
});

function signIn(
  role: UserRole,
  permissions: string[],
  assignedFacilities?: string[],
) {
  useAuthStore.setState({
    isAuthenticated: true,
    accessToken: "test-token",
    user: {
      id: "user-1",
      organizationId: "org-1",
      displayName: "Checklist User",
      email: "user@grainledger.test",
      role,
      permissions,
      assignedFacilities,
      isActive: true,
    },
  });
}

function mount(content: ReactNode, initialEntry = "/") {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
  return render(
    <QueryClientProvider client={client}>
      <MemoryRouter initialEntries={[initialEntry]}>{content}</MemoryRouter>
    </QueryClientProvider>,
  );
}

beforeEach(async () => {
  await i18n.changeLanguage("vi");
  sessionStorage.clear();
  localStorage.clear();
});

afterEach(() => {
  cleanup();
  sessionStorage.clear();
  localStorage.clear();
  useAuthStore.getState().logout();
  vi.restoreAllMocks();
  configureApiSession({
    read: () => ({
      version: 0,
      ownerKey: null,
      accessToken: null,
      refreshToken: null,
    }),
    apply: vi.fn(),
    expire: vi.fn(),
    setConnected: vi.fn(),
  });
});

describe("Tracing & Container HOLD checklist", () => {
  it("recovers unresolved container closure command across remount with original operationId", async () => {
    signIn("CUSTOMER_EXPORT_OFFICER", ["containers.write"]);
    const container: ContainerExecution = {
      id: "c-recover",
      orderId: "o-1",
      code: "CT-RECOVER",
      companyId: "org-1",
      targetKg: "1000",
      loadedKg: "1000",
      remainingKg: "0",
      status: "LOADING",
      version: 7,
      facilityId: "fac-1",
      containerNumber: "GLCU1234567",
      sealNumber: "SEAL-01",
      dossierAvailable: false,
      holds: [],
      loads: [],
      approval: null,
    };
    const closeSpy = vi
      .spyOn(containerExecutionEndpoints, "close")
      .mockRejectedValueOnce(new ApiError(0, "Network timeout"))
      .mockResolvedValue({ ...container, status: "CLOSED", version: 8 });

    const firstMount = mount(
      <ContainerClosureForm
        container={container}
        readiness={{
          phase: "CLOSE",
          checkedAt: "2026-11-20T00:00:00Z",
          assessmentStatus: "PASS",
          findings: [],
        }}
        canWrite={true}
        canClose={true}
        refreshing={false}
        saved={vi.fn(async () => {})}
      />,
    );

    fireEvent.click(
      screen.getByRole("checkbox", {
        name: /Tôi xác nhận số container/,
      }),
    );
    fireEvent.click(
      screen.getByRole("button", { name: /Đóng niêm và phát hành hồ sơ/ }),
    );

    await screen.findByText(/Thử lại cùng yêu cầu/);
    expect(closeSpy).toHaveBeenCalledTimes(1);
    const originalOpId = closeSpy.mock.calls[0][1].operationId;

    // Simulate reload / navigation by unmounting and mounting fresh instance
    firstMount.unmount();

    mount(
      <ContainerClosureForm
        container={container}
        readiness={{
          phase: "CLOSE",
          checkedAt: "2026-11-20T00:00:00Z",
          assessmentStatus: "PASS",
          findings: [],
        }}
        canWrite={true}
        canClose={true}
        refreshing={false}
        saved={vi.fn(async () => {})}
      />,
    );

    await screen.findByText(/Đã khôi phục yêu cầu chưa rõ kết quả/);
    expect(screen.getByText(new RegExp(originalOpId))).toBeTruthy();

    fireEvent.click(screen.getByRole("button", { name: /Thử lại cùng yêu cầu/ }));
    await waitFor(() => expect(closeSpy).toHaveBeenCalledTimes(2));
    expect(closeSpy.mock.calls[1][1]).toEqual({
      operationId: originalOpId,
      version: 7,
    });
  });

  it("distinguishes 100% target allocation from 0% CLOSED completion on export orders", async () => {
    signIn("CUSTOMER_EXPORT_OFFICER", ["export-orders.read", "containers.read"]);
    vi.spyOn(exportEndpoints, "getOrders").mockResolvedValue(
      page([
        {
          id: "ord-1",
          code: "EXP-100",
          marketId: "EU",
          commodityId: "rice",
          requiredMassKg: "50000",
          shippingFrom: "2026-12-01",
          shippingTo: "2026-12-10",
          createdAt: "2026-11-20T00:00:00Z",
          version: 1,
        },
      ]),
    );
    vi.spyOn(exportEndpoints, "getOrderResource").mockResolvedValue({
      etag: '"1"',
      data: {
        id: "ord-1",
        code: "EXP-100",
        marketId: "EU",
        marketName: "EU",
        commodityId: "rice",
        commodityName: "ST25",
        requiredMassKg: "50000",
        allocatedMassKg: "50000",
        remainingMassKg: "0",
        shippingFrom: "2026-12-01",
        shippingTo: "2026-12-10",
        specificationVersion: 1,
        limits: [],
        canEdit: true,
      },
    });
    vi.spyOn(exportEndpoints, "getContainers").mockResolvedValue(
      page([
        {
          id: "c1",
          orderId: "ord-1",
          internalCode: "CT-1",
          targetMassKg: "25000",
          originalMass: "25000",
          originalUnit: "KG",
          status: "PLANNED",
          version: 1,
        },
        {
          id: "c2",
          orderId: "ord-1",
          internalCode: "CT-2",
          targetMassKg: "25000",
          originalMass: "25000",
          originalUnit: "KG",
          status: "LOADING",
          version: 1,
        },
      ]),
    );

    mount(<ExportOrderDetails orderId="ord-1" />);

    await screen.findByText(/Phân bổ mục tiêu container/);
    expect(screen.getByText("100%")).toBeTruthy();
    expect(screen.getByText("0%")).toBeTruthy();
    expect(screen.getByText(/0 \/ 50\.000 kg đã CLOSED/)).toBeTruthy();
    expect(screen.getByText(/0 \/ 2 container đã đóng niêm/)).toBeTruthy();
  });

  it("generates Packing List from closure dossier and labels document origins", async () => {
    signIn("CUSTOMER_EXPORT_OFFICER", ["containers.write", "containers.read"]);
    const container: ContainerExecution = {
      id: "c-closed",
      orderId: "o-1",
      code: "CT-SEALED",
      companyId: "org-1",
      targetKg: "20000",
      loadedKg: "20000",
      remainingKg: "0",
      status: "CLOSED",
      version: 5,
      facilityId: "fac-1",
      containerNumber: "MSCU111",
      sealNumber: "SEAL-99",
      dossierAvailable: true,
      holds: [],
      loads: [],
      approval: null,
    };
    const dossier: ContainerDossier = {
      schemaVersion: 1,
      containerId: "c-closed",
      orderId: "o-1",
      containerNumber: "MSCU111",
      sealNumber: "SEAL-99",
      targetKg: "20000",
      closedAt: "2026-11-20T05:00:00Z",
      closedBy: "officer",
      assessment: {
        assessmentStatus: "PASS",
        checkedAt: "2026-11-20T05:00:00Z",
        findings: [],
      },
      lines: [
        {
          id: "ln-1",
          lot_id: "lot-out-1",
          location_id: "loc-1",
          quantity_kg: "20000",
        },
      ],
    };
    const workflow: ContainerWorkflowDetail = {
      containerId: "c-closed",
      version: 5,
      status: "CLOSED",
      handoffs: [],
      reviews: [],
      supplements: [],
      documents: [
        {
          id: "d-sys",
          documentType: "PACKING_LIST",
          version: 2,
          filename: "CT-SEALED-packing-list.html",
          contentType: "text/html",
          sha256: "abc",
          reason: "[SYSTEM_GENERATED] Packing List sinh tự động",
          recordedAt: "2026-11-20T06:00:00Z",
        },
        {
          id: "d-upl",
          documentType: "BILL_OF_LADING",
          version: 1,
          filename: "bl.pdf",
          contentType: "application/pdf",
          sha256: "def",
          reason: "[UPLOADED] Uploaded by officer",
          recordedAt: "2026-11-20T06:01:00Z",
        },
        {
          id: "d-leg",
          documentType: "PHYTOSANITARY",
          version: 1,
          filename: "legacy.pdf",
          contentType: "application/pdf",
          sha256: "ghi",
          reason: "Imported record",
          recordedAt: "2026-11-19T00:00:00Z",
        },
      ],
    };
    vi.spyOn(containerExecutionEndpoints, "getDossier").mockResolvedValue(dossier);
    vi.spyOn(containerExecutionEndpoints, "getWorkflow").mockResolvedValue(workflow);
    const genPackingList = vi
      .spyOn(containerExecutionEndpoints, "generatePackingList")
      .mockResolvedValue(workflow);

    mount(
      <ContainerDossierPanel
        container={container}
        canWrite={true}
        saved={vi.fn(async () => {})}
      />,
    );

    await screen.findByText("Hệ thống sinh");
    expect(screen.getByText("Tệp tải lên")).toBeTruthy();
    expect(screen.getByText("Bản cũ chưa rõ nguồn")).toBeTruthy();

    fireEvent.click(
      screen.getByRole("button", {
        name: /Sinh Packing List từ hồ sơ niêm phong/,
      }),
    );
    await waitFor(() => expect(genPackingList).toHaveBeenCalledTimes(1));
    expect(genPackingList).toHaveBeenCalledWith("c-closed", {
      operationId: expect.any(String),
      version: 5,
    });
  });

  it("enforces trace permissions, renders flowchart, plot summary, source evidence, and HOLD actions", async () => {
    signIn("CUSTOMER_EXPORT_OFFICER", ["trace.read.tenant"]);
    const getSetup = vi.spyOn(ledgerEndpoints, "getSetup");
    vi.spyOn(ledgerEndpoints, "getLookups").mockResolvedValue({
      facilities: [{ id: "fac-1", name: "Nhà máy 1" }],
      locations: [{ id: "loc-1", facilityId: "fac-1", name: "Silo A", kind: "SILO" }],
    });
    vi.spyOn(ledgerEndpoints, "getTraceStarts").mockResolvedValue(page([]));

    const exportMount = mount(<TraceabilityPage />, "/?direction=backward");
    const directionSelect = await screen.findByLabelText("Hướng truy vết");
    expect(
      directionSelect.querySelector('option[value="backward"]'),
    ).toBeNull();
    expect((directionSelect as HTMLSelectElement).value).toBe("forward");
    exportMount.unmount();

    // Now as CUSTOMER_MANAGER with source access, flowchart, lab result CTA, & hold placement
    signIn("CUSTOMER_MANAGER", [
      "trace.read.all",
      "holds.manage",
      "residue.evaluate",
    ]);
    vi.spyOn(catalogsEndpoints, "getActiveSubstances").mockResolvedValue(page([]));
    vi.spyOn(ledgerEndpoints, "getResidueEvaluations").mockResolvedValue({
      items: [],
    });
    vi.spyOn(ledgerEndpoints, "traceLot").mockResolvedValue({
      traceId: "trace-uuid-999",
      schemaVersion: 2,
      complete: true,
      asOf: "2026-11-20T00:00:00Z",
      sourceContributionsVisible: true,
      actualContainers: [
        {
          containerId: "cont-1",
          code: "CT-001",
          linkedLoadedKg: "500",
          status: "LOADED",
          held: false,
        },
      ],
      loadingEdges: [
        {
          lotId: "lot-1",
          containerId: "cont-1",
          quantityKg: "800",
          lines: [
            {
              lineId: "ln-1",
              loadId: "ld-1",
              locationId: "loc-1",
              proposalId: "prop-1",
              loadedAt: "2026-11-20T00:00:00Z",
              quantityKg: "800",
              sourceContributions: [{ sourceLotId: "src-1", quantityKg: "500" }],
            },
          ],
        },
      ],
      lots: [
        {
          id: "src-1",
          code: "RAW-001",
          stage: "RAW_PADDY",
          producedKg: "1000",
          quantityKg: "900",
          availableKg: "500",
          restrictions: [],
          positions: [
            {
              locationId: "loc-1",
              locationName: "Silo A",
              quantityKg: "900",
              availableKg: "500",
            },
          ],
        },
        {
          id: "lot-1",
          code: "BLEND-001",
          stage: "BLENDED_RICE",
          producedKg: "800",
          quantityKg: "800",
          availableKg: "800",
          restrictions: [],
          positions: [],
        },
      ],
      edges: [
        {
          inputLotId: "src-1",
          outputLotId: "lot-1",
          operationId: "op-1",
          relationType: "BLENDING",
          inputConsumedKg: "500",
          outputProducedKg: "800",
        },
      ],
      sources: [
        {
          lotId: "src-1",
          provenance: {
            procurementCode: "PO-1",
            plotId: "plot-1",
            farmerId: "f-1",
            riceVariety: "ST25",
          },
        },
      ],
    });
    vi.spyOn(sampleEndpoints, "getSamples").mockResolvedValue(
      page([{ id: "smp-1", sourceLotId: "src-1", code: "SMP-1", sealCode: "SL-1", collectedAt: "2026-11-18T00:00:00Z", materialDescription: null, handoverCount: 1 }]),
    );
    vi.spyOn(labReportEndpoints, "getLabReports").mockResolvedValue(
      page([{ id: "rep-1", companyId: "org-1", laboratoryName: "Eurofins", reportNumber: "LAB-01", issuedOn: "2026-11-19", receivedAt: "2026-11-19T00:00:00Z", reportKind: "MRL", status: "CONFIRMED", confirmedAt: "2026-11-19T01:00:00Z", assessmentStatus: "FAIL", resultSets: [{ id: "rs-1", sampleId: "smp-1", confirmedSampleId: "smp-1", sourceLotId: "src-1", laboratorySampleReference: "LREF", statedSampleCode: "SMP-1", statedSealCode: "SL-1", sectionReference: null, identityStatus: "MATCHED", results: [{ id: "res-1", testLabel: "Tricyclazole", substanceId: null, originalResultText: "0.02 mg/kg", resultKind: "NUMERIC", numericValue: "0.02", unit: "mg/kg", lod: null, loq: "0.01", method: "LC-MS/MS", uncertainty: null, reference: null }] }] }]),
    );

    mount(<TraceabilityPage />, "/?lotId=src-1&direction=forward");

    await screen.findByText(/Trace ID: trace-uuid-999/);
    expect(screen.getByText(/900 \/ 500 kg/)).toBeTruthy();
    expect(screen.getAllByText(/prop-1/).length).toBeGreaterThan(0);

    fireEvent.click(screen.getByRole("button", { name: /Sơ đồ dòng/ }));
    await screen.findByRole("img", { name: /Sơ đồ dòng truy vết/ });
    expect(screen.getByRole("button", { name: /Vừa khung/ })).toBeTruthy();

    fireEvent.click(screen.getByRole("button", { name: /Xem chứng cứ nguồn/ }));
    await screen.findByText("SMP-1");
    expect(await screen.findByText("LAB-01")).toBeTruthy();
    expect(
      screen.getByRole("button", { name: /Truy xuôi từ kết quả/ }),
    ).toBeTruthy();
    expect(getSetup).not.toHaveBeenCalled();
  });

  it("renders plot-level aggregation and ancestry tables on ContainerTracePage", async () => {
    signIn("CUSTOMER_MANAGER", ["trace.read.all", "holds.manage"]);
    const getSetup = vi.spyOn(ledgerEndpoints, "getSetup");
    vi.spyOn(ledgerEndpoints, "getLookups").mockResolvedValue({
      facilities: [{ id: "fac-1", name: "Nhà máy 1" }],
      locations: [],
    });
    const contId = "11111111-1111-4111-8111-111111111111";
    vi.spyOn(containerExecutionEndpoints, "trace").mockResolvedValue({
      traceId: "ct-trace-1",
      schemaVersion: 2,
      loadedKg: "1000",
      complete: true,
      findings: [],
      sourceContributions: [
        {
          sourceLotId: "s1",
          quantityKg: "400",
          percentage: "40",
          provenance: {
            plotId: "plot-a",
            currentReferenceLabels: { plotCode: "THUA-A" },
          },
        },
        {
          sourceLotId: "s2",
          quantityKg: "200",
          percentage: "20",
          provenance: {
            plotId: "plot-a",
            currentReferenceLabels: { plotCode: "THUA-A" },
          },
        },
      ],
      graph: {
        lots: [
          { id: "s1", code: "RAW-1", stage: "RAW_PADDY", producedKg: "400" },
          { id: "s2", code: "RAW-2", stage: "RAW_PADDY", producedKg: "200" },
        ],
        edges: [
          {
            inputLotId: "s1",
            outputLotId: "s2",
            kind: "BLENDING",
            inputConsumedKg: "100",
            outputProducedKg: "100",
          },
        ],
      },
    });

    mount(
      <ContainerTracePage />,
      `/?container=${contId}`,
    );

    await screen.findByText(/Trace ID: ct-trace-1/);
    expect(screen.getByText(/Tổng hợp đóng góp theo thửa ruộng/)).toBeTruthy();
    expect(screen.getByText("60%")).toBeTruthy();
    expect(screen.getByText(/Dòng lô hàng vào container/)).toBeTruthy();
    expect(screen.getByRole("link", { name: /Mở truy vết ngược/ }).getAttribute("href")).toContain(
      "lotId=s1&direction=backward",
    );
    fireEvent.change(screen.getByLabelText("Lô đang xem"), { target: { value: "s2" } });
    expect(screen.getByRole("button", { name: /RAW-1 → 100 kg/ })).toBeTruthy();
    expect(screen.getByText(/Danh sách lô tổ tiên lịch sử/)).toBeTruthy();
    expect(screen.getByText(/Liên kết vật tư lịch sử giữa các lô/)).toBeTruthy();
    expect(getSetup).not.toHaveBeenCalled();
  });

  it("shows Trace forward button on confirmed lab reports in MrlComplianceCheckPage", async () => {
    signIn("CUSTOMER_MANAGER", ["lab.read", "trace.read.all"]);
    vi.spyOn(catalogsEndpoints, "getActiveSubstances").mockResolvedValue(page([]));
    vi.spyOn(labReportEndpoints, "getLabReports").mockResolvedValue(
      page([
        {
          id: "rep-1",
          companyId: "org-1",
          laboratoryName: "SGS",
          reportNumber: "SGS-99",
          issuedOn: "2026-11-20",
          receivedAt: "2026-11-20T00:00:00Z",
          reportKind: "MRL",
          status: "CONFIRMED",
          confirmedAt: "2026-11-20T01:00:00Z",
          assessmentStatus: "PASS",
          resultSets: [
            {
              id: "rs-1",
              sampleId: "smp-1",
              confirmedSampleId: "smp-1",
              sourceLotId: "src-1",
              laboratorySampleReference: "SGS-S1",
              statedSampleCode: "SMP-1",
              statedSealCode: "SEAL-1",
              sectionReference: null,
              identityStatus: "MATCHED",
              results: [
                {
                  id: "res-99",
                  testLabel: "Buprofezin",
                  substanceId: null,
                  originalResultText: "0.005 mg/kg",
                  resultKind: "NUMERIC",
                  numericValue: "0.005",
                  unit: "mg/kg",
                  lod: null,
                  loq: "0.01",
                  method: "LC-MS",
                  uncertainty: null,
                  reference: null,
                },
              ],
            },
          ],
        },
      ]),
    );

    mount(<MrlComplianceCheckPage />);
    fireEvent.click(
      await screen.findByRole("button", { name: /Xem chi tiết & Đối soát/ }),
    );
    const traceLink = await screen.findByRole("link", {
      name: /Truy xuôi từ kết quả/,
    });
    expect(traceLink.getAttribute("href")).toContain(
      "reportId=rep-1&resultId=res-99",
    );
  });

  it("fixes empty HOLD copy, submits real lotId+id in HoldManagementPage, opens CLOSED alerts, and isolates with holdId", async () => {
    signIn("CUSTOMER_MANAGER", ["holds.manage"]);
    vi.spyOn(containerExecutionEndpoints, "getNotifications").mockResolvedValue({ items: [] });
    vi.spyOn(ledgerEndpoints, "getHolds").mockResolvedValue(page([]));
    vi.spyOn(ledgerEndpoints, "getSetup").mockResolvedValue({
      facilities: [{ id: "fac-1", name: "NM 1" }],
      owners: [{ id: "org-1", name: "Owner" }],
    });
    vi.spyOn(ledgerEndpoints, "getLots").mockResolvedValue(
      page([{ id: "real-lot-uuid", code: "LOT-REAL-1", ownerId: "org-1", positions: [{ facilityId: "fac-1" }] }]),
    );
    const createHold = vi.spyOn(ledgerEndpoints, "createHold").mockResolvedValue({ id: "h-new" });

    const holdMount = mount(<HoldManagementPage />);
    await screen.findByText("Không tìm thấy lệnh HOLD lô trong phạm vi hiện tại");
    expect(screen.queryByText(/an toàn và đạt tiêu chuẩn MRL/)).toBeNull();

    fireEvent.click(screen.getByRole("button", { name: /Ban hành Lệnh HOLD mới/i }));
    await screen.findByRole("option", { name: /LOT-REAL-1/ });
    fireEvent.change(await screen.findByLabelText(/Lô áp dụng lệnh HOLD/), {
      target: { value: "real-lot-uuid" },
    });
    fireEvent.change(screen.getByLabelText(/Lý do & căn cứ phong tỏa/), {
      target: { value: "MRL check exceedance" },
    });
    fireEvent.click(screen.getByRole("button", { name: /Xác nhận đặt HOLD/ }));

    await waitFor(() => expect(createHold).toHaveBeenCalledTimes(1));
    expect(createHold.mock.calls[0][0]).toMatchObject({
      id: expect.any(String),
      lotId: "real-lot-uuid",
      reason: "MRL check exceedance",
    });
    holdMount.unmount();

    // CLOSED container alert opens cleanly in ApprovedPlanExecutionPage
    signIn("MILL_MANAGER", ["holds.process", "transfers.write"]);
    vi.spyOn(containerExecutionEndpoints, "getWorkItems").mockResolvedValue({ items: [] });
    vi.spyOn(containerExecutionEndpoints, "getDetail").mockRejectedValue(new ApiError(404, "No execution"));
    vi.spyOn(ledgerEndpoints, "getLookups").mockResolvedValue({
      facilities: [{ id: "fac-1", name: "Mill 1" }],
      locations: [
        { id: "loc-src", facilityId: "fac-1", name: "Kho thường", kind: "WAREHOUSE", cleared: true },
        { id: "loc-iso", facilityId: "fac-1", name: "Kho cách ly", kind: "ISOLATION", cleared: true },
      ],
    });
    vi.spyOn(containerExecutionEndpoints, "getWorkflow").mockResolvedValue({
      containerId: "closed-c",
      version: 9,
      status: "CLOSED",
      documents: [],
      supplements: [],
      reviews: [],
      handoffs: [],
      holds: [{ id: "hold-1", reason: "Lab violation" }],
      holdResponses: [
        {
          id: "hr-1",
          holdId: "hold-1",
          action: "ACKNOWLEDGE",
          reason: "Confirmed sealed",
          evidenceId: "ev-1",
          recordedAt: "2026-11-20T04:00:00Z",
        },
      ],
    });

    const execMount = mount(
      <ApprovedPlanExecutionPage />,
      "/?container=closed-c",
    );
    await screen.findByText(/Confirmed sealed/);
    expect(screen.getByText(/Chuyển kho cách ly \(ISOLATION\) lô bị HOLD/)).toBeTruthy();
    execMount.unmount();

    // ISOLATION transfer with original holdId when availableKg=0
    vi.spyOn(ledgerEndpoints, "getHolds").mockResolvedValue(
      page([{ id: "hold-1", lotId: "lot-held", lotCode: "LOT-HELD", reason: "Hold reason", status: "ACTIVE" }]),
    );
    const getLotsSpy = vi.spyOn(ledgerEndpoints, "getLots").mockResolvedValue(
      page([{ id: "lot-held", code: "LOT-HELD", ownerId: "org-1", positions: [{ locationId: "loc-src", quantityKg: "500", availableKg: "0" }] }]),
    );
    vi.spyOn(ledgerEndpoints, "getLot").mockResolvedValue({
      id: "lot-held",
      code: "LOT-HELD",
      ownerId: "org-1",
      positions: [{ locationId: "loc-src", quantityKg: "500", availableKg: "0" }],
    });
    const postTransfer = vi.spyOn(ledgerEndpoints, "postTransfer").mockResolvedValue({ id: "tr-1" });

    mount(<StockTransferPage />, "/?holdId=hold-1&lotId=lot-held");
    await waitFor(() =>
      expect(getLotsSpy).toHaveBeenCalledWith({
        search: "",
        page: 1,
        pageSize: 30,
      }),
    );
    fireEvent.change(await screen.findByLabelText("Vị trí xuất"), {
      target: { value: "loc-src" },
    });
    const toSelect = screen.getByLabelText("Vị trí nhập");
    expect(toSelect.querySelector('option[value="loc-src"]')).toBeNull();
    fireEvent.change(toSelect, { target: { value: "loc-iso" } });
    fireEvent.change(screen.getByLabelText("Khối lượng điều chuyển (kg)"), {
      target: { value: "250" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Ghi điều chuyển" }));

    await waitFor(() => expect(postTransfer).toHaveBeenCalledTimes(1));
    expect(postTransfer.mock.calls[0][0]).toMatchObject({
      lotId: "lot-held",
      fromLocationId: "loc-src",
      toLocationId: "loc-iso",
      quantityKg: "250",
      holdId: "hold-1",
    });
  });

  it("displays traceId on TRACEBACK ledger events and filters Business History", async () => {
    signIn("CUSTOMER_MANAGER", ["holds.manage", "audit.read"]);
    vi.spyOn(ledgerEndpoints, "getHistory").mockResolvedValue({
      items: [
        {
          id: "trace-evt-1",
          kind: "TRACEBACK",
          postingId: null,
          lotId: "lot-1",
          operationId: null,
          locationId: null,
          ownerId: "org-1",
          ownerName: "Owner",
          actorId: "user-1",
          quantityKg: null,
          reversesPostingId: null,
          occurredAt: "2026-11-20T00:00:00Z",
          details: { direction: "forward" },
        },
      ],
      page: 1,
      pageSize: 25,
      totalCount: 1,
      hasMore: false,
    });
    const getBusinessHistory = vi
      .spyOn(ledgerEndpoints, "getBusinessHistory")
      .mockResolvedValue({
        items: [
          {
            id: "h-1",
            category: "HOLD",
            eventType: "HOLD_PLACED",
            subjectId: "l-1",
            reference: "HOLD-REF-88",
            actorId: "user-1",
            actorName: "Manager",
            recordedAt: "2026-11-21T00:00:00Z",
            context: { reason: "Audit check" },
            evidenceId: null,
          },
        ],
        page: 1,
        pageSize: 25,
        totalCount: 1,
        hasMore: false,
      });

    mount(<EventHistoryPage />);
    await screen.findByText(/Trace ID: trace-evt-1/);

    fireEvent.click(screen.getByRole("button", { name: "Lịch sử nghiệp vụ" }));
    expect((await screen.findAllByText("HOLD-REF-88")).length).toBeGreaterThan(0);

    fireEvent.change(screen.getByLabelText("Nhóm nghiệp vụ"), {
      target: { value: "HOLD" },
    });
    fireEvent.change(screen.getByLabelText("Mã tham chiếu"), {
      target: { value: "HOLD-REF-88" },
    });
    await waitFor(() =>
      expect(getBusinessHistory).toHaveBeenCalledWith(
        expect.objectContaining({
          category: "HOLD",
          search: "HOLD-REF-88",
          page: 1,
          pageSize: 25,
        }),
        expect.anything(),
      ),
    );
    expect((await screen.findAllByText("HOLD-REF-88")).length).toBeGreaterThan(0);
  });

  it("renders GrainLoader instead of plain loading text during bidirectional trace", async () => {
    signIn("CUSTOMER_MANAGER", ["trace.read.all"]);
    const getSetup = vi.spyOn(ledgerEndpoints, "getSetup");
    vi.spyOn(ledgerEndpoints, "getLookups").mockResolvedValue({
      facilities: [{ id: "fac-1", name: "Nhà máy 1" }],
      locations: [],
    });
    vi.spyOn(ledgerEndpoints, "getTraceStarts").mockResolvedValue(page([]));
    vi.spyOn(ledgerEndpoints, "traceLot").mockReturnValue(new Promise(() => {}));

    mount(<TraceabilityPage />, "/?lotId=11111111-1111-4111-8111-111111111111");

    expect(
      await screen.findByText("Đang truy vết dòng di chuyển hai chiều..."),
    ).toBeTruthy();
    expect(screen.queryByText("Đang tải…")).toBeNull();
    expect(getSetup).not.toHaveBeenCalled();
  });

  it("renders affectedPlans, sourceLoadedKg, separated container held/restricted badges, and role-aware container links", async () => {
    signIn("CUSTOMER_MANAGER", ["trace.read.all", "export-orders.read"]);
    vi.spyOn(ledgerEndpoints, "getLookups").mockResolvedValue({ facilities: [], locations: [] });
    vi.spyOn(ledgerEndpoints, "getTraceStarts").mockResolvedValue(page([]));
    vi.spyOn(ledgerEndpoints, "traceLot").mockResolvedValue({
      traceId: "trace-forward-1",
      schemaVersion: 2,
      complete: true,
      asOf: "2026-11-26T00:00:00Z",
      sourceContributionsVisible: true,
      affectedPlans: [
        {
          proposalId: "prop-pre-1",
          planId: "plan-pre-1",
          version: 3,
          containerId: "cont-pre-1",
          containerCode: "CT-PRE-01",
          containerVersion: 1,
          status: "APPROVED",
          activeApproval: true,
          basis: "SAVED_PLANNING",
        },
      ],
      actualContainers: [
        {
          containerId: "cont-act-1",
          code: "CT-ACT-01",
          linkedLoadedKg: "500.000000",
          sourceLoadedKg: "250.000000",
          status: "LOADING",
          version: 2,
          basis: "ACTUAL_LOADING",
          held: false,
          restricted: true,
        },
      ],
      lots: [
        {
          id: "src-lot-1",
          code: "RAW-ST25-01",
          stage: "RAW_PADDY",
          producedKg: "1000",
          restrictions: [],
          positions: [],
        },
      ],
      edges: [],
    });

    const cmMount = mount(<TraceabilityPage />, "/?lotId=src-lot-1&direction=forward");
    await screen.findByText("Phương án bị ảnh hưởng trước khi nạp container");
    expect(screen.getByText("CT-PRE-01")).toBeTruthy();
    expect(screen.getByText(/Quy thuộc từ nguồn đang truy/)).toBeTruthy();
    expect(screen.getByText("250.000000 kg")).toBeTruthy();
    expect(screen.getByText("Lô đã nạp hạn chế")).toBeTruthy();
    expect(screen.queryByText("Container HOLD")).toBeNull();
    expect(screen.getByRole("link", { name: "CT-ACT-01" }).getAttribute("href")).toBe(
      "/risk/container-trace?container=cont-act-1",
    );
    cmMount.unmount();

    // Export Officer cannot open /risk/container-trace, so links go to Export container loading/dossier route
    signIn("CUSTOMER_EXPORT_OFFICER", ["trace.read.tenant", "export-orders.read", "containers.write"]);
    mount(<TraceabilityPage />, "/?lotId=src-lot-1&direction=forward");
    const eoLink = await screen.findByRole("link", { name: "CT-ACT-01" });
    expect(eoLink.getAttribute("href")).toBe("/export/containers/cont-act-1/loading");
  });

  it("allows CustomerManager without containers.write to place container HOLD with evidenceId even when CLOSED", async () => {
    signIn("CUSTOMER_MANAGER", ["holds.manage"]);
    const evidenceUuid = "22222222-2222-4222-8222-222222222222";
    const closedContainer: ContainerExecution = {
      id: "cont-closed-hold",
      orderId: "ord-1",
      code: "CT-CLOSED-HOLD",
      companyId: "org-1",
      targetKg: "20000",
      loadedKg: "20000",
      remainingKg: "0",
      status: "CLOSED",
      version: 11,
      facilityId: "fac-1",
      containerNumber: "MSCU999",
      sealNumber: "SEAL-88",
      dossierAvailable: true,
      holds: [],
      loads: [],
      approval: null,
    };
    vi.spyOn(ledgerEndpoints, "getSetup").mockResolvedValue({
      facilities: [{ id: "fac-1", name: "Mill 1" }],
      owners: [{ id: "org-1", name: "Owner" }],
    });
    vi.spyOn(containerExecutionEndpoints, "getDetail").mockResolvedValue({
      container: closedContainer,
      readiness: {
        phase: "CLOSE",
        checkedAt: "2026-11-26T00:00:00Z",
        assessmentStatus: "PASS",
        findings: [],
      },
    });
    const placeHoldSpy = vi
      .spyOn(containerExecutionEndpoints, "placeHold")
      .mockResolvedValue({ ...closedContainer, status: "HOLD", version: 12 });
    const supplementSpy = vi.spyOn(containerExecutionEndpoints, "addSupplement");

    const modalMount = mount(
      <PlaceHoldModal
        isOpen={true}
        onClose={vi.fn()}
        selectableLots={[]}
        containerContext={{
          containerId: "cont-closed-hold",
          containerCode: "CT-CLOSED-HOLD",
        }}
      />,
    );

    fireEvent.click(await screen.findByRole("button", { name: /^HOLD container$/ }));
    expect(await screen.findByText(/Hỗ trợ đặt HOLD kèm chứng cứ sau CLOSE/)).toBeTruthy();
    fireEvent.change(screen.getByLabelText(/Lý do & căn cứ phong tỏa/), {
      target: { value: "Post-seal recall" },
    });
    fireEvent.change(screen.getByPlaceholderText("00000000-0000-0000-0000-000000000000"), {
      target: { value: evidenceUuid },
    });
    fireEvent.click(screen.getByRole("button", { name: /Xác nhận đặt HOLD/ }));

    await waitFor(() => expect(placeHoldSpy).toHaveBeenCalledTimes(1));
    expect(placeHoldSpy).toHaveBeenCalledWith("cont-closed-hold", {
      operationId: expect.any(String),
      version: 11,
      reason: "Post-seal recall",
      evidenceId: evidenceUuid,
    });
    expect(supplementSpy).not.toHaveBeenCalled();
    modalMount.unmount();

    // ContainerHoldForm also attaches evidenceId on CLOSED containers
    const formMount = mount(
      <ContainerHoldForm container={closedContainer} saved={vi.fn(async () => {})} />,
    );
    fireEvent.change(screen.getByLabelText(/Lý do HOLD/), {
      target: { value: "Direct form HOLD after seal" },
    });
    fireEvent.change(screen.getByLabelText(/Hoặc nhập mã chứng cứ đã lưu/), {
      target: { value: evidenceUuid },
    });
    fireEvent.click(screen.getByRole("button", { name: /Ban hành HOLD/ }));
    await waitFor(() => expect(placeHoldSpy).toHaveBeenCalledTimes(2));
    expect(placeHoldSpy.mock.calls[1]).toEqual([
      "cont-closed-hold",
      {
        operationId: expect.any(String),
        version: 11,
        reason: "Direct form HOLD after seal",
        evidenceId: evidenceUuid,
      },
    ]);
    formMount.unmount();
  });

  it("opens exact affected lot from inherited HOLD notification and sends poolRevision when isolating from mixed-bulk", async () => {
    signIn("MILL_MANAGER", ["holds.process"]);
    useUiStore.setState({ isNotificationsOpen: true });
    vi.spyOn(ledgerEndpoints, "getNotifications").mockResolvedValue({
      items: [
        {
          id: "notif-1",
          holdId: "hold-parent-1",
          lotId: "lot-child-99",
          ownerId: "org-1",
          ownerName: "Rice Corp",
          message: "Inherited HOLD on blended lot",
          createdAt: "2026-11-26T01:00:00Z",
          readAt: null,
        },
      ],
      page: 1,
      pageSize: 20,
      totalCount: 1,
      hasMore: false,
    });

    const bellMount = mount(<NotificationCenter />);
    const isoLink = await screen.findByRole("link", {
      name: /Mở cách ly đúng lô/,
    });
    expect(isoLink.getAttribute("href")).toBe(
      "/stock/transfer?lotId=lot-child-99&holdId=hold-parent-1",
    );
    bellMount.unmount();
    useUiStore.setState({ isNotificationsOpen: false });

    vi.spyOn(ledgerEndpoints, "getLookups").mockResolvedValue({
      facilities: [{ id: "fac-1", name: "Mill 1" }],
      locations: [
        { id: "loc-mixed", facilityId: "fac-1", name: "Silo Trộn", kind: "STORE", cleared: true, mixedBulk: true },
        { id: "loc-iso", facilityId: "fac-1", name: "Kho Cách Ly", kind: "ISOLATION", cleared: true, mixedBulk: false },
      ],
    });
    vi.spyOn(ledgerEndpoints, "getHolds").mockResolvedValue(page([]));
    vi.spyOn(ledgerEndpoints, "getLots").mockResolvedValue(page([]));
    vi.spyOn(ledgerEndpoints, "getLot").mockResolvedValue({
      id: "lot-child-99",
      code: "BLEND-CHILD-99",
      ownerId: "org-1",
      isCurrentPool: true,
      poolRevision: "7",
      positions: [
        {
          locationId: "loc-mixed",
          quantityKg: "400",
          availableKg: "0",
          poolRevision: "7",
        },
      ],
    });
    const postTransfer = vi.spyOn(ledgerEndpoints, "postTransfer").mockResolvedValue({ id: "tr-mixed" });

    mount(<StockTransferPage />, "/?holdId=hold-parent-1&lotId=lot-child-99");
    fireEvent.change(await screen.findByLabelText("Vị trí xuất"), {
      target: { value: "loc-mixed" },
    });
    fireEvent.change(screen.getByLabelText("Vị trí nhập"), {
      target: { value: "loc-iso" },
    });
    fireEvent.change(screen.getByLabelText("Khối lượng điều chuyển (kg)"), {
      target: { value: "400" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Ghi điều chuyển" }));

    await waitFor(() => expect(postTransfer).toHaveBeenCalledTimes(1));
    expect(postTransfer.mock.calls[0][0]).toMatchObject({
      lotId: "lot-child-99",
      fromLocationId: "loc-mixed",
      toLocationId: "loc-iso",
      quantityKg: "400",
      holdId: "hold-parent-1",
      poolRevision: 7,
    });
  });

  it("classifies origin:GENERATED as SYSTEM_GENERATED and calls generatePackingList with separate retry key in ExportDossiersWorkspace", async () => {
    expect(
      classifyDocumentOrigin({
        id: "d-gen",
        documentType: "PACKING_LIST",
        version: 1,
        filename: "CT-packing-list.html",
        contentType: "text/html",
        sha256: "abc",
        reason: "Packing List generated",
        recordedAt: "2026-11-26T00:00:00Z",
        origin: "GENERATED",
      }),
    ).toBe("SYSTEM_GENERATED");

    signIn("CUSTOMER_EXPORT_OFFICER", ["export-orders.read", "containers.write"]);
    const wf: ContainerWorkflowDetail = {
      containerId: "c-dossier-gen",
      version: 9,
      status: "CLOSED",
      documents: [
        {
          id: "doc-gen-1",
          documentType: "PACKING_LIST",
          version: 1,
          filename: "CT-PACKING.html",
          contentType: "text/html",
          sha256: "123",
          reason: "Server generated",
          recordedAt: "2026-11-26T00:00:00Z",
          origin: "GENERATED",
        },
      ],
      supplements: [],
      reviews: [],
      handoffs: [],
    };
    vi.spyOn(containerExecutionEndpoints, "getDossier").mockResolvedValue({
      schemaVersion: 1,
      containerId: "c-dossier-gen",
      orderId: "ord-1",
      containerNumber: "CONT-9",
      sealNumber: "SEAL-9",
      targetKg: "20000",
      closedAt: "2026-11-26T00:00:00Z",
      closedBy: "officer",
      assessment: { assessmentStatus: "PASS", checkedAt: "2026-11-26T00:00:00Z", findings: [] },
      lines: [],
    });
    vi.spyOn(containerExecutionEndpoints, "getWorkflow").mockResolvedValue(wf);
    const genSpy = vi
      .spyOn(containerExecutionEndpoints, "generatePackingList")
      .mockRejectedValueOnce(new ApiError(0, "Network dropped"))
      .mockResolvedValue(wf);
    const addDocSpy = vi.spyOn(containerExecutionEndpoints, "addDocument");

    mount(
      <ExportDossiersWorkspace
        orderId="ord-1"
        params={new URLSearchParams()}
        setParams={vi.fn()}
        scope={["export-dossiers"]}
        containers={[
          {
            id: "c-dossier-gen",
            orderId: "ord-1",
            internalCode: "CT-GEN-9",
            targetMassKg: "20000",
            originalMass: "20000",
            originalUnit: "KG",
            status: "CLOSED",
            version: 9,
          },
        ]}
      />,
    );

    await screen.findByText("Hệ thống sinh");
    expect(screen.queryByText("Bản cũ chưa rõ nguồn")).toBeNull();

    fireEvent.click(screen.getByRole("button", { name: "Sinh Packing List" }));
    await waitFor(() => expect(genSpy).toHaveBeenCalledWith("c-dossier-gen", {
      operationId: expect.any(String),
      version: 9,
    }));
    expect(addDocSpy).not.toHaveBeenCalled();

    // Retry uses export-dossiers key without colliding with ContainerDossierPanel's persistKey
    const sessionKeys = Object.keys(sessionStorage);
    expect(
      sessionKeys.some((k) =>
        k.includes("grainledger.pendingCommand.") &&
        k.endsWith(":export-dossiers:c-dossier-gen:generate-packing-list"),
      ),
    ).toBe(true);
    expect(
      sessionKeys.some((k) => k.endsWith(":container:c-dossier-gen:packing-list")),
    ).toBe(false);

    fireEvent.click(await screen.findByRole("button", { name: /Thử lại cùng yêu cầu/ }));
    await waitFor(() => expect(genSpy).toHaveBeenCalledTimes(2));
    expect(genSpy.mock.calls[1]).toEqual(genSpy.mock.calls[0]);
  });

  it("uses backend completedMassKg and fulfillmentStatus instead of CLOSED container targetMassKg", async () => {
    signIn("CUSTOMER_EXPORT_OFFICER", ["export-orders.read", "containers.read"]);
    vi.spyOn(exportEndpoints, "getOrderResource").mockResolvedValue({
      etag: '"2"',
      data: {
        id: "ord-manifest",
        code: "EXP-MANIFEST",
        marketId: "EU",
        commodityId: "rice",
        requiredMassKg: "50000",
        allocatedMassKg: "50000",
        remainingMassKg: "0",
        completedMassKg: "20000",
        fulfillmentStatus: "IN_PROGRESS",
        shippingFrom: "2026-12-01",
        shippingTo: "2026-12-10",
        createdAt: "2026-11-26T00:00:00Z",
        version: 2,
        specificationVersion: 1,
        limits: [],
        canEdit: true,
      },
    });
    vi.spyOn(exportEndpoints, "getContainers").mockResolvedValue(
      page([
        {
          id: "c-closed-partial",
          orderId: "ord-manifest",
          internalCode: "CT-PARTIAL",
          targetMassKg: "50000",
          originalMass: "50000",
          originalUnit: "KG",
          status: "CLOSED",
          version: 4,
        },
      ]),
    );

    mount(<ExportOrderDetails orderId="ord-manifest" />);
    await screen.findByText(/20\.000 \/ 50\.000 kg/);
    expect(screen.getByText("40%")).toBeTruthy();
    expect(screen.getByText("Đang đóng niêm")).toBeTruthy();
    expect(screen.queryByText("Đã hoàn thành")).toBeNull();
  });

  it("renders ResidueBounds synchronized card UI, previews residue calculation, and loads saved history", async () => {
    signIn("CUSTOMER_MANAGER", ["residue.evaluate"]);
    vi.spyOn(ledgerEndpoints, "getResidueEvaluations").mockResolvedValue({
      items: [
        {
          id: "eval-saved-1",
          snapshotAt: "2026-11-26T00:00:00Z",
          persistedAt: "2026-11-26T00:01:00Z",
          engineVersion: "residue-engine-v2",
        },
      ],
    });
    vi.spyOn(catalogsEndpoints, "getActiveSubstances").mockResolvedValue(
      page([
        {
          id: "sub-1",
          code: "TRICYCLAZOLE",
          name: "Tricyclazole",
          isActive: true,
        },
        {
          id: "sub-2",
          code: "BUPROFEZIN",
          name: "Buprofezin",
          isActive: true,
        },
      ]),
    );
    const previewSpy = vi
      .spyOn(ledgerEndpoints, "getResiduePreview")
      .mockResolvedValue({
        snapshotAt: "2026-11-26T01:00:00Z",
        engineVersion: "residue-engine-v2",
        results: [
          {
            substanceId: "sub-1",
            status: "PASS",
            lower: "0.001",
            upper: "0.009",
            unit: "mg/kg",
            reasons: ["Within MRL"],
            provenance: [
              {
                kind: "LAB_REPORT",
                sourceLotId: "src-1",
                reportId: "rep-1",
                resultId: "res-1",
              },
            ],
            rules: [
              {
                id: "rule-1",
                version: 1,
                kind: "MRL_LIMIT",
                evidenceReference: "ev-ref-1",
              },
            ],
          },
        ],
      });

    mount(<ResidueBounds lotId="lot-res-1" />);
    fireEvent.click(screen.getByText("Khoảng dư lượng và lịch sử đánh giá"));

    expect(await screen.findByText(/TRICYCLAZOLE/)).toBeTruthy();
    fireEvent.change(screen.getByLabelText("Tìm hoạt chất"), {
      target: { value: "TRICYCLAZOLE" },
    });
    expect(screen.queryByText(/BUPROFEZIN/)).toBeNull();

    fireEvent.click(screen.getByRole("checkbox"));
    expect(screen.getByText("1 / 200")).toBeTruthy();

    fireEvent.click(screen.getByRole("button", { name: "Xem trước" }));
    await waitFor(() =>
      expect(previewSpy).toHaveBeenCalledWith("lot-res-1", {
        substanceIds: "sub-1",
      }),
    );
    expect(await screen.findByText("Kết quả xem trước")).toBeTruthy();
    expect(screen.getByText("PASS")).toBeTruthy();
    expect(
      screen.getByRole("link", { name: /Truy vết kết quả lab/ }).getAttribute("href"),
    ).toContain("reportId=rep-1&resultId=res-1");
  });
});
