import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { MemoryRouter } from "react-router-dom";
import "@/app/i18n";
import { catalogsEndpoints } from "@/api/catalogs";
import { ledgerEndpoints } from "@/api/ledger";
import { planningEndpoints } from "@/api/planning";
import { useAuthStore } from "@/app/store/authStore";
import { SafetyMarginPolicyPage } from "@/features/compliance/pages/SafetyMarginPolicyPage";

function renderPage() {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
  return render(
    <MemoryRouter>
      <QueryClientProvider client={client}>
        <SafetyMarginPolicyPage />
      </QueryClientProvider>
    </MemoryRouter>,
  );
}

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
  useAuthStore.setState({ user: null, isAuthenticated: false });
});

describe("SafetyMarginPolicyPage", () => {
  it("denies access without compliance permissions", () => {
    useAuthStore.setState({
      isAuthenticated: true,
      user: {
        id: "user-1",
        email: "viewer@example.com",
        displayName: "Viewer",
        role: "AUTHORIZED_STOCK_VIEWER",
        isActive: true,
        permissions: ["stock.read"],
      },
    });

    renderPage();

    expect(screen.getByText("Thiết lập đánh giá xuất khẩu")).toBeTruthy();
    expect(screen.getByRole("alert").textContent).toContain(
      "Tài khoản cần quyền quản lý chính sách đánh giá hoặc chứng cứ chất lượng.",
    );
  });

  it("loads catalogs, checks applicable policy, and publishes a new safety margin version", async () => {
    useAuthStore.setState({
      isAuthenticated: true,
      user: {
        id: "user-mgr",
        email: "mgr@example.com",
        displayName: "Manager",
        role: "CUSTOMER_MANAGER",
        organizationId: "org-1",
        isActive: true,
        permissions: ["blend.assessment-policy.manage", "blend.quality-evidence.manage"],
      },
    });

    vi.spyOn(catalogsEndpoints, "getMarkets").mockResolvedValue({
      items: [{ id: "mkt-eu", code: "EU", name: "Liên minh Châu Âu", isActive: true }],
      page: 1,
      pageSize: 50,
      totalCount: 1,
      hasMore: false,
    });
    vi.spyOn(catalogsEndpoints, "getCommodities").mockResolvedValue({
      items: [{ id: "com-rice", code: "JASMINE", name: "Gạo Jasmine", isActive: true }],
      page: 1,
      pageSize: 50,
      totalCount: 1,
      hasMore: false,
    });
    vi.spyOn(catalogsEndpoints, "getActiveSubstances").mockResolvedValue({
      items: [
        { id: "sub-1", code: "ACT-01", name: "Tricyclazole", isActive: true },
        { id: "sub-2", code: "ACT-02", name: "Buprofezin", isActive: true },
      ],
      page: 1,
      pageSize: 50,
      totalCount: 2,
      hasMore: false,
    });
    vi.spyOn(catalogsEndpoints, "getQualityAttributes").mockResolvedValue({
      items: [{ id: "attr-1", code: "MOISTURE", name: "Độ ẩm", unit: "%", isActive: true }],
      page: 1,
      pageSize: 50,
      totalCount: 1,
      hasMore: false,
    });
    vi.spyOn(ledgerEndpoints, "getLookups").mockResolvedValue({
      facilities: [{ id: "fac-1", name: "Nhà máy Thốt Nốt", version: "1" }],
    });
    vi.spyOn(planningEndpoints, "getApplicableAssessmentPolicy").mockResolvedValue({
      id: "pol-old",
      marketId: "mkt-eu",
      commodityId: "com-rice",
      versionNo: 2,
      effectiveFrom: "2026-10-01T00:00:00Z",
      effectiveTo: null,
      requiredSubstanceIds: ["sub-1"],
      mrlMarginFraction: "0.1",
      residueBasis: "AS_RECEIVED",
      qualityRules: [],
      evidenceReference: "EU Reg 2026",
      reviewedBy: "QA Lead",
      reviewAuthority: "Vinacontrol",
      reviewedAt: "2026-10-01T00:00:00Z",
    });
    const publish = vi.spyOn(planningEndpoints, "publishAssessmentPolicy").mockResolvedValue({});

    renderPage();

    expect(await screen.findByText("Chính sách theo thị trường")).toBeTruthy();
    expect(screen.getByText("Đo chất lượng lô thành phẩm")).toBeTruthy();

    const policySection = screen.getByRole("heading", { name: "Chính sách theo thị trường" }).closest("section")!;
    fireEvent.change(policySection.querySelector('select[name="marketId"]')!, {
      target: { value: "mkt-eu" },
    });
    fireEvent.change(policySection.querySelector('select[name="commodityId"]')!, {
      target: { value: "com-rice" },
    });

    await screen.findByText(/Biên an toàn 0\.1/);

    fireEvent.change(policySection.querySelector('input[name="substanceSearch"]')!, {
      target: { value: "Tricyclazole" },
    });
    expect(screen.queryByText("Buprofezin")).toBeNull();
    fireEvent.click(screen.getByRole("checkbox", { name: /Tricyclazole/ }));

    fireEvent.change(policySection.querySelector('input[name="margin"]')!, { target: { value: "0.15" } });
    fireEvent.change(policySection.querySelector('input[name="effectiveFrom"]')!, {
      target: { value: "2026-12-01T08:00" },
    });
    fireEvent.change(policySection.querySelector('select[name="residueBasis"]')!, {
      target: { value: "AS_RECEIVED" },
    });
    fireEvent.change(policySection.querySelector('textarea[name="evidenceReference"]')!, {
      target: { value: "EU 2026/999" },
    });
    fireEvent.change(policySection.querySelector('input[name="reviewedBy"]')!, {
      target: { value: "Nguyễn Văn A" },
    });
    fireEvent.change(policySection.querySelector('input[name="reviewAuthority"]')!, {
      target: { value: "SGS" },
    });
    fireEvent.change(policySection.querySelector('input[name="reviewedAt"]')!, {
      target: { value: "2026-11-25T10:00" },
    });
    fireEvent.click(policySection.querySelector('input[name="confirmed"]')!);

    fireEvent.submit(policySection.querySelector("form")!);

    await waitFor(() => expect(publish).toHaveBeenCalledTimes(1));
    expect(publish.mock.calls[0][0]).toEqual(
      expect.objectContaining({
        marketId: "mkt-eu",
        commodityId: "com-rice",
        versionNo: 3,
        mrlMarginFraction: "0.15",
        requiredSubstanceIds: ["sub-1"],
      }),
    );
    expect(await screen.findByText("Đã công bố chính sách v3.")).toBeTruthy();
  });
});
