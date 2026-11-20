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
import { MemoryRouter, useLocation, useRoutes } from "react-router-dom";
import "@/app/i18n";
import { useAuthStore } from "@/app/store/authStore";
import { ApiError } from "@/api/client";
import {
  exportEndpoints,
  type ExportContainerDto,
  type ExportOrderDetail,
  type ExportOrderSummary,
} from "@/api/exports";
import {
  planningEndpoints,
  type BlendPlanDecision,
  type BlendPlanDraftDto,
  type BlendPlanProposal,
} from "@/api/planning";
import { containerExecutionEndpoints } from "@/api/containerExecution";
import { exportRoutes } from "@/features/export/routes";
import { saveExportFile } from "@/features/export/model/saveExportFile";
import { executionFixture } from "../fixtures/containerExecutionData";

vi.mock("@/features/export/model/saveExportFile", () => ({
  saveExportFile: vi.fn(),
}));

const page = <T,>(items: T[]) => ({
  items,
  page: 1,
  pageSize: 100,
  totalCount: items.length,
  hasMore: false,
});
const order: ExportOrderSummary = {
  id: "order",
  code: "EXP-001",
  marketId: "market",
  commodityId: "rice",
  requiredMassKg: "100.000001",
  shippingFrom: "2026-12-01",
  shippingTo: "2026-12-10",
  createdAt: "2026-11-19T03:00:00Z",
  version: 2,
};
const detail: ExportOrderDetail = {
  ...order,
  allocatedMassKg: "60",
  remainingMassKg: "40.000001",
  limits: [
    {
      attributeId: "broken",
      attributeName: "Tỷ lệ tấm",
      minValue: null,
      maxValue: "5",
      unit: "%",
    },
  ],
  specificationVersion: 3,
  canEdit: true,
};
const containers: ExportContainerDto[] = [
  {
    id: "planned",
    orderId: "order",
    internalCode: "CT-PLAN",
    targetMassKg: "20",
    originalMass: "20",
    originalUnit: "KG",
    status: "PLANNED",
    version: 1,
  },
  {
    id: "loading",
    orderId: "order",
    internalCode: "CT-LOAD",
    targetMassKg: "20",
    originalMass: "20",
    originalUnit: "KG",
    status: "LOADING",
    version: 2,
  },
  {
    id: "closed",
    orderId: "order",
    internalCode: "CT-CLOSED",
    targetMassKg: "20",
    originalMass: "20",
    originalUnit: "KG",
    status: "CLOSED",
    version: 3,
  },
];
const draft: BlendPlanDraftDto = {
  id: "plan-42",
  orderId: "order",
  containerId: "loading",
  specificationId: "spec",
  versionNo: 4,
  version: 5,
  status: "DRAFT",
  targetMassKg: "20",
  targetProductIdentity: "RICE-5",
  demandSnapshot: "snapshot",
  createdAt: "2026-11-19T03:00:00Z",
  cancelledAt: null,
  demandCurrent: true,
  canCancel: false,
  hasProposal: true,
};
const proposal: BlendPlanProposal = {
  id: "proposal-42",
  planId: draft.id,
  previewId: "preview",
  proposedAt: draft.createdAt,
  assessment: {
    assessmentStatus: "PASS",
    selection: {
      allocations: [
        {
          lotId: "lot",
          lotCode: "RICE-LOT-1",
          locationId: "SILO-A",
          quantityKg: "20",
        },
      ],
    },
    assessmentFindings: [],
  },
  demandCurrent: true,
  stockAndEvidenceCurrent: true,
  freshness: "CURRENT",
  freshnessReasons: [],
  stockReserved: false,
};
const decision: BlendPlanDecision = {
  planId: draft.id,
  proposalId: proposal.id,
  status: "PENDING",
  decisionVersion: 7,
  actorId: null,
  recordedAt: null,
  reason: null,
  activeApproval: false,
  reservation: {
    status: "NOT_RESERVED",
    reservedKg: "0",
    releasedKg: "0",
    consumedKg: "0",
    remainingKg: "0",
    lines: [],
  },
};
function WorkspaceRoutes() {
  const location = useLocation();
  const routes = useRoutes(exportRoutes);
  return (
    <>
      <output data-testid="workspace-location">
        {location.pathname + location.search}
      </output>
      {routes}
    </>
  );
}
function mount(path: string) {
  const cache = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
  render(
    <QueryClientProvider client={cache}>
      <MemoryRouter initialEntries={[path]}>
        <WorkspaceRoutes />
      </MemoryRouter>
    </QueryClientProvider>,
  );
  return cache;
}
function manager() {
  const user = useAuthStore.getState().user!;
  useAuthStore.setState({
    user: {
      ...user,
      role: "CUSTOMER_MANAGER",
      permissions: [...user.permissions, "blend.approve"],
    },
  });
}
beforeEach(() => {
  useAuthStore.setState({
    isAuthenticated: true,
    accessToken: "test",
    user: {
      id: "export",
      role: "CUSTOMER_EXPORT_OFFICER",
      displayName: "Export",
      email: "export@example.test",
      organizationId: "company",
      isActive: true,
      permissions: [
        "export-orders.read",
        "export-orders.write",
        "blend.propose",
      ],
    },
  });
  vi.spyOn(exportEndpoints, "getOrders").mockResolvedValue(
    page([
      order,
      { ...order, id: "second", code: "EXP-002", requiredMassKg: "0.000002" },
    ]),
  );
  vi.spyOn(exportEndpoints, "getOrderResource").mockImplementation(
    async (id) => ({
      data: { ...detail, id, code: id === "second" ? "EXP-002" : order.code },
      etag: '"v2"',
    }),
  );
  vi.spyOn(exportEndpoints, "getContainers").mockResolvedValue(
    page(containers),
  );
  vi.spyOn(planningEndpoints, "getBlendPlans").mockResolvedValue(page([draft]));
  vi.spyOn(planningEndpoints, "getBlendPlan").mockResolvedValue(draft);
  vi.spyOn(planningEndpoints, "getProposal").mockResolvedValue(proposal);
  vi.spyOn(planningEndpoints, "getDecision").mockResolvedValue(decision);
  vi.spyOn(containerExecutionEndpoints, "getDossier").mockImplementation(
    async (id) => ({
      schemaVersion: 1,
      containerId: id,
      orderId: "order",
      containerNumber: `NUMBER-${id}`,
      sealNumber: `SEAL-${id}`,
      targetKg: "20",
      closedAt: "2026-11-19T03:00:00Z",
      closedBy: "export",
      redacted: true,
      assessment: {
        assessmentStatus: "PASS",
        checkedAt: "2026-11-19T03:00:00Z",
        findings: [],
      },
      lines: [],
    }),
  );
  vi.spyOn(containerExecutionEndpoints, "getWorkflow").mockResolvedValue({
    containerId: "closed",
    version: 3,
    documents: [],
    supplements: [],
    reviews: [],
    handoffs: [],
  });
});
afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
  useAuthStore.setState({
    isAuthenticated: false,
    user: null,
    accessToken: null,
  });
});

describe("Export workspaces", () => {
  it("opens document management from the archive in a modal without leaving the selected dossier", async () => {
    vi.spyOn(containerExecutionEndpoints, "getDetail").mockResolvedValue({
      container: {
        ...executionFixture.container,
        id: "closed",
        orderId: "order",
        code: "CT-CLOSED",
        status: "CLOSED",
        dossierAvailable: true,
        targetKg: "20",
        loadedKg: "20",
        remainingKg: "0",
        containerNumber: "NUMBER-closed",
        sealNumber: "SEAL-closed",
      },
      readiness: executionFixture.readiness,
    });
    vi.spyOn(containerExecutionEndpoints, "getHistory").mockResolvedValue(
      page([]),
    );
    mount("/export/dossiers?order=order&container=closed");
    fireEvent.click(
      await screen.findByRole("link", { name: "Chi tiết & chứng từ" }),
    );
    const dialog = await screen.findByRole("dialog", {
      name: "Hồ sơ theo container",
    });
    await within(dialog).findByText(
      "Hồ sơ được hiển thị theo phạm vi quyền xuất khẩu.",
    );
    expect(containerExecutionEndpoints.getDetail).toHaveBeenCalledWith(
      "closed",
    );
    expect(screen.getByTestId("workspace-location").textContent).toBe(
      "/export/dossiers?order=order&container=closed",
    );
    fireEvent.click(
      within(dialog).getByRole("button", { name: "Đóng thao tác" }),
    );
    expect(screen.queryByRole("dialog")).toBeNull();
    expect(screen.getByRole("heading", { name: "CT-CLOSED" })).toBeTruthy();
  });
  it("opens a plan in a modal and changes its version locally while retaining the list filter and URL", async () => {
    vi.mocked(planningEndpoints.getBlendPlans).mockResolvedValue(
      page([
        draft,
        {
          ...draft,
          id: "plan-old",
          versionNo: 2,
          status: "CANCELLED",
          hasProposal: false,
        },
      ]),
    );
    vi.spyOn(exportEndpoints, "getContainer").mockResolvedValue(containers[1]);
    vi.spyOn(exportEndpoints, "getPlanningContext").mockResolvedValue({
      orderVersion: 2,
      containerVersion: 2,
      canCreateDraft: false,
      allowedTargetProducts: [],
      missingDependencies: [],
    });
    mount("/export/plans?order=order&container=loading");
    fireEvent.change(await screen.findByLabelText("Lọc phiên bản"), {
      target: { value: "PROPOSED" },
    });
    fireEvent.click(
      await screen.findByRole("link", { name: /Xem phương án.*v4/ }),
    );
    const dialog = await screen.findByRole("dialog", {
      name: "Phương án phối trộn",
    });
    const version = await within(dialog).findByLabelText("Chọn phiên bản");
    fireEvent.change(version, { target: { value: "plan-old" } });
    expect((version as HTMLSelectElement).value).toBe("plan-old");
    expect(screen.getByTestId("workspace-location").textContent).toBe(
      "/export/plans?order=order&container=loading",
    );
    fireEvent.click(
      within(dialog).getByRole("button", { name: "Đóng thao tác" }),
    );
    expect(screen.queryByRole("dialog")).toBeNull();
    expect(
      (screen.getByLabelText("Lọc phiên bản") as HTMLSelectElement).value,
    ).toBe("PROPOSED");
  });
  it("keeps manager confirmations inside the proposal modal and cancelling them leaves the workspace in place", async () => {
    manager();
    const send = vi.spyOn(planningEndpoints, "approvePlan").mockResolvedValue({
      ...decision,
      status: "APPROVED",
      activeApproval: true,
    });
    mount("/export/plans?order=order&container=loading");
    fireEvent.click(
      await screen.findByRole("link", { name: /Xem đề xuất.*v4/ }),
    );
    const dialog = await screen.findByRole("dialog", {
      name: "Chi tiết đề xuất phối trộn",
    });
    const approve = await within(dialog).findByRole("button", {
      name: "Phê duyệt phương án",
    });
    await waitFor(() =>
      expect((approve as HTMLButtonElement).disabled).toBe(false),
    );
    fireEvent.click(approve);
    const confirmation = screen.getByRole("dialog", {
      name: "Phê duyệt phương án",
    });
    fireEvent(confirmation, new Event("cancel", { cancelable: true }));
    expect(
      screen.queryByRole("dialog", { name: "Phê duyệt phương án" }),
    ).toBeNull();
    expect(
      screen.getByRole("dialog", { name: "Chi tiết đề xuất phối trộn" }),
    ).toBeTruthy();
    expect(send).not.toHaveBeenCalled();
    fireEvent.click(approve);
    fireEvent.click(
      within(
        screen.getByRole("dialog", { name: "Phê duyệt phương án" }),
      ).getByRole("button", { name: "Phê duyệt phương án" }),
    );
    await waitFor(() =>
      expect(send).toHaveBeenCalledWith("plan-42", {
        operationId: expect.any(String),
        proposalId: "proposal-42",
        expectedDecisionVersion: 7,
      }),
    );
    expect(screen.getByTestId("workspace-location").textContent).toBe(
      "/export/plans?order=order&container=loading",
    );
  });
  it("previews only the selected closed record and switches snapshots without reading open-container dossiers", async () => {
    vi.mocked(exportEndpoints.getContainers).mockResolvedValue(
      page([
        ...containers,
        { ...containers[2], id: "closed-2", internalCode: "CT-CLOSED-2" },
      ]),
    );
    mount("/export/dossiers?order=order");
    await screen.findByText("SEAL-closed");
    expect(containerExecutionEndpoints.getDossier).toHaveBeenCalledTimes(1);
    expect(containerExecutionEndpoints.getDossier).toHaveBeenCalledWith(
      "closed",
    );
    const record = screen.getByRole("button", {
      name: /CT-CLOSED-2.*Xem hồ sơ/,
    });
    fireEvent.click(record);
    await screen.findByText("SEAL-closed-2");
    expect(record.getAttribute("aria-pressed")).toBe("true");
    expect(
      screen
        .getByRole("link", { name: "Chi tiết & chứng từ" })
        .getAttribute("href"),
    ).toBe("/export/containers/closed-2/dossier");
    expect(
      vi
        .mocked(containerExecutionEndpoints.getDossier)
        .mock.calls.map((call) => call[0]),
    ).toEqual(["closed", "closed-2"]);
  });
  it("shows latest document versions by default, filters types and downloads the original snapshot and selected file", async () => {
    const file = {
      id: "packing-v2",
      documentType: "PACKING_LIST",
      version: 2,
      filename: "Packing-signed.pdf",
      contentType: "application/pdf",
      sha256: "hash",
      reason: "Signed",
      recordedAt: "2026-11-19T03:00:00Z",
    };
    vi.mocked(containerExecutionEndpoints.getWorkflow).mockResolvedValue({
      containerId: "closed",
      version: 3,
      documents: [
        file,
        {
          ...file,
          id: "packing-v1",
          version: 1,
          filename: "Packing-draft.pdf",
        },
        {
          ...file,
          id: "coa",
          documentType: "CERTIFICATE_OF_ANALYSIS",
          version: 1,
          filename: "Analysis.pdf",
        },
      ],
      supplements: [],
      reviews: [],
      handoffs: [],
    });
    const snapshot = new Blob(['{"quantity_kg":99999999999999.000001}'], {
      type: "application/json",
    });
    const document = new Blob(["signed"], { type: "application/pdf" });
    const snapshotRequest = vi
      .spyOn(containerExecutionEndpoints, "downloadDossier")
      .mockResolvedValue(snapshot);
    const documentRequest = vi
      .spyOn(containerExecutionEndpoints, "downloadDocument")
      .mockResolvedValue(document);
    mount("/export/dossiers?order=order&container=closed");
    await screen.findByText("Packing-signed.pdf");
    expect(screen.queryByText("Packing-draft.pdf")).toBeNull();
    fireEvent.click(screen.getByLabelText("Hiện tất cả phiên bản"));
    expect(screen.getByText("Packing-draft.pdf")).toBeTruthy();
    fireEvent.change(screen.getByLabelText("Loại chứng từ"), {
      target: { value: "PACKING_LIST" },
    });
    expect(screen.queryByText("Analysis.pdf")).toBeNull();
    fireEvent.click(
      screen.getByRole("button", { name: "Tải Packing-signed.pdf v2" }),
    );
    await waitFor(() =>
      expect(documentRequest).toHaveBeenCalledWith("closed", "packing-v2"),
    );
    await waitFor(() =>
      expect(saveExportFile).toHaveBeenCalledWith(
        document,
        "Packing-signed.pdf",
      ),
    );
    const download = screen.getByRole("button", { name: "Tải snapshot" });
    await waitFor(() =>
      expect((download as HTMLButtonElement).disabled).toBe(false),
    );
    fireEvent.click(download);
    await waitFor(() => expect(snapshotRequest).toHaveBeenCalledWith("closed"));
    await waitFor(() =>
      expect(saveExportFile).toHaveBeenCalledWith(
        snapshot,
        "CT-CLOSED-dossier.json",
      ),
    );
  });
  it("reports document read failures while retaining the issued snapshot", async () => {
    vi.mocked(containerExecutionEndpoints.getWorkflow).mockRejectedValue(
      new Error("Documents unavailable"),
    );
    mount("/export/dossiers?order=order&container=closed");
    await screen.findByText("SEAL-closed");
    expect((await screen.findByRole("alert")).textContent).toContain(
      "Documents unavailable",
    );
    expect(
      screen.queryByText(
        "Chưa có chứng từ đính kèm. Mở hồ sơ chi tiết để bổ sung.",
      ),
    ).toBeNull();
    expect(
      screen.getByRole("button", { name: "Tải lại chứng từ" }),
    ).toBeTruthy();
  });
  it("shows real orders, preserves exact decimal totals, searches and changes the selected order", async () => {
    mount("/export/orders?order=order");
    const table = await screen.findByRole("table", {
      name: "Danh sách hợp đồng xuất khẩu",
    });
    expect(within(table).getAllByRole("row")).toHaveLength(3);
    expect(screen.getByText("100,000003")).toBeTruthy();
    fireEvent.change(screen.getByLabelText("Tìm mã đơn hàng"), {
      target: { value: "002" },
    });
    expect(within(table).queryByText("EXP-001")).toBeNull();
    fireEvent.click(
      within(table).getByRole("button", { name: /Xem đơn.*EXP-002/ }),
    );
    const dialog = await screen.findByRole("dialog", {
      name: "Chi tiết đơn hàng",
    });
    await waitFor(() =>
      expect(exportEndpoints.getOrderResource).toHaveBeenCalledWith("second"),
    );
    expect(
      within(dialog)
        .getByRole("link", { name: "Quản lý container" })
        .getAttribute("href"),
    ).toBe("/export/containers?order=second");
    fireEvent.click(within(dialog).getByRole("link", { name: "Quản lý container" }));
    const dispatch = await screen.findByRole("dialog", { name: "Điều phối container" });
    await within(dispatch).findByRole("heading", { name: "CT-LOAD" });
    expect(screen.getByTestId("workspace-location").textContent).toBe("/export/orders?order=order");
    fireEvent.click(within(dispatch).getByRole("button", { name: "Quay lại thao tác trước" }));
    expect(await screen.findByRole("dialog", { name: "Chi tiết đơn hàng" })).toBeTruthy();
  });
  it("lets a read-only admin clear an archive search and track containers in place", async () => {
    const user = useAuthStore.getState().user!;
    useAuthStore.setState({ user: { ...user, role: "MILL_ADMIN", permissions: ["export-orders.read"] } });
    mount("/export/dossiers?order=order");
    const search = await screen.findByLabelText("Tìm mã container");
    fireEvent.change(search, { target: { value: "missing" } });
    fireEvent.click(screen.getByRole("button", { name: "Xóa tìm kiếm" }));
    await screen.findByText("Chưa có chứng từ đính kèm.");
    fireEvent.click(screen.getByRole("link", { name: "Theo dõi container" }));
    const dialog = await screen.findByRole("dialog", { name: "Điều phối container" });
    expect(await within(dialog).findByRole("heading", { name: "CT-LOAD" })).toBeTruthy();
    expect(screen.getByTestId("workspace-location").textContent).toBe("/export/dossiers?order=order");
  });
  it("validates remaining allocation and sends a new container with the viewed ETag", async () => {
    const send = vi
      .spyOn(exportEndpoints, "addContainers")
      .mockResolvedValue({});
    mount("/export/orders?order=order");
    fireEvent.click(
      await screen.findByRole("button", { name: /Xem đơn.*EXP-001/ }),
    );
    const form = await screen.findByRole("form", {
      name: "Thêm container cho đơn hàng",
    });
    const input = within(form).getByLabelText(
      "Khối lượng mục tiêu của container mới (kg)",
    ) as HTMLInputElement;
    fireEvent.change(input, { target: { value: "41" } });
    fireEvent.submit(form);
    expect(input.validationMessage).toContain("không vượt phần còn phân bổ");
    expect(send).not.toHaveBeenCalled();
    fireEvent.change(input, { target: { value: "40.000001" } });
    fireEvent.submit(form);
    await waitFor(() =>
      expect(send).toHaveBeenCalledWith(
        "order",
        {
          operationId: expect.any(String),
          containers: [{ targetMass: "40.000001", unit: "KG" }],
        },
        '"v2"',
      ),
    );
  });
  it("filters containers by lifecycle and opens loading, closure and issued records without bulk execution reads", async () => {
    const execution = vi.spyOn(containerExecutionEndpoints, "getDetail");
    mount("/export/containers?order=order");
    await screen.findByRole("heading", { name: "CT-LOAD" });
    expect(
      screen
        .getByRole("link", { name: /Xếp hàng.*CT-LOAD/ })
        .getAttribute("href"),
    ).toBe("/export/containers/loading/loading");
    expect(
      screen
        .getByRole("link", { name: /Hồ sơ.*CT-CLOSED/ })
        .getAttribute("href"),
    ).toBe("/export/containers/closed/dossier");
    fireEvent.change(screen.getByLabelText("Trạng thái container"), {
      target: { value: "LOADING" },
    });
    expect(screen.queryByRole("heading", { name: "CT-CLOSED" })).toBeNull();
    expect(screen.queryByRole("heading", { name: "CT-PLAN" })).toBeNull();
    expect(execution).not.toHaveBeenCalled();
  });
  it("opens container allocation modal directly from the container page and adds a container with viewed ETag", async () => {
    const send = vi
      .spyOn(exportEndpoints, "addContainers")
      .mockResolvedValue({});
    mount("/export/containers?order=order");
    await screen.findByRole("heading", { name: "CT-LOAD" });

    const allocateButtons = screen.getAllByRole("button", {
      name: "Phân bổ thêm container",
    });
    expect(allocateButtons.length).toBeGreaterThan(0);
    fireEvent.click(allocateButtons[0]);

    const dialog = await screen.findByRole("dialog", {
      name: "Phân bổ thêm container",
    });
    expect(dialog).toBeTruthy();

    const form = await within(dialog).findByRole("form", {
      name: "Thêm container cho đơn hàng",
    });
    const input = within(form).getByLabelText(
      "Khối lượng mục tiêu của container mới (kg)",
    ) as HTMLInputElement;

    fireEvent.change(input, { target: { value: "41" } });
    fireEvent.submit(form);
    expect(input.validationMessage).toContain("không vượt phần còn phân bổ");
    expect(send).not.toHaveBeenCalled();

    fireEvent.change(input, { target: { value: "40.000001" } });
    fireEvent.submit(form);
    await waitFor(() =>
      expect(send).toHaveBeenCalledWith(
        "order",
        {
          operationId: expect.any(String),
          containers: [{ targetMass: "40.000001", unit: "KG" }],
        },
        '"v2"',
      ),
    );
  });
  it("restricts the dossier archive to closed containers and keeps the selected order on its container link", async () => {
    mount("/export/dossiers?order=order&container=closed");
    await screen.findByRole("heading", { name: "CT-CLOSED" });
    expect(screen.queryByRole("heading", { name: "CT-LOAD" })).toBeNull();
    expect(screen.queryByRole("link", { name: /Xếp hàng/ })).toBeNull();
    expect(
      screen
        .getByRole("link", { name: "Theo dõi container" })
        .getAttribute("href"),
    ).toBe("/export/containers?order=order");
    expect(await screen.findByText("SEAL-closed")).toBeTruthy();
    fireEvent.change(screen.getByLabelText("Tìm mã container"), {
      target: { value: "missing" },
    });
    expect(screen.getByText("Không có container phù hợp.")).toBeTruthy();
  });
  it("loads actual plan versions for the container in the URL and links the exact proposal", async () => {
    mount("/export/plans?order=order&container=loading");
    const versions = await screen.findByRole("list", {
      name: "Các phiên bản phương án phối trộn",
    });
    expect(planningEndpoints.getBlendPlans).toHaveBeenCalledWith(
      "loading",
      expect.anything(),
    );
    expect(
      within(versions).getByRole("heading", { name: "RICE-5" }),
    ).toBeTruthy();
    expect(within(versions).getByText("Đã gửi đề xuất")).toBeTruthy();
    expect(within(versions).queryByText("Đã phê duyệt")).toBeNull();
    expect(
      within(versions)
        .getByRole("link", { name: /Xem đề xuất.*v4/ })
        .getAttribute("href"),
    ).toBe("/export/plans/plan-42/review");
    fireEvent.change(screen.getByLabelText("Lọc phiên bản"), {
      target: { value: "DRAFT" },
    });
    expect(screen.getByText("Không có phiên bản phù hợp.")).toBeTruthy();
    fireEvent.change(screen.getByLabelText("Container"), {
      target: { value: "planned" },
    });
    await waitFor(() =>
      expect(planningEndpoints.getBlendPlans).toHaveBeenCalledWith(
        "planned",
        expect.anything(),
      ),
    );
  });
  it("shows API errors without claiming an empty successful plan list", async () => {
    vi.mocked(planningEndpoints.getBlendPlans).mockRejectedValue(
      new Error("Plan read unavailable"),
    );
    mount("/export/plans?order=order&container=loading");
    expect((await screen.findByRole("alert")).textContent).toContain(
      "Plan read unavailable",
    );
    expect(screen.queryByText("Chưa có phương án.")).toBeNull();
  });
  it.each(["CUSTOMER_EXPORT_OFFICER", "MILL_ADMIN"] as const)(
    "honors a direct proposal link and keeps %s read only even with a manager grant",
    async (role) => {
      const user = useAuthStore.getState().user!;
      useAuthStore.setState({
        user: {
          ...user,
          role,
          permissions: [...user.permissions, "blend.approve"],
        },
      });
      mount("/export/plans/plan-42/review");
      await screen.findByText("RICE-LOT-1");
      await screen.findByText("Chờ quyết định");
      expect(planningEndpoints.getBlendPlan).toHaveBeenCalledWith("plan-42");
      expect(planningEndpoints.getDecision).toHaveBeenCalledWith("plan-42");
      expect(exportEndpoints.getOrders).not.toHaveBeenCalled();
      expect(
        screen.queryByRole("button", { name: /Phê duyệt|Từ chối|Thu hồi/ }),
      ).toBeNull();
    },
  );
  it("confirms manager decisions and keeps the exact proposal, version and operation ID when retrying", async () => {
    manager();
    const send = vi
      .spyOn(planningEndpoints, "approvePlan")
      .mockRejectedValueOnce(new ApiError(0, "Connection interrupted"))
      .mockResolvedValue({
        ...decision,
        status: "APPROVED",
        activeApproval: true,
      });
    mount("/export/plans/plan-42/review");
    const approve = await screen.findByRole("button", {
      name: "Phê duyệt phương án",
    });
    await waitFor(() =>
      expect((approve as HTMLButtonElement).disabled).toBe(false),
    );
    fireEvent.click(approve);
    const dialog = screen.getByRole("dialog", { name: "Phê duyệt phương án" });
    expect(send).not.toHaveBeenCalled();
    fireEvent.click(
      within(dialog).getByRole("button", { name: "Phê duyệt phương án" }),
    );
    await screen.findByText("Connection interrupted");
    fireEvent.click(
      within(dialog).getByRole("button", { name: "Phê duyệt phương án" }),
    );
    await waitFor(() => expect(send).toHaveBeenCalledTimes(2));
    expect(send.mock.calls[0]).toEqual([
      "plan-42",
      {
        operationId: expect.any(String),
        proposalId: "proposal-42",
        expectedDecisionVersion: 7,
      },
    ]);
    expect(send.mock.calls[1]).toEqual(send.mock.calls[0]);
  });
  it("does not enable approval when proposal evidence is stale", async () => {
    manager();
    vi.mocked(planningEndpoints.getProposal).mockResolvedValue({
      ...proposal,
      freshness: "STALE",
      stockAndEvidenceCurrent: false,
      freshnessReasons: ["STOCK_CHANGED"],
    });
    mount("/export/plans/plan-42/review");
    const approve = await screen.findByRole("button", {
      name: "Phê duyệt phương án",
    });
    expect((approve as HTMLButtonElement).disabled).toBe(true);
    expect(screen.getByText(/STOCK_CHANGED/)).toBeTruthy();
  });
  it("requires a reason and sends the viewed version when rejecting a proposal", async () => {
    manager();
    const send = vi
      .spyOn(planningEndpoints, "rejectPlan")
      .mockResolvedValue({ ...decision, status: "REJECTED" });
    mount("/export/plans/plan-42/review");
    const reject = await screen.findByRole("button", {
      name: "Từ chối đề xuất",
    });
    await waitFor(() =>
      expect((reject as HTMLButtonElement).disabled).toBe(false),
    );
    fireEvent.click(reject);
    const dialog = screen.getByRole("dialog", { name: "Từ chối đề xuất" });
    expect(
      (
        within(dialog).getByRole("button", {
          name: "Từ chối đề xuất",
        }) as HTMLButtonElement
      ).disabled,
    ).toBe(true);
    fireEvent.change(within(dialog).getByLabelText("Lý do"), {
      target: { value: "Review source quality" },
    });
    fireEvent.click(
      within(dialog).getByRole("button", { name: "Từ chối đề xuất" }),
    );
    await waitFor(() =>
      expect(send).toHaveBeenCalledWith("plan-42", {
        operationId: expect.any(String),
        proposalId: "proposal-42",
        expectedDecisionVersion: 7,
        reason: "Review source quality",
      }),
    );
  });
  it("allows a manager to revoke an active approval without treating its reserved stock as a new proposal", async () => {
    manager();
    vi.mocked(planningEndpoints.getDecision).mockResolvedValue({
      ...decision,
      status: "APPROVED",
      activeApproval: true,
      decisionVersion: 8,
    });
    vi.mocked(planningEndpoints.getProposal).mockResolvedValue({
      ...proposal,
      freshness: "NOT_RECHECKED",
      stockAndEvidenceCurrent: null,
      stockReserved: true,
    });
    const send = vi.spyOn(planningEndpoints, "revokePlan").mockResolvedValue({
      ...decision,
      status: "REVOKED",
      decisionVersion: 9,
    });
    mount("/export/plans/plan-42/review");
    const revoke = await screen.findByRole("button", {
      name: "Thu hồi phê duyệt",
    });
    await waitFor(() =>
      expect((revoke as HTMLButtonElement).disabled).toBe(false),
    );
    expect(
      screen.queryByRole("button", { name: "Phê duyệt phương án" }),
    ).toBeNull();
    fireEvent.click(revoke);
    const dialog = screen.getByRole("dialog", { name: "Thu hồi phê duyệt" });
    fireEvent.change(within(dialog).getByLabelText("Lý do"), {
      target: { value: "Replan container demand" },
    });
    fireEvent.click(
      within(dialog).getByRole("button", { name: "Thu hồi phê duyệt" }),
    );
    await waitFor(() =>
      expect(send).toHaveBeenCalledWith("plan-42", {
        operationId: expect.any(String),
        proposalId: "proposal-42",
        expectedDecisionVersion: 8,
        reason: "Replan container demand",
      }),
    );
  });
});
