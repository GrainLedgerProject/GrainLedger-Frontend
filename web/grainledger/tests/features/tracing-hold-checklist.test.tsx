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
import { useAuthStore } from "@/app/store/authStore";
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
import { procurementEndpoints } from "@/api/procurement";
import { configureApiSession } from "@/api/session";
import { EventHistoryPage } from "@/features/audit/pages/EventHistoryPage";
import { MrlComplianceCheckPage } from "@/features/compliance/pages/MrlComplianceCheckPage";
import { ContainerClosureForm } from "@/features/export/components/ContainerClosureForm";
import { ContainerDossierPanel } from "@/features/export/components/ContainerDossierPanel";
import {
  ExportOrderDetails,
} from "@/features/export/components/ExportOrdersWorkspace";
import { ApprovedPlanExecutionPage } from "@/features/mill/pages/ApprovedPlanExecutionPage";
import { StockTransferPage } from "@/features/mill/pages/StockTransferPage";
import { ContainerTracePage } from "@/features/risk/pages/ContainerTracePage";
import { HoldManagementPage } from "@/features/risk/pages/HoldManagementPage";
import { TraceabilityPage } from "@/features/risk/pages/TraceabilityPage";
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
    const addDoc = vi
      .spyOn(containerExecutionEndpoints, "addDocument")
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
    await waitFor(() => expect(addDoc).toHaveBeenCalledTimes(1));
    expect(addDoc.mock.calls[0][1].documentType).toBe("PACKING_LIST");
    expect(addDoc.mock.calls[0][1].reason).toContain("[SYSTEM_GENERATED]");
  });

  it("enforces trace permissions, renders flowchart, plot summary, source evidence, and HOLD actions", async () => {
    signIn("CUSTOMER_EXPORT_OFFICER", ["trace.read.tenant"]);
    vi.spyOn(ledgerEndpoints, "getSetup").mockResolvedValue({
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
  });

  it("renders plot-level aggregation and ancestry tables on ContainerTracePage", async () => {
    signIn("CUSTOMER_MANAGER", ["trace.read.all", "holds.manage"]);
    vi.spyOn(ledgerEndpoints, "getSetup").mockResolvedValue({
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
    expect(screen.getByText(/Danh sách lô tổ tiên lịch sử/)).toBeTruthy();
    expect(screen.getByText(/Liên kết vật tư lịch sử giữa các lô/)).toBeTruthy();
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
    vi.spyOn(procurementEndpoints, "getProcurements").mockResolvedValue(page([]));
    vi.spyOn(sampleEndpoints, "getSamples").mockResolvedValue(page([]));
    vi.spyOn(labReportEndpoints, "getLabReports").mockResolvedValue(page([]));
    vi.spyOn(ledgerEndpoints, "getOperations").mockResolvedValue(page([]));
    vi.spyOn(ledgerEndpoints, "getCorrections").mockResolvedValue(page([]));
    vi.spyOn(ledgerEndpoints, "getHolds").mockResolvedValue(
      page([
        {
          id: "h-1",
          lotId: "l-1",
          lotCode: "HOLD-REF-88",
          reason: "Audit check",
          status: "ACTIVE",
          createdAt: "2026-11-21T00:00:00Z",
          ownerName: "Manager",
        },
      ]),
    );
    vi.spyOn(exportEndpoints, "getOrders").mockResolvedValue(page([]));
    vi.spyOn(containerExecutionEndpoints, "getWorkItems").mockResolvedValue({ items: [] });
    vi.spyOn(containerExecutionEndpoints, "getNotifications").mockResolvedValue({ items: [] });

    mount(<EventHistoryPage />);
    await screen.findByText(/Trace ID: trace-evt-1/);

    fireEvent.click(screen.getByRole("button", { name: "Lịch sử nghiệp vụ" }));
    expect((await screen.findAllByText("HOLD-REF-88")).length).toBeGreaterThan(0);

    fireEvent.change(screen.getByLabelText("Nhóm nghiệp vụ"), {
      target: { value: "QUALITY_HOLD" },
    });
    fireEvent.change(screen.getByLabelText("Mã tham chiếu"), {
      target: { value: "HOLD-REF-88" },
    });
    expect((await screen.findAllByText("HOLD-REF-88")).length).toBeGreaterThan(0);
  });

  it("renders GrainLoader instead of plain loading text during bidirectional trace", async () => {
    signIn("CUSTOMER_MANAGER", ["trace.read.all"]);
    vi.spyOn(ledgerEndpoints, "getSetup").mockResolvedValue({
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
  });
});
