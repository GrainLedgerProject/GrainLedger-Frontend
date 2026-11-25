import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { MemoryRouter } from "react-router-dom";
import i18n from "@/app/i18n";
import { ledgerEndpoints, type CorrectionOperation, type SetupApiResponse } from "@/api/ledger";
import { useAuthStore } from "@/app/store/authStore";
import { useFeedbackStore } from "@/app/store/feedbackStore";
import { OperationDraftsPage } from "@/features/mill/pages/OperationDraftsPage";

function renderPage() {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
  return render(
    <MemoryRouter>
      <QueryClientProvider client={client}>
        <OperationDraftsPage />
      </QueryClientProvider>
    </MemoryRouter>,
  );
}

const setupFixture: SetupApiResponse = {
  facilities: [{ id: "fac-1", name: "Nhà máy Thốt Nốt", version: "1" }],
  owners: [{ id: "org-1", name: "Công ty Gạo A" }],
  equipment: [{ id: "eq-1", facilityId: "fac-1", name: "Máy sấy tầng 1", version: "1" }],
  locations: [
    { id: "loc-in-1", facilityId: "fac-1", name: "Silo Tươi 1", kind: "STORE", cleared: true, mixedBulk: false, ownerId: "org-1", version: "1" },
    { id: "loc-in-2", facilityId: "fac-1", name: "Silo Tươi 2", kind: "STORE", cleared: true, mixedBulk: false, ownerId: "org-1", version: "1" },
    { id: "loc-out-1", facilityId: "fac-1", name: "Silo Khô 1", kind: "STORE", cleared: true, mixedBulk: false, ownerId: "org-1", version: "1" },
  ],
  commodities: [{ id: "com-1", name: "Lúa ST25" }],
  policies: [
    {
      id: "pol-1",
      facilityId: "fac-1",
      kind: "DRYING",
      tolerancePercent: "2",
      effectiveFrom: "2026-01-01T00:00:00Z",
      evidenceId: "ev-1",
    },
  ],
};

const existingDraft: CorrectionOperation = {
  id: "op-draft-1",
  version: "v-1",
  kind: "DRYING",
  status: "DRAFT",
  ownerId: "org-1",
  facilityId: "fac-1",
  equipmentId: "eq-1",
  occurredAt: "2026-11-25T08:00:00Z",
  declaredLossKg: "10",
  declaredLossReason: "Ẩm bay hơi",
  varianceKg: "0",
  allowedVarianceKg: "20",
  canEdit: true,
  canDelete: true,
  inputs: [
    { lotId: "lot-1", locationId: "loc-in-1", quantityKg: "500" },
    { lotId: "lot-2", locationId: "loc-in-2", quantityKg: "500" },
  ],
  outputs: [
    {
      id: "out-1",
      locationId: "loc-out-1",
      code: "DRY-LOT-01",
      stage: "DRIED_PADDY",
      productIdentity: "DRIED_PADDY",
      commodityId: "com-1",
      quantityKg: "990",
    },
  ],
};

beforeEach(async () => {
  await i18n.changeLanguage("vi");
  useAuthStore.setState({
    isAuthenticated: true,
    user: {
      id: "u-op",
      email: "op@example.com",
      displayName: "Operator",
      role: "MILL_OPERATOR",
      isActive: true,
      permissions: ["conversions.write"],
    },
  });
});

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
  useAuthStore.setState({ user: null, isAuthenticated: false });
  useFeedbackStore.setState({ toasts: [], confirmDialog: null });
});

describe("OperationDraftsPage", () => {
  it("lists drafts, filters by search, and allows opening details and editing a draft", async () => {
    vi.spyOn(ledgerEndpoints, "getSetup").mockResolvedValue(setupFixture);
    vi.spyOn(ledgerEndpoints, "getOperations").mockResolvedValue({
      items: [existingDraft],
      page: 1,
      pageSize: 20,
      totalCount: 1,
      hasMore: false,
    });
    vi.spyOn(ledgerEndpoints, "getOperation").mockResolvedValue(existingDraft);
    vi.spyOn(ledgerEndpoints, "getLots").mockResolvedValue({
      items: [
        {
          id: "lot-1",
          code: "RAW-01",
          stage: "RAW_PADDY",
          commodityId: "com-1",
          productIdentity: "RAW_PADDY",
          positions: [{ facilityId: "fac-1", locationId: "loc-in-1", availableKg: "600", poolRevision: 1 }],
        },
        {
          id: "lot-2",
          code: "RAW-02",
          stage: "RAW_PADDY",
          commodityId: "com-1",
          productIdentity: "RAW_PADDY",
          positions: [{ facilityId: "fac-1", locationId: "loc-in-2", availableKg: "700", poolRevision: 2 }],
        },
      ],
      page: 1,
      pageSize: 100,
      hasMore: false,
    });

    renderPage();

    const draftBtn = await screen.findByRole("button", { name: /DRY-LOT-01/ });
    expect(draftBtn).toBeTruthy();

    const searchBox = screen.getByRole("searchbox");
    fireEvent.change(searchBox, { target: { value: "NOT-FOUND" } });
    expect(screen.queryByRole("button", { name: /DRY-LOT-01/ })).toBeNull();
    fireEvent.click(screen.getByRole("button", { name: "Xóa bộ lọc tìm kiếm" }));

    fireEvent.click(screen.getByRole("button", { name: /DRY-LOT-01/ }));
    expect(await screen.findByText("Chi tiết bản nháp")).toBeTruthy();
    expect(await screen.findByText("Chỉnh sửa công đoạn")).toBeTruthy();
    expect((await screen.findAllByText(/RAW-01/)).length).toBeGreaterThan(0);
    expect(screen.getByText("Đạt điều kiện cân bằng khối lượng")).toBeTruthy();
  });

  it("creates a multi-lot operation draft and shows saved notice", async () => {
    const savedDraft: CorrectionOperation = {
      ...existingDraft,
      id: "op-new-1",
      inputs: [
        { lotId: "lot-1", locationId: "loc-in-1", quantityKg: "300" },
        { lotId: "lot-2", locationId: "loc-in-2", quantityKg: "200" },
      ],
      outputs: [
        {
          id: "out-new-1",
          locationId: "loc-out-1",
          code: "DRY-NEW-01",
          stage: "DRIED_PADDY",
          productIdentity: "DRIED_PADDY",
          commodityId: "com-1",
          quantityKg: "490",
        },
      ],
    };

    vi.spyOn(ledgerEndpoints, "getSetup").mockResolvedValue(setupFixture);
    vi.spyOn(ledgerEndpoints, "getOperations").mockResolvedValue({
      items: [],
      page: 1,
      pageSize: 20,
      totalCount: 0,
      hasMore: false,
    });
    vi.spyOn(ledgerEndpoints, "getOperation").mockResolvedValue(savedDraft);
    vi.spyOn(ledgerEndpoints, "getLots").mockResolvedValue({
      items: [
        {
          id: "lot-1",
          code: "RAW-01",
          stage: "RAW_PADDY",
          commodityId: "com-1",
          productIdentity: "RAW_PADDY",
          positions: [{ facilityId: "fac-1", locationId: "loc-in-1", availableKg: "300", poolRevision: 1 }],
        },
        {
          id: "lot-2",
          code: "RAW-02",
          stage: "RAW_PADDY",
          commodityId: "com-1",
          productIdentity: "RAW_PADDY",
          positions: [{ facilityId: "fac-1", locationId: "loc-in-2", availableKg: "200", poolRevision: 2 }],
        },
      ],
      page: 1,
      pageSize: 100,
      hasMore: false,
    });
    const recordOp = vi.spyOn(ledgerEndpoints, "recordOperation").mockResolvedValue(savedDraft);

    renderPage();

    const newButtons = await screen.findAllByRole("button", { name: "Tạo bản nháp" });
    fireEvent.click(newButtons[0]);

    fireEvent.change(await screen.findByLabelText("Cơ sở"), { target: { value: "fac-1" } });
    fireEvent.change(screen.getByLabelText("Chủ hàng"), { target: { value: "org-1" } });

    await screen.findByRole("option", { name: /RAW-01/ });

    fireEvent.change(screen.getByLabelText(/Thiết bị/), { target: { value: "eq-1" } });

    fireEvent.click(screen.getByRole("button", { name: "Thêm đầu vào" }));
    const lotSelects = screen.getAllByLabelText(/Lô và vị trí/);
    const massInputs = screen.getAllByLabelText(/Khối lượng \(kg\)/);

    fireEvent.change(lotSelects[0], { target: { value: "lot-1:loc-in-1" } });
    fireEvent.change(massInputs[0], { target: { value: "300" } });
    fireEvent.change(lotSelects[1], { target: { value: "lot-2:loc-in-2" } });
    fireEvent.change(massInputs[1], { target: { value: "200" } });

    fireEvent.change(screen.getByLabelText(/Vị trí \*/), { target: { value: "loc-out-1" } });
    fireEvent.change(massInputs[2], { target: { value: "490" } });
    fireEvent.change(screen.getByLabelText(/Hao hụt khai báo/), { target: { value: "10" } });

    expect(screen.getByText("Đạt điều kiện cân bằng khối lượng")).toBeTruthy();

    fireEvent.click(screen.getByRole("button", { name: "Lưu bản nháp" }));

    await waitFor(() =>
      expect(recordOp).toHaveBeenCalledWith(
        expect.objectContaining({
          facilityId: "fac-1",
          ownerId: "org-1",
          kind: "DRYING",
          equipmentId: "eq-1",
          inputs: [
            { lotId: "lot-1", locationId: "loc-in-1", quantityKg: "300", poolRevision: 1 },
            { lotId: "lot-2", locationId: "loc-in-2", quantityKg: "200", poolRevision: 2 },
          ],
          outputs: [
            expect.objectContaining({
              commodityId: "com-1",
              stage: "DRIED_PADDY",
              locationId: "loc-out-1",
              quantityKg: "490",
            }),
          ],
          declaredLossKg: "10",
        }),
      ),
    );

    expect(await screen.findByText("Đã lưu bản nháp. Mở hàng đợi để duyệt hoặc chốt.")).toBeTruthy();
  });

  it("shows read-only details for drafts owned by another operator", async () => {
    const otherDraft: CorrectionOperation = {
      ...existingDraft,
      canEdit: false,
      canDelete: false,
      boundCorrectionId: "corr-1",
    };

    vi.spyOn(ledgerEndpoints, "getSetup").mockResolvedValue(setupFixture);
    vi.spyOn(ledgerEndpoints, "getOperations").mockResolvedValue({
      items: [otherDraft],
      page: 1,
      pageSize: 20,
      totalCount: 1,
      hasMore: false,
    });
    vi.spyOn(ledgerEndpoints, "getOperation").mockResolvedValue(otherDraft);

    renderPage();

    fireEvent.click(await screen.findByRole("button", { name: /DRY-LOT-01/ }));

    expect(await screen.findByText("Bản nháp thuộc một nhân viên khác.")).toBeTruthy();
    expect(screen.getByRole("link", { name: "Mở hồ sơ hiệu chỉnh" })).toBeTruthy();
    expect(screen.queryByText("Chỉnh sửa công đoạn")).toBeNull();
  });

  it("deletes a draft after confirmation", async () => {
    vi.spyOn(ledgerEndpoints, "getSetup").mockResolvedValue(setupFixture);
    vi.spyOn(ledgerEndpoints, "getOperations").mockResolvedValue({
      items: [existingDraft],
      page: 1,
      pageSize: 20,
      totalCount: 1,
      hasMore: false,
    });
    vi.spyOn(ledgerEndpoints, "getOperation").mockResolvedValue(existingDraft);
    vi.spyOn(ledgerEndpoints, "getLots").mockResolvedValue({
      items: [],
      page: 1,
      pageSize: 100,
      hasMore: false,
    });
    const del = vi.spyOn(ledgerEndpoints, "deleteOperation").mockResolvedValue({});
    vi.spyOn(useFeedbackStore.getState(), "openConfirm").mockResolvedValue(true);

    renderPage();

    fireEvent.click(await screen.findByRole("button", { name: /DRY-LOT-01/ }));
    fireEvent.click(await screen.findByRole("button", { name: "Bỏ bản nháp" }));

    await waitFor(() => expect(del).toHaveBeenCalledWith("op-draft-1", { version: "v-1" }));
    expect(await screen.findByText("Đã bỏ bản nháp.")).toBeTruthy();
  });
});
