import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  cleanup,
  fireEvent,
  render,
  screen,
  within,
} from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { MemoryRouter, Route, Routes, useLocation } from "react-router-dom";
import i18n from "@/app/i18n";
import { ledgerEndpoints, type SetupApiResponse } from "@/api/ledger";
import { useAuthStore } from "@/app/store/authStore";
import { StockOverviewPage } from "@/features/mill/pages/StockOverviewPage";
import { millPaths } from "@/features/mill/paths";

function LocationEcho() {
  const location = useLocation();
  return <div data-testid="location-echo">{location.pathname + location.search}</div>;
}

function renderStock(initialEntry: string) {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
  return render(
    <MemoryRouter initialEntries={[initialEntry]}>
      <QueryClientProvider client={client}>
        <LocationEcho />
        <Routes>
          <Route path={millPaths.stock} element={<StockOverviewPage />} />
          <Route path={millPaths.lot} element={<StockOverviewPage />} />
        </Routes>
      </QueryClientProvider>
    </MemoryRouter>,
  );
}

const lookupsFixture: SetupApiResponse = {
  facilities: [{ id: "fac-1", name: "Nhà máy Thốt Nốt", version: "1" }],
  locations: [
    {
      id: "loc-1",
      facilityId: "fac-1",
      name: "Silo Khô 1",
      kind: "STORE",
      cleared: true,
      mixedBulk: false,
      ownerId: "org-1",
      version: "1",
    },
  ],
  commodities: [{ id: "com-1", name: "Lúa ST25" }],
  owners: [{ id: "org-1", name: "Công ty Gạo A" }],
};

const lotOne = {
  id: "lot-1",
  code: "DRY-ST25-01",
  stage: "DRIED_PADDY",
  productIdentity: "DRIED_PADDY",
  ownerId: "org-1",
  ownerName: "Công ty Gạo A",
  commodityId: "com-1",
  positions: [
    {
      facilityId: "fac-1",
      locationId: "loc-1",
      quantityKg: "5000",
      availableKg: "4200",
    },
  ],
  restrictions: ["HOLD-QC"],
  sourceComposition: [
    {
      sourceLotId: "lot-src-1",
      sourceLotCode: "RAW-ST25-01",
      quantityKg: "5000",
    },
  ],
  history: {
    items: [
      {
        id: "hist-1",
        postingId: "post-1",
        kind: "LOT_RECEIVED",
        occurredAt: "2026-11-25T08:00:00Z",
        quantityKg: "5000",
      },
    ],
    page: 1,
    pageSize: 20,
    totalCount: 1,
    hasMore: false,
  },
};

const lotSource = {
  id: "lot-src-1",
  code: "RAW-ST25-01",
  stage: "RAW_PADDY",
  productIdentity: "RAW_PADDY",
  ownerId: "org-1",
  commodityId: "com-1",
  positions: [
    {
      facilityId: "fac-1",
      locationId: "loc-1",
      quantityKg: "5000",
      availableKg: "5000",
    },
  ],
  restrictions: [],
};

beforeEach(async () => {
  await i18n.changeLanguage("vi");
  useAuthStore.setState({
    isAuthenticated: true,
    user: {
      id: "u-mgr",
      email: "mgr@example.com",
      displayName: "Manager",
      role: "MILL_MANAGER",
      isActive: true,
      permissions: ["trace.read.tenant"],
    },
  });
});

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

describe("StockOverviewPage", () => {
  it("opens lot details in a modal over the stock table and supports drilling into source composition", async () => {
    vi.spyOn(ledgerEndpoints, "getLookups").mockResolvedValue(lookupsFixture);
    vi.spyOn(ledgerEndpoints, "getLots").mockResolvedValue({
      items: [lotOne],
      page: 1,
      pageSize: 30,
      totalCount: 1,
      hasMore: false,
    });
    const getLotSpy = vi
      .spyOn(ledgerEndpoints, "getLot")
      .mockImplementation(async (id) => (id === "lot-src-1" ? lotSource : lotOne));

    renderStock("/stock");

    expect(
      await screen.findByRole("heading", { level: 1, name: "Tồn kho sổ cái" }),
    ).toBeTruthy();

    fireEvent.click(await screen.findByRole("button", { name: "Xem chi tiết" }));

    const dialog = within(
      await screen.findByRole("dialog", { name: "DRY-ST25-01" }),
    );
    expect(getLotSpy).toHaveBeenCalledWith("lot-1");
    expect(await dialog.findByText("Silo Khô 1")).toBeTruthy();
    expect(dialog.getByText("Đang hạn chế")).toBeTruthy();
    expect(
      screen.getByRole("heading", { level: 1, name: "Tồn kho sổ cái" }),
    ).toBeTruthy();

    fireEvent.click(dialog.getByRole("button", { name: "RAW-ST25-01" }));
    const nestedDialog = within(
      await screen.findByRole("dialog", { name: "RAW-ST25-01" }),
    );
    expect(getLotSpy).toHaveBeenCalledWith("lot-src-1");

    fireEvent.click(
      nestedDialog.getByRole("button", { name: "Quay lại lô trước" }),
    );
    expect(
      await screen.findByRole("dialog", { name: "DRY-ST25-01" }),
    ).toBeTruthy();

    fireEvent.click(dialog.getAllByRole("button", { name: "Đóng" })[0]);
    expect(screen.queryByRole("dialog", { name: "DRY-ST25-01" })).toBeNull();
  });

  it("renders direct /stock/lots/:lotId route in a modal and returns to /stock when closed", async () => {
    vi.spyOn(ledgerEndpoints, "getLookups").mockResolvedValue(lookupsFixture);
    vi.spyOn(ledgerEndpoints, "getLots").mockResolvedValue({
      items: [lotOne],
      page: 1,
      pageSize: 30,
      totalCount: 1,
      hasMore: false,
    });
    vi.spyOn(ledgerEndpoints, "getLot").mockResolvedValue(lotOne);

    renderStock("/stock/lots/lot-1?facilityId=fac-1");

    const dialog = within(
      await screen.findByRole("dialog", { name: "DRY-ST25-01" }),
    );
    expect(await dialog.findByText("Lúa ST25")).toBeTruthy();
    expect(
      screen.getByRole("heading", { level: 1, name: "Tồn kho sổ cái" }),
    ).toBeTruthy();

    fireEvent.click(dialog.getAllByRole("button", { name: "Đóng" })[0]);
    expect(screen.getByTestId("location-echo").textContent).toBe(
      "/stock?facilityId=fac-1",
    );
  });
});
