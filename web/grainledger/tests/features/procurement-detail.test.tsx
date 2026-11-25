import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen, within } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import i18n from "@/app/i18n";
import {
  procurementEndpoints,
  type ProcurementResponse,
  type SourceLotDetail,
} from "@/api/procurement";
import { ledgerEndpoints } from "@/api/ledger";
import { useAuthStore } from "@/app/store/authStore";
import {
  ProcurementDetailPage,
  SourceLotDetailPage,
} from "@/features/field/pages/ProcurementDetailPages";
import { fieldPaths } from "@/features/field/paths";

function renderRoute(initialEntry: string) {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
  return render(
    <MemoryRouter initialEntries={[initialEntry]}>
      <QueryClientProvider client={client}>
        <Routes>
          <Route path={fieldPaths.receipt} element={<ProcurementDetailPage />} />
          <Route path={fieldPaths.sourceLot} element={<SourceLotDetailPage />} />
        </Routes>
      </QueryClientProvider>
    </MemoryRouter>,
  );
}

const sourceLotFixture: SourceLotDetail = {
  id: "249554a9-3bb6-4b76-b60a-85250daea41c",
  lotId: "lot-1",
  lotCode: "SRC-ST25-001",
  stage: "RAW_PADDY",
  procurementId: "proc-1",
  procurementCode: "PR-2026-001",
  plotSeasonId: "ps-1",
  riceVariety: "ST25",
  plotCode: "THUA-01",
  farmerName: "Nguyễn Văn An",
  seasonName: "Đông Xuân 2026",
  initialNetMassKg: "12500",
  moisturePercent: "18.5",
  receivingStatus: "RECEIVED_MATCHED",
  usableStockKg: "11900",
  currentStock: [
    {
      currentStockLotId: "stock-lot-1",
      currentStockLotCode: "STK-001",
      locationId: "SILO-A1",
      onHandKg: "12500",
      availableKg: "11900",
    },
  ],
  lineage: [
    {
      lotId: "dry-lot-1",
      lotCode: "DRY-001",
      quantityKg: "600",
    },
  ],
  sampleIds: ["smp-1"],
  confirmedLabReportIds: ["rep-1"],
};

const procurementFixture: ProcurementResponse = {
  id: "proc-1",
  code: "PR-2026-001",
  farmerId: "farm-1",
  farmerName: "Nguyễn Văn An",
  farmerCode: "ND-01",
  collectionSiteId: "site-1",
  receivingLocationId: "loc-1",
  commodityId: "com-1",
  status: "RECEIVED_MATCHED",
  receivedBy: "user-1",
  receivedAt: "2026-11-25T07:30:00Z",
  capturedAt: "2026-11-25T07:15:00Z",
  recordedAt: "2026-11-25T07:35:00Z",
  eventId: "evt-1",
  totalNetMassKg: "12500",
  items: [
    {
      id: "line-1",
      lineNo: 1,
      plotSeasonId: "ps-1",
      plotId: "plot-1",
      seasonId: "season-1",
      plotCode: "THUA-01",
      seasonName: "Đông Xuân 2026",
      riceVariety: "ST25",
      measuredValue: "12500",
      measuredUnit: "KG",
      netMassKg: "12500",
      moisturePercent: "18.5",
      sourceLotId: "249554a9-3bb6-4b76-b60a-85250daea41c",
      lotId: "lot-1",
      lotCode: "SRC-ST25-001",
      stage: "RAW_PADDY",
    },
  ],
};

beforeEach(async () => {
  await i18n.changeLanguage("vi");
  useAuthStore.setState({
    isAuthenticated: true,
    user: {
      id: "u-1",
      email: "officer@example.com",
      displayName: "Officer",
      role: "CUSTOMER_PROCUREMENT_OFFICER",
      isActive: true,
      permissions: ["purchases.write", "lab.read"],
    },
  });
});

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

describe("ProcurementDetailPages", () => {
  it("renders source lot provenance, stock table, lineage, and sample/lab links", async () => {
    vi.spyOn(procurementEndpoints, "getSourceLot").mockResolvedValue(
      sourceLotFixture,
    );

    renderRoute("/field/source-lots/249554a9-3bb6-4b76-b60a-85250daea41c");

    expect(
      await screen.findByRole("heading", { level: 1, name: "SRC-ST25-001" }),
    ).toBeTruthy();
    expect(screen.getAllByText("Nguyễn Văn An").length).toBeGreaterThan(0);
    expect(screen.getAllByText("THUA-01").length).toBeGreaterThan(0);
    expect(screen.getByText("Đông Xuân 2026")).toBeTruthy();
    expect(screen.getByText("Lúa tươi")).toBeTruthy();
    expect(screen.getAllByText("Đã khớp kho").length).toBeGreaterThan(0);

    const receiptLinks = screen.getAllByRole("link", { name: /PR-2026-001/ });
    expect(receiptLinks[0].getAttribute("href")).toBe("/field/receipts/proc-1");

    const sprayLink = screen.getByRole("link", { name: /Lịch sử phun thuốc/ });
    expect(sprayLink.getAttribute("href")).toBe(
      "/field/declarations/new?plotSeasonId=ps-1",
    );

    const stockButton = screen.getByRole("button", { name: "STK-001" });
    expect(stockButton).toBeTruthy();

    const lineageButton = screen.getByRole("button", { name: "DRY-001" });
    expect(lineageButton).toBeTruthy();

    vi.spyOn(ledgerEndpoints, "getLookups").mockResolvedValue({
      facilities: [{ id: "fac-1", name: "Nhà máy Thốt Nốt", version: "1" }],
      locations: [
        {
          id: "SILO-A1",
          facilityId: "fac-1",
          name: "Silo A1",
          kind: "STORE",
          cleared: true,
          mixedBulk: false,
          ownerId: "org-1",
          version: "1",
        },
      ],
      commodities: [{ id: "com-1", name: "Lúa ST25" }],
      owners: [{ id: "org-1", name: "Nông sản An Giang" }],
    });
    vi.spyOn(ledgerEndpoints, "getLot").mockResolvedValue({
      id: "stock-lot-1",
      code: "STK-001",
      stage: "RAW_PADDY",
      productIdentity: "RAW_PADDY",
      ownerId: "org-1",
      commodityId: "com-1",
      positions: [
        {
          facilityId: "fac-1",
          locationId: "SILO-A1",
          quantityKg: "12500",
          availableKg: "11900",
        },
      ],
      restrictions: [],
    });

    fireEvent.click(stockButton);
    const stockDialog = within(
      await screen.findByRole("dialog", { name: "STK-001" }),
    );
    expect(await stockDialog.findByText("Silo A1")).toBeTruthy();
    expect(
      stockDialog
        .getByRole("link", { name: /Mở Tồn kho sổ cái/ })
        .getAttribute("href"),
    ).toBe("/stock/lots/stock-lot-1");
    fireEvent.click(stockDialog.getAllByRole("button", { name: "Đóng" })[0]);
    expect(screen.queryByRole("dialog", { name: "STK-001" })).toBeNull();

    const collectSampleLink = screen.getByRole("link", {
      name: /Lấy mẫu từ lô này/,
    });
    expect(collectSampleLink.getAttribute("href")).toBe(
      "/field/samples/new?sourceLotId=249554a9-3bb6-4b76-b60a-85250daea41c&create=1",
    );

    const labLink = screen.getByRole("link", { name: "rep-1" });
    expect(labLink.getAttribute("href")).toBe("/compliance/lab-results/rep-1");
  });

  it("respects permissions and empty stock/sample states on source lot details", async () => {
    useAuthStore.setState({
      isAuthenticated: true,
      user: {
        id: "u-2",
        email: "viewer@example.com",
        displayName: "Viewer",
        role: "CUSTOMER_MANAGER",
        isActive: true,
        permissions: [],
      },
    });
    vi.spyOn(procurementEndpoints, "getSourceLot").mockResolvedValue({
      ...sourceLotFixture,
      currentStock: [],
      lineage: [],
      sampleIds: [],
      confirmedLabReportIds: [],
    });

    renderRoute("/field/source-lots/lot-empty");

    expect(
      await screen.findByRole("heading", { level: 1, name: "SRC-ST25-001" }),
    ).toBeTruthy();
    expect(screen.getByText("Chưa có vị trí tồn kho.")).toBeTruthy();
    expect(
      screen.queryByRole("link", { name: /Lấy mẫu từ lô này/ }),
    ).toBeNull();
    expect(screen.queryByRole("link", { name: "rep-1" })).toBeNull();
  });

  it("renders procurement receipt details and opens source lot line details in a modal", async () => {
    vi.spyOn(procurementEndpoints, "getProcurement").mockResolvedValue(
      procurementFixture,
    );
    const getSourceLotSpy = vi
      .spyOn(procurementEndpoints, "getSourceLot")
      .mockResolvedValue(sourceLotFixture);

    renderRoute("/field/receipts/proc-1");

    expect(
      await screen.findByRole("heading", { level: 1, name: "PR-2026-001" }),
    ).toBeTruthy();

    fireEvent.click(screen.getByRole("button", { name: "Xem chi tiết" }));

    const dialog = within(
      await screen.findByRole("dialog", { name: "SRC-ST25-001" }),
    );
    expect(getSourceLotSpy).toHaveBeenCalledWith(
      "249554a9-3bb6-4b76-b60a-85250daea41c",
    );
    expect(await dialog.findByText("Lúa tươi")).toBeTruthy();
    expect(dialog.getByRole("button", { name: "STK-001" })).toBeTruthy();
    expect(
      dialog.getByRole("link", { name: /Mở trang chi tiết/ }).getAttribute("href"),
    ).toBe("/field/source-lots/249554a9-3bb6-4b76-b60a-85250daea41c");

    fireEvent.click(dialog.getAllByRole("button", { name: "Đóng" })[0]);
    expect(screen.queryByRole("dialog", { name: "SRC-ST25-001" })).toBeNull();
  });
});
