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
import {
  MemoryRouter,
  Route,
  Routes,
  useLocation,
  useRoutes,
} from "react-router-dom";
import type { ReactNode } from "react";
import i18n from "@/app/i18n";
import { useAuthStore } from "@/app/store/authStore";
import { ApiError } from "@/api/client";
import {
  containerExecutionEndpoints,
  type ContainerExecutionDetail,
} from "@/api/containerExecution";
import { exportEndpoints } from "@/api/exports";
import { planningEndpoints } from "@/api/planning";
import { catalogsEndpoints } from "@/api/catalogs";
import { getSidebarItems } from "@/app/navigation/sidebarItems";
import { exportRoutes } from "@/features/export/routes";
import { ExportWorkspacePage } from "@/features/export/pages/ExportWorkspacePage";
import { ExportOrderForm } from "@/features/export/components/ExportOrderForm";
import { HoldManagementPage } from "@/features/risk/pages/HoldManagementPage";
import { ledgerEndpoints } from "@/api/ledger";
import {
  ContainerLoadingPage,
  ContainerClosurePage,
  ContainerDossierPage,
} from "@/features/export/pages/ContainerWorkflowPage";
import {
  executionFixture,
  workflowFixture,
} from "../fixtures/containerExecutionData";

const page = <T,>(items: T[]) => ({
  items,
  page: 1,
  pageSize: 100,
  totalCount: items.length,
  hasMore: false,
});
const grants = [
  "export-orders.read",
  "export-orders.write",
  "containers.write",
  "blend.propose",
  "residue.evaluate",
  "mrl.read",
  "history.read",
];
const order = {
  id: "order",
  code: "EXP-001",
  marketId: "market",
  commodityId: "commodity",
  requiredMassKg: "10",
  shippingFrom: "2026-12-01",
  shippingTo: "2026-12-10",
  createdAt: "2026-11-19T03:00:00Z",
  version: 2,
};
let detail: ContainerExecutionDetail;

function mount(ui: ReactNode, path = "/container") {
  const cache = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
  render(
    <QueryClientProvider client={cache}>
      <MemoryRouter initialEntries={[path]}>{ui}</MemoryRouter>
    </QueryClientProvider>,
  );
  return cache;
}
function route(Component: typeof ContainerLoadingPage) {
  return (
    <Routes>
      <Route path="/:id" element={<Component />} />
    </Routes>
  );
}
function ExportRoutes() {
  return useRoutes(exportRoutes);
}
function WorkspaceLocation() {
  const location = useLocation();
  return (
    <output data-testid="workspace-location">
      {location.pathname + location.search}
    </output>
  );
}

beforeEach(() => {
  detail = structuredClone(executionFixture);
  useAuthStore.setState({
    isAuthenticated: true,
    accessToken: "mock-export",
    user: {
      id: "export",
      role: "CUSTOMER_EXPORT_OFFICER",
      displayName: "Export Staff",
      email: "export@example.test",
      organizationId: "company",
      isActive: true,
      permissions: grants,
    },
  });
  vi.spyOn(containerExecutionEndpoints, "getDetail").mockImplementation(
    async () => structuredClone(detail),
  );
  vi.spyOn(containerExecutionEndpoints, "getHistory").mockResolvedValue(
    page([]),
  );
  vi.spyOn(containerExecutionEndpoints, "getWorkflow").mockResolvedValue(
    workflowFixture,
  );
  vi.spyOn(containerExecutionEndpoints, "getNotifications").mockResolvedValue({
    items: [],
  });
  vi.spyOn(planningEndpoints, "getBlendPlans").mockResolvedValue(page([]));
  vi.spyOn(exportEndpoints, "getOrders").mockResolvedValue(page([order]));
  vi.spyOn(exportEndpoints, "getOrderResource").mockResolvedValue({
    data: {
      ...order,
      limits: [],
      allocatedMassKg: "10",
      remainingMassKg: "0",
      specificationVersion: 1,
      canEdit: true,
    },
    etag: '"v2"',
  });
  vi.spyOn(exportEndpoints, "getContainers").mockResolvedValue(
    page([
      {
        id: "container",
        orderId: "order",
        internalCode: "CT-001",
        targetMassKg: "10",
        originalMass: "10",
        originalUnit: "KG",
        status: "PLANNED",
        version: 7,
      },
    ]),
  );
});
afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
  useAuthStore.setState({
    user: null,
    isAuthenticated: false,
    accessToken: null,
  });
});

async function enterLoad(quantity = "4") {
  const input = await screen.findByLabelText("Thực xếp (kg) · RICE-001");
  await waitFor(() => expect((input as HTMLInputElement).disabled).toBe(false));
  fireEvent.change(input, { target: { value: quantity } });
  fireEvent.click(screen.getByLabelText(/Tôi xác nhận đây là khối lượng/));
  return screen.getByRole("form", { name: "Ghi nhận thực xếp" });
}

describe("Export role workflow", () => {
  it("records loading in a modal, blocks closing while pending, and restores the filtered workspace after saving", async () => {
    let release!: () => void;
    const pending = new Promise<void>((resolve) => {
      release = resolve;
    });
    const send = vi
      .spyOn(containerExecutionEndpoints, "recordLoad")
      .mockImplementation(async () => {
        await pending;
        return detail.container;
      });
    mount(
      <>
        <WorkspaceLocation />
        <ExportWorkspacePage view="containers" />
      </>,
      "/export/containers?order=order",
    );
    fireEvent.change(await screen.findByLabelText("Tìm mã container"), {
      target: { value: "CT-" },
    });
    fireEvent.click(
      await screen.findByRole("link", { name: /Xếp hàng.*CT-001/ }),
    );
    const dialog = await screen.findByRole("dialog", {
      name: "Xếp hàng lên container",
    });
    fireEvent.submit(await enterLoad());
    await waitFor(() => expect(send).toHaveBeenCalledTimes(1));
    expect(
      (
        within(dialog).getByRole("button", {
          name: "Đóng thao tác",
        }) as HTMLButtonElement
      ).disabled,
    ).toBe(true);
    fireEvent(dialog, new Event("cancel", { cancelable: true }));
    expect(
      screen.getByRole("dialog", { name: "Xếp hàng lên container" }),
    ).toBeTruthy();
    expect(screen.getByTestId("workspace-location").textContent).toBe(
      "/export/containers?order=order",
    );
    release();
    await waitFor(() =>
      expect(
        (
          within(dialog).getByRole("button", {
            name: "Đóng thao tác",
          }) as HTMLButtonElement
        ).disabled,
      ).toBe(false),
    );
    fireEvent.click(
      within(dialog).getByRole("button", { name: "Đóng thao tác" }),
    );
    await waitFor(() => expect(screen.queryByRole("dialog")).toBeNull());
    expect(
      (screen.getByLabelText("Tìm mã container") as HTMLInputElement).value,
    ).toBe("CT-");
    expect(send.mock.calls[0][1]).toMatchObject({
      version: 7,
      proposalId: "approved-proposal",
      decisionVersion: 3,
      lines: [{ lotId: "lot", locationId: "location", quantityKg: "4" }],
    });
  });
  it("keeps loading edits across modal steps and confirms discarding only the step being left", async () => {
    mount(
      <>
        <WorkspaceLocation />
        <ExportWorkspacePage view="containers" />
      </>,
      "/export/containers?order=order",
    );
    fireEvent.click(
      await screen.findByRole("link", { name: /Xếp hàng.*CT-001/ }),
    );
    await enterLoad("3");
    let dialog = screen.getByRole("dialog", { name: "Xếp hàng lên container" });
    fireEvent.click(within(dialog).getByRole("link", { name: "Niêm phong" }));
    dialog = await screen.findByRole("dialog", { name: "Đóng niêm container" });
    fireEvent.change(await within(dialog).findByLabelText("Số container"), {
      target: { value: "UNSAVED-SEAL-CONTAINER" },
    });
    fireEvent.click(within(dialog).getByRole("link", { name: "Xếp hàng" }));
    dialog = await screen.findByRole("dialog", {
      name: "Xếp hàng lên container",
    });
    expect(
      (
        within(dialog).getByLabelText(
          "Thực xếp (kg) · RICE-001",
        ) as HTMLInputElement
      ).value,
    ).toBe("3");
    fireEvent.click(within(dialog).getByRole("link", { name: "Niêm phong" }));
    dialog = await screen.findByRole("dialog", { name: "Đóng niêm container" });
    expect(
      (within(dialog).getByLabelText("Số container") as HTMLInputElement).value,
    ).toBe("UNSAVED-SEAL-CONTAINER");
    fireEvent.click(
      within(dialog).getByRole("button", { name: "Quay lại thao tác trước" }),
    );
    let confirmation = screen.getByRole("dialog", {
      name: "Bỏ thay đổi chưa lưu?",
    });
    fireEvent.click(
      within(confirmation).getByRole("button", { name: "Tiếp tục chỉnh sửa" }),
    );
    expect(
      (within(dialog).getByLabelText("Số container") as HTMLInputElement).value,
    ).toBe("UNSAVED-SEAL-CONTAINER");
    fireEvent.click(
      within(dialog).getByRole("button", { name: "Quay lại thao tác trước" }),
    );
    confirmation = screen.getByRole("dialog", {
      name: "Bỏ thay đổi chưa lưu?",
    });
    fireEvent.click(
      within(confirmation).getByRole("button", { name: "Bỏ thay đổi" }),
    );
    dialog = await screen.findByRole("dialog", {
      name: "Xếp hàng lên container",
    });
    expect(
      (
        within(dialog).getByLabelText(
          "Thực xếp (kg) · RICE-001",
        ) as HTMLInputElement
      ).value,
    ).toBe("3");
    expect(screen.getByTestId("workspace-location").textContent).toBe(
      "/export/containers?order=order",
    );
  });
  it("creates orders in a modal and keeps edits when a discard confirmation is cancelled", async () => {
    vi.spyOn(catalogsEndpoints, "getMarkets").mockResolvedValue(page([]));
    vi.spyOn(catalogsEndpoints, "getCommodities").mockResolvedValue(page([]));
    vi.spyOn(catalogsEndpoints, "getQualityAttributes").mockResolvedValue(
      page([]),
    );
    vi.spyOn(catalogsEndpoints, "getMeasurementUnits").mockResolvedValue(
      page([]),
    );
    mount(
      <>
        <WorkspaceLocation />
        <ExportWorkspacePage />
      </>,
      "/export/orders?order=order",
    );
    fireEvent.click(
      await screen.findByRole("button", { name: "Thêm đơn hàng" }),
    );
    const dialog = await screen.findByRole("dialog", {
      name: "Tạo đơn xuất khẩu",
    });
    fireEvent.change(
      await within(dialog).findByLabelText("Giao hàng từ ngày"),
      { target: { value: "2026-12-02" } },
    );
    fireEvent.click(
      within(dialog).getByRole("button", { name: "Đóng thao tác" }),
    );
    const confirmation = screen.getByRole("dialog", {
      name: "Bỏ thay đổi chưa lưu?",
    });
    fireEvent(confirmation, new Event("cancel", { cancelable: true }));
    expect(
      screen.queryByRole("dialog", { name: "Bỏ thay đổi chưa lưu?" }),
    ).toBeNull();
    expect(
      (within(dialog).getByLabelText("Giao hàng từ ngày") as HTMLInputElement)
        .value,
    ).toBe("2026-12-02");
    expect(screen.getByTestId("workspace-location").textContent).toBe(
      "/export/orders?order=order",
    );
  });
  it("keeps HOLD actions out of the Export role and displays container alerts", async () => {
    vi.spyOn(ledgerEndpoints, "getHolds").mockResolvedValue(
      page([
        {
          id: "hold",
          lotId: "lot",
          lotCode: "RICE-001",
          reason: "Quality finding",
          status: "ACTIVE",
          ownerId: "company",
          ownerName: "Company",
          response: null,
          createdAt: "2026-11-19T03:00:00Z",
          evidenceId: null,
        },
      ]),
    );
    vi.mocked(containerExecutionEndpoints.getNotifications).mockResolvedValue({
      items: [
        {
          id: "notice",
          holdId: "hold",
          containerId: "container",
          code: "CT-001",
          message: "Container is on HOLD",
          createdAt: "2026-11-19T03:00:00Z",
          readAt: null,
        },
      ],
    });
    mount(<HoldManagementPage />);
    await screen.findByText("Quality finding");
    expect(await screen.findByRole("link", { name: "CT-001" })).toHaveProperty(
      "pathname",
      "/export/containers/container/loading",
    );
    expect(
      screen.queryByRole("button", { name: /Ban hành|Chuyển kho|cách ly/ }),
    ).toBeNull();
  });
  it("shows HOLD read failures instead of reporting an empty successful list", async () => {
    vi.spyOn(ledgerEndpoints, "getHolds").mockRejectedValue(
      new Error("HOLD read unavailable"),
    );
    mount(<HoldManagementPage />);
    expect((await screen.findByRole("alert")).textContent).toContain(
      "HOLD read unavailable",
    );
    expect(
      screen.queryByText("Không có lô hàng nào bị phong toả HOLD"),
    ).toBeNull();
  });
  it("opens the plan menu as its own workspace instead of redirecting to orders", async () => {
    mount(<ExportRoutes />, "/export/plans?order=order");
    expect(
      await screen.findByRole("heading", { name: "Phương án phối trộn" }),
    ).toBeTruthy();
    expect(
      await screen.findByRole("link", { name: "Tạo phương án" }),
    ).toHaveProperty(
      "pathname",
      "/export/orders/order/containers/container/plan",
    );
    expect(await screen.findByText("Chưa có phương án.")).toBeTruthy();
    expect(screen.queryByRole("button", { name: "Thêm đơn hàng" })).toBeNull();
  });
  it("hides export entries and blocks direct routes without read permission", async () => {
    const user = useAuthStore.getState().user!;
    useAuthStore.setState({ user: { ...user, permissions: [] } });
    expect(
      getSidebarItems(user.role, [], i18n.t.bind(i18n), 0).filter((item) =>
        item.path.startsWith("/export/"),
      ),
    ).toEqual([]);
    mount(<ExportRoutes />, "/export/containers/container/loading");
    await screen.findByText("Không có quyền truy cập màn hình này");
    expect(containerExecutionEndpoints.getDetail).not.toHaveBeenCalled();
  });
  it("records actual quantities with the exact container version and approval", async () => {
    const send = vi
      .spyOn(containerExecutionEndpoints, "recordLoad")
      .mockImplementation(async () => {
        detail.container = {
          ...detail.container,
          loadedKg: "4.000000",
          remainingKg: "6.000000",
          version: 8,
          status: "LOADING",
        };
        return detail.container;
      });
    mount(route(ContainerLoadingPage));
    fireEvent.submit(await enterLoad());
    await waitFor(() =>
      expect(send).toHaveBeenCalledWith("container", {
        operationId: expect.any(String),
        version: 7,
        proposalId: "approved-proposal",
        decisionVersion: 3,
        loadedAt: expect.any(String),
        lines: [{ lotId: "lot", locationId: "location", quantityKg: "4" }],
      }),
    );
    await screen.findByText("4.000000 kg");
  });
  it("retries an uncertain load with the original command and version after a background refresh", async () => {
    const send = vi
      .spyOn(containerExecutionEndpoints, "recordLoad")
      .mockRejectedValueOnce(new ApiError(0, "Connection interrupted"))
      .mockResolvedValue(executionFixture.container);
    const cache = mount(route(ContainerLoadingPage));
    fireEvent.submit(await enterLoad());
    await screen.findByText("Connection interrupted");
    cache.setQueryData(["container-execution", "container"], {
      ...detail,
      container: {
        ...detail.container,
        version: 8,
        loadedKg: "4",
        remainingKg: "6",
      },
    });
    fireEvent.click(
      await screen.findByRole("button", { name: "Thử lại cùng yêu cầu" }),
    );
    await waitFor(() => expect(send).toHaveBeenCalledTimes(2));
    expect(send.mock.calls[1]).toEqual(send.mock.calls[0]);
    expect(send.mock.calls[1][1].version).toBe(7);
  });
  it("blocks over-loading before sending a write", async () => {
    const send = vi.spyOn(containerExecutionEndpoints, "recordLoad");
    mount(route(ContainerLoadingPage));
    fireEvent.submit(await enterLoad("11"));
    expect((await screen.findByRole("alert")).textContent).toContain(
      "không vượt bảo lưu",
    );
    expect(send).not.toHaveBeenCalled();
  });
  it("requires re-entry after the reservation snapshot changes", async () => {
    const send = vi.spyOn(containerExecutionEndpoints, "recordLoad");
    const cache = mount(route(ContainerLoadingPage));
    const form = await enterLoad();
    cache.setQueryData(["container-execution", "container"], {
      ...detail,
      container: { ...detail.container, version: 8 },
    });
    await screen.findByRole("button", { name: "Nạp số liệu mới" });
    fireEvent.submit(form);
    expect(send).not.toHaveBeenCalled();
  });
  it("honors HOLD readiness and does not expose manager decisions", async () => {
    detail.readiness = {
      ...detail.readiness,
      assessmentStatus: "INCOMPLETE",
      findings: ["CONTAINER_HOLD"],
    };
    detail.container.holds = [
      {
        id: "hold",
        reason: "Lab restriction",
        recordedAt: "2026-11-19T03:00:00Z",
      },
    ];
    const send = vi.spyOn(containerExecutionEndpoints, "recordLoad");
    mount(route(ContainerLoadingPage));
    await screen.findByText("Container đang có lệnh HOLD.");
    fireEvent.submit(screen.getByRole("form", { name: "Ghi nhận thực xếp" }));
    expect(send).not.toHaveBeenCalled();
    expect(
      screen.queryByRole("button", { name: /Phê duyệt|Từ chối|Thu hồi/ }),
    ).toBeNull();
  });
  it("closes against the actual target and saved seal with a versioned request", async () => {
    detail.container = {
      ...detail.container,
      targetKg: "12.5",
      loadedKg: "12.5",
      remainingKg: "0.000000",
      containerNumber: "TEST-C1",
      sealNumber: "SEAL-1",
      status: "LOADING",
      version: 9,
    };
    detail.readiness.phase = "CLOSE";
    const send = vi
      .spyOn(containerExecutionEndpoints, "close")
      .mockResolvedValue(detail.container);
    mount(route(ContainerClosurePage));
    await screen.findByText("Thông tin niêm phong");
    fireEvent.click(screen.getByLabelText(/Tôi xác nhận số container/));
    fireEvent.submit(screen.getByRole("form", { name: "Đóng niêm container" }));
    await waitFor(() =>
      expect(send).toHaveBeenCalledWith("container", {
        operationId: expect.any(String),
        version: 9,
      }),
    );
  });
  it("does not request a closure snapshot before it has been issued", async () => {
    const send = vi.spyOn(containerExecutionEndpoints, "getDossier");
    mount(route(ContainerDossierPage));
    await screen.findByText(/Chưa có hồ sơ đóng niêm/);
    expect(send).not.toHaveBeenCalled();
  });
  it("loads the server-issued redacted dossier and validates document uploads", async () => {
    detail.container = {
      ...detail.container,
      status: "CLOSED",
      dossierAvailable: true,
    };
    vi.spyOn(containerExecutionEndpoints, "getDossier").mockResolvedValue({
      schemaVersion: 1,
      containerId: "container",
      orderId: "order",
      containerNumber: "TEST-C1",
      sealNumber: "SEAL-1",
      targetKg: "10",
      closedAt: "2026-11-19T03:00:00Z",
      closedBy: "export",
      redacted: true,
      assessment: {
        assessmentStatus: "PASS",
        checkedAt: "2026-11-19T03:00:00Z",
        findings: [],
      },
      lines: [],
    });
    const send = vi
      .spyOn(containerExecutionEndpoints, "addDocument")
      .mockResolvedValue(workflowFixture);
    mount(route(ContainerDossierPage));
    await screen.findByText(
      "Hồ sơ được hiển thị theo phạm vi quyền xuất khẩu.",
    );
    const form = screen.getByRole("form", { name: "Thêm phiên bản chứng từ" });
    // jsdom does not connect fireEvent's File[] to native file-input validity.
    vi.spyOn(form as HTMLFormElement, "reportValidity").mockReturnValue(true);
    fireEvent.change(within(form).getByLabelText("Loại chứng từ"), {
      target: { value: "PACKING_LIST" },
    });
    fireEvent.change(
      within(form).getByLabelText("Tệp chứng từ (tối đa 10 MiB)"),
      {
        target: {
          files: [
            new File(["document"], "packing.txt", { type: "text/plain" }),
          ],
        },
      },
    );
    fireEvent.change(within(form).getByLabelText("Lý do bổ sung phiên bản"), {
      target: { value: "Add signed packing list" },
    });
    fireEvent.submit(form);
    await waitFor(() =>
      expect(send).toHaveBeenCalledWith("container", {
        operationId: expect.any(String),
        version: 7,
        documentType: "PACKING_LIST",
        filename: "packing.txt",
        contentType: "text/plain",
        content: "ZG9jdW1lbnQ=",
        reason: "Add signed packing list",
      }),
    );
  });
  it("keeps open containers out of the issued-dossier list", async () => {
    mount(<ExportWorkspacePage view="dossiers" />);
    await screen.findByText("Chưa có container đã đóng niêm.");
    expect(screen.queryByRole("link", { name: "Hồ sơ" })).toBeNull();
  });
  it("validates order mass and dates and selects the newly created order", async () => {
    vi.spyOn(catalogsEndpoints, "getMarkets").mockResolvedValue(
      page([{ id: "market", code: "EU", name: "Europe" }]),
    );
    vi.spyOn(catalogsEndpoints, "getCommodities").mockResolvedValue(
      page([
        {
          id: "commodity",
          code: "RICE",
          name: "Rice",
          isArchived: false,
          createdBy: null,
          version: 1,
          canEdit: false,
          canDelete: false,
        },
      ]),
    );
    vi.spyOn(catalogsEndpoints, "getQualityAttributes").mockResolvedValue(
      page([{ id: "quality", code: "BROKEN", name: "Broken", unit: "%" }]),
    );
    vi.spyOn(catalogsEndpoints, "getMeasurementUnits").mockResolvedValue(
      page([
        {
          id: "unit",
          code: "kg",
          name: "Kilograms",
          quantityKind: "MASS",
          isDeleted: false,
          createdBy: null,
          version: 1,
          canEdit: false,
          canDelete: false,
        },
      ]),
    );
    const send = vi.spyOn(exportEndpoints, "createOrder").mockResolvedValue({
      ...order,
      id: "new-order",
      limits: [],
      allocatedMassKg: "5",
      remainingMassKg: "5",
      specificationVersion: 1,
      canEdit: true,
    });
    const saved = vi.fn();
    mount(<ExportOrderForm saved={saved} />);
    await screen.findByLabelText("Thị trường");
    fireEvent.change(screen.getByLabelText("Thị trường"), {
      target: { value: "market" },
    });
    fireEvent.change(screen.getByLabelText("Hàng hóa"), {
      target: { value: "commodity" },
    });
    fireEvent.change(screen.getByLabelText("Khối lượng hợp đồng"), {
      target: { value: "10" },
    });
    fireEvent.change(screen.getByLabelText("Giao hàng từ ngày"), {
      target: { value: "2026-12-02" },
    });
    fireEvent.change(screen.getByLabelText("Giao hàng đến ngày"), {
      target: { value: "2026-12-01" },
    });
    fireEvent.change(
      screen.getByLabelText("Khối lượng mục tiêu của container đầu tiên"),
      { target: { value: "5" } },
    );
    fireEvent.change(screen.getByLabelText("Thuộc tính"), {
      target: { value: "quality" },
    });
    fireEvent.change(screen.getByLabelText("Giới hạn trên"), {
      target: { value: "5" },
    });
    const form = screen.getByRole("form", { name: "Tạo đơn xuất khẩu" });
    fireEvent.submit(form);
    expect(send).not.toHaveBeenCalled();
    fireEvent.change(screen.getByLabelText("Giao hàng đến ngày"), {
      target: { value: "2026-12-10" },
    });
    fireEvent.submit(form);
    await waitFor(() => expect(saved).toHaveBeenCalledWith("new-order"));
    expect(send.mock.calls[0][0].unit).toBe("KG");
  });
});
