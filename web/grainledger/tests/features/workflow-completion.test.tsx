import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { MemoryRouter, Route, Routes, matchRoutes } from "react-router-dom";
import type { ReactNode } from "react";
import "@/app/i18n";
import { useAuthStore } from "@/app/store/authStore";
import { ledgerEndpoints, type CorrectionOperation } from "@/api/ledger";
import { exportEndpoints } from "@/api/exports";
import { containerExecutionEndpoints } from "@/api/containerExecution";
import { executionFixture, workflowFixture } from "../fixtures/containerExecutionData";
import { planningEndpoints, type BlendPlanDraftDto } from "@/api/planning";
import { appRoutes } from "@/app/router/routes";
import { CorrectionWorkbench } from "@/features/mill/components/CorrectionWorkbench";
import { CorrectionManagementPage } from "@/features/mill/pages/CorrectionManagementPage";
import { BlendPlanRequestPage } from "@/features/export/pages/BlendPlanRequestPage";
import { ContainerLoadingPage, ContainerClosurePage, ContainerDossierPage } from "@/features/export/pages/ContainerWorkflowPage";
import { ApprovedPlanExecutionPage } from "@/features/mill/pages/ApprovedPlanExecutionPage";
import { TraceabilityPage } from "@/features/risk/pages/TraceabilityPage";
import type { CorrectionRecord } from "@/features/mill/model/correction";
import type { UserRole } from "@/shared/types/roles";

const original: CorrectionOperation = { id: "original", ownerId: "owner", facilityId: "facility", kind: "MILLING", status: "COMMITTED", version: "original-v1", equipmentId: "equipment", occurredAt: "2026-11-19T03:00:00Z", declaredLossKg: "1.000000", inputs: [{ lotId: "input", locationId: "in-location", quantityKg: "10.000000" }], outputs: [{ id: "output", code: "OUT-001", stage: "HEAD_RICE", commodityId: "commodity", locationId: "out-location", quantityKg: "9.000000" }] };
const replacement: CorrectionOperation = { ...original, id: "replacement", status: "DRAFT", version: "reviewed-v2" };
const correction: CorrectionRecord = { id: "correction", operationId: "original", reason: "Wrong mass", status: "PENDING_REVIEW", createdAt: "2026-11-19T03:00:00Z" };
const position = { lotId: "output", locationId: "actual-location", quantityKg: "9.000000" };
const plan: BlendPlanDraftDto = { id: "plan", orderId: "order", containerId: "container", specificationId: "spec", versionNo: 1, version: 1, status: "DRAFT", targetMassKg: "100", targetProductIdentity: "HEAD_RICE", demandSnapshot: "{}", createdAt: "2026-11-19T03:00:00Z", cancelledAt: null, demandCurrent: true, canCancel: true, hasProposal: false };
const container = { id: "container", orderId: "order", internalCode: "CT-001", targetMassKg: "100", originalMass: "100", originalUnit: "KG", status: "PLANNED", version: 2 };
const page = <T,>(items: T[], hasMore = false) => ({ items, hasMore, page: 1, pageSize: 100, totalCount: items.length });

function login(role: UserRole = "MILL_MANAGER", permissions = ["corrections.reconcile"]) {
  useAuthStore.setState({ isAuthenticated: true, accessToken: "test", user: { id: "user", email: "user@example.test", displayName: "User", isActive: true, role, permissions } });
}
function mount(content: ReactNode, entry = "/") {
  const cache = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } });
  render(<QueryClientProvider client={cache}><MemoryRouter initialEntries={[entry]}>{content}</MemoryRouter></QueryClientProvider>);
  return cache;
}
beforeEach(() => {
  login();
  vi.spyOn(ledgerEndpoints, "getOperation").mockImplementation(async id => id === "original" ? original : replacement);
  vi.spyOn(ledgerEndpoints, "getOperations").mockResolvedValue(page([replacement]));
  vi.spyOn(ledgerEndpoints, "getLot").mockResolvedValue({ id: "output", positions: [position] });
  vi.spyOn(ledgerEndpoints, "uploadEvidence").mockResolvedValue({});
  vi.spyOn(exportEndpoints, "getContainer").mockResolvedValue(container);
  vi.spyOn(planningEndpoints, "getBlendPlans").mockResolvedValue(page([plan]));
  vi.spyOn(containerExecutionEndpoints, "getDetail").mockResolvedValue(executionFixture);
  vi.spyOn(containerExecutionEndpoints, "getWorkflow").mockResolvedValue(workflowFixture);
  vi.spyOn(containerExecutionEndpoints, "getHistory").mockResolvedValue(page([]));
});
afterEach(() => { cleanup(); vi.restoreAllMocks(); useAuthStore.setState({ user: null, isAuthenticated: false, accessToken: null }); });

async function evidenceAndReason() {
  fireEvent.change(await screen.findByLabelText("Tệp biên bản / phiếu cân"), { target: { files: [new File(["evidence"], "weighing.txt", { type: "text/plain" })] } });
  fireEvent.click(screen.getByRole("button", { name: "Tải chứng cứ lên" }));
  await screen.findByText(/Đã lưu chứng cứ/);
  fireEvent.change(screen.getByLabelText("Kết luận đối soát / lý do hủy"), { target: { value: "Verified original stock and replacement" } });
}
async function prepareReview() {
  await evidenceAndReason();
  fireEvent.click(screen.getByRole("button", { name: "Tải vị trí tồn kho thực tế hiện tại" }));
  await screen.findByText("actual-location");
  fireEvent.change(screen.getByLabelText("Bản nháp thay thế"), { target: { value: "replacement" } });
  await screen.findByText(/reviewed-v2/);
  const verified = screen.getByLabelText(/Tôi đã kiểm tra mọi vị trí thực tế/);
  await waitFor(() => expect((verified as HTMLInputElement).disabled).toBe(false));
  fireEvent.click(verified);
}

describe("correction package", () => {
  it("binds actual current positions, immutable evidence and the reviewed replacement version", async () => {
    const send = vi.spyOn(ledgerEndpoints, "reconcileCorrection").mockResolvedValue({});
    mount(<CorrectionWorkbench selectedCorrection={correction} onClose={() => {}}/>);
    await prepareReview();
    fireEvent.click(screen.getByRole("button", { name: "Duyệt đối soát" }));
    await waitFor(() => expect(send).toHaveBeenCalledWith("correction", { evidenceId: expect.any(String), reason: "Verified original stock and replacement", reconciliation: [position], replacementOperationId: "replacement", replacementVersion: "reviewed-v2" }));
    expect(ledgerEndpoints.uploadEvidence).toHaveBeenCalledWith(expect.objectContaining({ ownerId: "owner", facilityId: "facility", fileName: "weighing.txt", contentBase64: "ZXZpZGVuY2U=" }));
    await screen.findByText("Đã duyệt đối soát và gắn phiên bản thay thế.");
  });
  it("keeps a server rejection visible and retries the exact reviewed package", async () => {
    const send = vi.spyOn(ledgerEndpoints, "reconcileCorrection").mockRejectedValueOnce(new Error("Replacement review stale")).mockResolvedValue({});
    mount(<CorrectionWorkbench selectedCorrection={correction} onClose={() => {}}/>);
    await prepareReview(); fireEvent.click(screen.getByRole("button", { name: "Duyệt đối soát" }));
    expect((await screen.findByRole("alert")).textContent).toContain("Replacement review stale");
    expect(screen.queryByText("Đã duyệt đối soát và gắn phiên bản thay thế.")).toBeNull();
    fireEvent.click(screen.getByRole("button", { name: "Duyệt đối soát" }));
    await waitFor(() => expect(send).toHaveBeenCalledTimes(2));
    expect(send.mock.calls[1]).toEqual(send.mock.calls[0]);
  });
  it("requires re-verification when the replacement version changes", async () => {
    const cache = mount(<CorrectionWorkbench selectedCorrection={correction} onClose={() => {}}/>);
    await prepareReview();
    cache.setQueryData(["correction-replacement", "replacement"], { ...replacement, version: "changed-v3" });
    await waitFor(() => expect((screen.getByRole("button", { name: "Duyệt đối soát" }) as HTMLButtonElement).disabled).toBe(true));
  });
  it("confirms nonzero replacement variance with evidence and the exact version before reconciliation", async () => {
    login("MILL_MANAGER", ["corrections.reconcile", "conversions.confirm"]);
    let reviewed = { ...replacement, varianceKg: "0.5", confirmedVersion: null as string | null };
    vi.mocked(ledgerEndpoints.getOperation).mockImplementation(async id => id === "original" ? original : reviewed);
    const confirm = vi.spyOn(ledgerEndpoints, "confirmOperation").mockImplementation(async () => { reviewed = { ...reviewed, confirmedVersion: reviewed.version }; return reviewed; });
    mount(<CorrectionWorkbench selectedCorrection={correction} onClose={() => {}}/>);
    await prepareReview();
    expect((screen.getByRole("button", { name: "Duyệt đối soát" }) as HTMLButtonElement).disabled).toBe(true);
    fireEvent.click(screen.getByRole("button", { name: "Xác nhận chênh lệch phiên bản thay thế" }));
    await screen.findByText("Đã xác nhận chênh lệch của phiên bản thay thế.");
    expect(confirm).toHaveBeenCalledWith("replacement", { version: "reviewed-v2", evidenceId: expect.any(String), reason: "Verified original stock and replacement" });
  });
  it("does not allow review after an evidence upload fails", async () => {
    vi.mocked(ledgerEndpoints.uploadEvidence).mockRejectedValue(new Error("Evidence upload failed"));
    mount(<CorrectionWorkbench selectedCorrection={correction} onClose={() => {}}/>);
    fireEvent.change(await screen.findByLabelText("Tệp biên bản / phiếu cân"), { target: { files: [new File(["proof"], "proof.txt")] } });
    fireEvent.click(screen.getByRole("button", { name: "Tải chứng cứ lên" }));
    await screen.findByText("Evidence upload failed");
    expect((screen.getByRole("button", { name: "Duyệt đối soát" }) as HTMLButtonElement).disabled).toBe(true);
  });
  it("requires verified-original confirmation and evidence to cancel even after reconciliation", async () => {
    const send = vi.spyOn(ledgerEndpoints, "cancelCorrection").mockResolvedValue({});
    mount(<CorrectionWorkbench selectedCorrection={{ ...correction, status: "RECONCILED", replacementOperationId: "replacement" }} onClose={() => {}}/>);
    await evidenceAndReason();
    const button = screen.getByRole("button", { name: "Hủy yêu cầu theo chứng cứ" });
    expect((button as HTMLButtonElement).disabled).toBe(true);
    fireEvent.click(screen.getByLabelText(/Chứng cứ xác nhận bản ghi gốc đúng/)); fireEvent.click(button);
    await waitFor(() => expect(send).toHaveBeenCalledWith("correction", { evidenceId: expect.any(String), reason: "Verified original stock and replacement" }));
    expect(screen.queryByRole("button", { name: "Chốt bút toán bù" })).toBeNull();
  });
  it("allows only an authorized operator to commit the bound replacement after confirmation", async () => {
    login("MILL_OPERATOR", ["conversions.write"]);
    const send = vi.spyOn(ledgerEndpoints, "commitCorrection").mockResolvedValue({});
    mount(<CorrectionWorkbench selectedCorrection={{ ...correction, status: "RECONCILED", replacementOperationId: "bound-replacement" }} onClose={() => {}}/>);
    await screen.findByText("Công đoạn gốc bất biến");
    await waitFor(() => expect(screen.queryByText("Đang tải…")).toBeNull());
    fireEvent.click(screen.getByLabelText(/Tôi xác nhận chốt gói/));
    fireEvent.click(screen.getByRole("button", { name: "Chốt bút toán bù" }));
    await waitFor(() => expect(send).toHaveBeenCalledWith("correction", { replacementOperationId: "bound-replacement" }));
    expect(screen.queryByRole("button", { name: "Duyệt đối soát" })).toBeNull();
  });
  it.each(["MILL_ADMIN", "MILL_MANAGER"] as UserRole[])("does not expose commits to %s even with a write grant", async role => {
    login(role, ["conversions.write"]);
    mount(<CorrectionWorkbench selectedCorrection={{ ...correction, status: "RECONCILED", replacementOperationId: "replacement" }} onClose={() => {}}/>);
    await screen.findByText("Công đoạn gốc bất biến");
    expect(screen.queryByRole("button", { name: "Chốt bút toán bù" })).toBeNull();
    expect(screen.queryByRole("button", { name: "Duyệt đối soát" })).toBeNull();
  });
  it("prepares a replacement with new output IDs while retaining original lineage and inputs", async () => {
    login("MILL_OPERATOR", ["conversions.write"]);
    const send = vi.spyOn(ledgerEndpoints, "recordOperation").mockResolvedValue({});
    mount(<CorrectionWorkbench selectedCorrection={correction} onClose={() => {}}/>);
    fireEvent.click(await screen.findByText("Chuẩn bị công đoạn thay thế từ bản gốc"));
    fireEvent.change(screen.getByLabelText("Khối lượng thay thế (kg)"), { target: { value: "8.5" } });
    fireEvent.submit(screen.getByLabelText("Hao hụt khai báo (kg)").closest("form")!);
    await waitFor(() => expect(send).toHaveBeenCalledWith(expect.objectContaining({ id: expect.any(String), ownerId: "owner", facilityId: "facility", inputs: original.inputs, outputs: [expect.objectContaining({ id: expect.not.stringMatching(/^output$/), originalLotId: "output", quantityKg: "8.5" })] })));
    await screen.findByText(/Đã lưu bản nháp thay thế/);
  });
  it("resolves a correction deep link from a later API page", async () => {
    const list = vi.spyOn(ledgerEndpoints, "getCorrections").mockResolvedValueOnce(page([{ ...correction, id: "first" }], true)).mockResolvedValueOnce(page([{ ...correction, id: "later" }]));
    mount(<Routes><Route path="/mill/reconciliations/:id" element={<CorrectionManagementPage/>}/></Routes>, "/mill/reconciliations/later");
    await screen.findByRole("dialog");
    expect(list).toHaveBeenCalledWith({ page: 2, pageSize: 100 });
  });
});

describe("workflow routes", () => {
  it("routes export, preparation, mill work and tracing to explicit screens", () => {
    const paths = ["/export/orders", "/export/orders/order/containers/container/plan", "/export/containers", "/export/containers/container/loading", "/export/containers/container/closure", "/export/dossiers", "/export/containers/container/dossier", "/mill/plan-executions/plan", "/mill/plan-executions", "/risk/traceback", "/risk/container-trace", "/ledger/container-preparation"];
    expect(paths.map(p => matchRoutes(appRoutes, p)?.at(-1)?.route.handle?.kind)).toEqual(paths.map(() => "screen"));
  });
  it.each([ContainerLoadingPage, ContainerClosurePage, ContainerDossierPage])("renders actual execution data without exposing writes to a read-only role", async Component => {
    mount(<Routes><Route path="/:id" element={<Component/>}/></Routes>, "/container");
    await screen.findByText("CT-001");
    expect(screen.queryByText(/Backend chưa cung cấp API/)).toBeNull();
    expect(screen.queryByRole("button", { name: /Chốt|Xác nhận niêm|Phát hành/ })).toBeNull();
  });
  it("does not call export plan APIs under operator permissions", async () => {
    login("MILL_OPERATOR", ["containers.operate", "conversions.write"]);
    const send = vi.spyOn(planningEndpoints, "getBlendPlan");
    const work = vi.spyOn(containerExecutionEndpoints, "getWorkItems").mockResolvedValue({ items: [
      { containerId: "container", code: "CT-001", facilityId: "facility", state: "HANDOFF_AVAILABLE", proposalId: "proposal", mode: "DIRECT_STOCK" },
    ] });
    vi.spyOn(containerExecutionEndpoints, "listProduction").mockResolvedValue({ items: [] });
    vi.spyOn(ledgerEndpoints, "getLookups").mockResolvedValue({});
    mount(<ApprovedPlanExecutionPage/>);
    expect(await screen.findByRole("option", { name: /CT-001/ })).toBeTruthy();
    fireEvent.change(screen.getByRole("combobox", { name: "Container" }), { target: { value: "container" } });
    await screen.findByRole("heading", { name: "Bàn giao, duyệt phạm vi và HOLD" });
    expect(work).toHaveBeenCalled();
    expect(containerExecutionEndpoints.getWorkflow).toHaveBeenCalledWith("container");
    expect(send).not.toHaveBeenCalled();
  });
  it("saves a mill production draft with the approved recipe and current task version", async () => {
    login("MILL_OPERATOR", ["containers.operate", "conversions.write"]);
    vi.spyOn(containerExecutionEndpoints, "getWorkItems").mockResolvedValue({ items: [
      { containerId: "container", code: "CT-001", facilityId: "facility", state: "REQUESTED", proposalId: "proposal", mode: "BLEND_INPUT_STOCK" },
    ] });
    vi.spyOn(containerExecutionEndpoints, "listProduction").mockResolvedValue({ items: [] });
    const task = {
      containerId: "container", state: "REQUESTED", version: 7, facilityId: "facility", ownerId: "owner",
      outputCommodityId: "rice", plannedKg: "100.000000", targetKg: "25.000000",
      inputs: [{ lotId: "lot", lotCode: "LOT-01", locationId: "input", approvedKg: "80.000000", quantityKg: "40.000000", poolRevision: 5 }],
    };
    vi.spyOn(containerExecutionEndpoints, "getProduction").mockResolvedValue(task);
    vi.spyOn(ledgerEndpoints, "getLookups").mockResolvedValue({
      equipment: [{ id: "equipment", name: "Mixer", facilityId: "facility" }],
      locations: [{ id: "output", name: "Output silo", facilityId: "facility", kind: "STORE", mixedBulk: false, ownerId: "owner" }],
    });
    const save = vi.spyOn(containerExecutionEndpoints, "saveProductionDraft").mockResolvedValue(task);
    mount(<ApprovedPlanExecutionPage />, "/mill/plan-executions?container=container");
    fireEvent.change(await screen.findByLabelText("Thiết bị"), { target: { value: "equipment" } });
    fireEvent.change(screen.getByLabelText("Vị trí đầu ra"), { target: { value: "output" } });
    fireEvent.click(screen.getByRole("button", { name: "Lưu bản nháp" }));
    await waitFor(() => expect(save).toHaveBeenCalledWith("container", expect.objectContaining({
      version: 7,
      operationId: expect.any(String),
      draft: expect.objectContaining({
        equipmentId: "equipment",
        ownerId: "owner",
        inputs: [{ lotId: "lot", locationId: "input", quantityKg: "20.000000", poolRevision: 5 }],
        outputs: [expect.objectContaining({ commodityId: "rice", locationId: "output", quantityKg: "25.000000" })],
      }),
    })));
  });
  it("rejects a container/order mismatch before loading planning context", async () => {
    const context = vi.spyOn(exportEndpoints, "getPlanningContext");
    mount(<Routes><Route path="/:orderId/:containerId" element={<BlendPlanRequestPage/>}/></Routes>, "/wrong-order/container");
    expect(await screen.findByRole("alert")).toHaveProperty("textContent", "Container không thuộc đơn hàng này.");
    expect(context).not.toHaveBeenCalled();
    expect(planningEndpoints.getBlendPlans).not.toHaveBeenCalled();
  });
  it("passes a server-owned preview reference when proposing with the current inventory revision", async () => {
    login("CUSTOMER_EXPORT_OFFICER", ["export-orders.read", "blend.propose"]);
    vi.spyOn(exportEndpoints, "getPlanningContext").mockResolvedValue({ orderVersion: 3, containerVersion: 2, canCreateDraft: true, allowedTargetProducts: ["HEAD_RICE"], missingDependencies: [] });
    vi.spyOn(ledgerEndpoints, "getLookups").mockResolvedValue({ facilities: [{ id: "facility", name: "Mill A" }] });
    vi.spyOn(exportEndpoints, "getCandidates").mockResolvedValue({ ...page([]), scopeRevision: "current-scope" });
    const preview = vi.spyOn(planningEndpoints, "previewPlan").mockResolvedValue({ outcome: "PASS", reasons: [], assessmentStatus: "PASS", previewReference: "server-reference", canPropose: true, selection: null, assessmentFindings: [] });
    const propose = vi.spyOn(planningEndpoints, "proposePlan").mockResolvedValue({});
    mount(<Routes><Route path="/:orderId/:containerId" element={<BlendPlanRequestPage/>}/></Routes>, "/order/container?plan=plan");
    fireEvent.change(await screen.findByLabelText("Nhà máy"), { target: { value: "facility" } });
    fireEvent.click(await screen.findByRole("button", { name: "Tính và đánh giá phương án" }));
    fireEvent.click(await screen.findByRole("button", { name: "Gửi đề xuất để duyệt" }));
    await waitFor(() => expect(propose).toHaveBeenCalledWith("plan", { operationId: expect.any(String), previewReference: "server-reference" }));
    expect(preview).toHaveBeenCalledWith("plan", { facilityId: "facility", scopeRevision: "current-scope" });
  });
  it("uses confirmed lab result identifiers for a trace deep link", async () => {
    vi.spyOn(ledgerEndpoints, "getTraceStarts").mockResolvedValue(page([]));
    const trace = vi.spyOn(ledgerEndpoints, "traceLotFromLab").mockResolvedValue({ traceId: "trace", complete: true, asOf: "2026-11-19T03:00:00Z", lots: [], edges: [], sources: [] });
    mount(<TraceabilityPage/>, "/?reportId=report&resultId=result&view=history");
    await screen.findByText(/Đầy đủ/);
    expect(trace).toHaveBeenCalledWith({ reportId: "report", resultId: "result", view: "history" });
  });
  it("renders persisted contribution percentages and current source labels", async () => {
    vi.spyOn(ledgerEndpoints, "getTraceStarts").mockResolvedValue(page([]));
    vi.spyOn(ledgerEndpoints, "traceLot").mockResolvedValue({ complete: true, asOf: "2026-11-19T03:00:00Z", sourceContributionsVisible: true,
      lots: [{ id: "lot", code: "RICE-001", stage: "HEAD_RICE", producedKg: "100", restrictions: [], contributions: [{ sourceLotId: "source", quantityKg: "70", denominatorKg: "100", percentage: "70.000000" }] }], edges: [],
      sources: [{ lotId: "source", provenance: { procurementCode: "PO-001", riceVariety: "ST25", plotId: "plot", currentReferenceLabels: { farmerName: "Farmer A", plotCode: "PLOT-A" } } }] });
    mount(<TraceabilityPage/>, "/?lotId=lot&direction=backward");
    fireEvent.click(await screen.findByText("RICE-001", { selector: "summary" }));
    expect(await screen.findByText("70.000000")).toBeTruthy();
    expect(screen.getByText(/Farmer A · PLOT-A/)).toBeTruthy();
    expect(ledgerEndpoints.traceLot).toHaveBeenCalledWith({ lotId: "lot", direction: "backward", view: "current" });
  });
});
