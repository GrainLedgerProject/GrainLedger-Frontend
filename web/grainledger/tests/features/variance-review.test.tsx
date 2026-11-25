import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { MemoryRouter } from "react-router-dom";
import i18n from "@/app/i18n";
import { ledgerEndpoints, type CorrectionOperation } from "@/api/ledger";
import { useAuthStore } from "@/app/store/authStore";
import { VarianceReviewPage } from "@/features/mill/pages/VarianceReviewPage";

function renderPage() {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
  return render(
    <MemoryRouter>
      <QueryClientProvider client={client}>
        <VarianceReviewPage />
      </QueryClientProvider>
    </MemoryRouter>,
  );
}

beforeEach(async () => {
  await i18n.changeLanguage("vi");
});

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
  useAuthStore.setState({ user: null, isAuthenticated: false });
});

describe("VarianceReviewPage", () => {
  it("denies access without mill conversion permissions", () => {
    useAuthStore.setState({
      isAuthenticated: true,
      user: {
        id: "u-viewer",
        email: "viewer@example.com",
        displayName: "Viewer",
        role: "AUTHORIZED_STOCK_VIEWER",
        isActive: true,
        permissions: ["stock.read"],
      },
    });

    renderPage();

    expect(screen.getByRole("alert")).toBeTruthy();
  });

  it("filters drafts and lets an operator commit a balanced draft", async () => {
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

    const draft: CorrectionOperation = {
      id: "op-draft-1",
      version: "v-1",
      kind: "MILLING",
      status: "DRAFT",
      ownerId: "org-1",
      facilityId: "fac-1",
      equipmentId: "eq-1",
      occurredAt: "2026-11-25T08:00:00Z",
      declaredLossKg: "0",
      varianceKg: "0",
      inputs: [{ lotId: "lot-in-1", locationId: "loc-in", quantityKg: "100" }],
      outputs: [
        {
          id: "out-1",
          locationId: "loc-out",
          code: "RICE-BAL-01",
          stage: "HEAD_RICE",
          commodityId: "com-1",
          quantityKg: "100",
        },
      ],
    };

    vi.spyOn(ledgerEndpoints, "getOperations").mockResolvedValue({
      items: [draft],
      page: 1,
      pageSize: 20,
      totalCount: 1,
      hasMore: false,
    });
    vi.spyOn(ledgerEndpoints, "getLookups").mockResolvedValue({
      facilities: [{ id: "fac-1", name: "Nhà máy Thốt Nốt", version: "1" }],
      locations: [
        { id: "loc-in", facilityId: "fac-1", name: "Silo Nhập", kind: "STORE", cleared: true, mixedBulk: false, ownerId: null, version: "1" },
        { id: "loc-out", facilityId: "fac-1", name: "Kho Thành Phẩm", kind: "STORE", cleared: true, mixedBulk: false, ownerId: null, version: "1" },
      ],
    });
    vi.spyOn(ledgerEndpoints, "getOperation").mockResolvedValue(draft);
    const commit = vi.spyOn(ledgerEndpoints, "commitOperation").mockResolvedValue({});

    renderPage();

    expect(await screen.findByRole("button", { name: /RICE-BAL-01/ })).toBeTruthy();

    const searchBox = screen.getByRole("searchbox");
    fireEvent.change(searchBox, { target: { value: "MISSING-LOT" } });
    expect(screen.queryByRole("button", { name: /RICE-BAL-01/ })).toBeNull();
    fireEvent.click(screen.getByRole("button", { name: "Xóa bộ lọc tìm kiếm" }));

    fireEvent.click(screen.getByRole("button", { name: /RICE-BAL-01/ }));
    expect(await screen.findByText("Silo Nhập", { exact: false })).toBeTruthy();

    fireEvent.click(screen.getByRole("checkbox"));
    fireEvent.click(screen.getByRole("button", { name: "Chốt công đoạn" }));

    await waitFor(() => expect(commit).toHaveBeenCalledWith("op-draft-1", {}));
    expect(await screen.findByText("Đã chốt công đoạn vào sổ cái.")).toBeTruthy();
  });
});
