import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { MemoryRouter } from "react-router-dom";
import "@/app/i18n";
import { adminEndpoints } from "@/api/admin";
import { ledgerEndpoints, type SetupApiResponse } from "@/api/ledger";
import { planningEndpoints } from "@/api/planning";
import { useAuthStore } from "@/app/store/authStore";
import { BalancePolicyPage } from "@/features/admin/pages/BalancePolicyPage";

const sampleSetup: SetupApiResponse = {
  facilities: [
    { id: "fac-1", name: "Nhà máy Thốt Nốt", version: "1" },
    { id: "fac-2", name: "Nhà máy Ô Môn", version: "1" },
  ],
  locations: [
    {
      id: "loc-1",
      facilityId: "fac-1",
      name: "Silo Mix A",
      kind: "STORE",
      cleared: true,
      mixedBulk: true,
      ownerId: null,
      version: "1",
    },
  ],
  commodities: [
    { id: "com-1", name: "Lúa Jasmine 85" },
    { id: "com-2", name: "Lúa OM5451" },
  ],
  owners: [{ id: "org-cust-1", name: "Công ty Gạo Miền Tây" }],
  policies: [
    {
      id: "pol-1",
      facilityId: "fac-1",
      kind: "DRYING",
      tolerancePercent: "1.5",
      effectiveFrom: "2026-10-01T00:00:00Z",
      evidenceId: "ev-1",
    },
    {
      id: "pol-2",
      facilityId: "fac-2",
      kind: "MILLING",
      tolerancePercent: "2.0",
      effectiveFrom: "2026-11-01T00:00:00Z",
      evidenceId: "ev-2",
    },
  ],
  compatibilities: [
    {
      id: "comp-1",
      facilityId: "fac-1",
      inputProducts: ["com-1:HEAD_RICE", "com-2:BROKEN_RICE"],
      outputCommodityId: "com-1",
      effectiveFrom: "2026-10-15T00:00:00Z",
      evidenceId: "ev-3",
    },
  ],
  mixedBulkPolicies: [
    {
      id: "mix-1",
      locationId: "loc-1",
      ownerId: "org-cust-1",
      commodityId: "com-1",
      stage: "DRIED_PADDY",
      productIdentity: "HEAD_RICE",
      effectiveFrom: "2026-11-10T00:00:00Z",
      evidenceId: "ev-4",
    },
  ],
};

function renderPage() {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return render(
    <MemoryRouter>
      <QueryClientProvider client={client}>
        <BalancePolicyPage />
      </QueryClientProvider>
    </MemoryRouter>,
  );
}

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
  useAuthStore.setState({ user: null, isAuthenticated: false });
});

describe("BalancePolicyPage", () => {
  it("switches policy modes, filters rows, and stays read-only without configure permission", async () => {
    useAuthStore.setState({
      isAuthenticated: true,
      user: {
        id: "user-mgr",
        email: "mgr@example.com",
        displayName: "Quản lý",
        role: "MILL_MANAGER",
        isActive: true,
        permissions: ["ledger.read"],
      },
    });
    vi.spyOn(ledgerEndpoints, "getSetup").mockResolvedValue(sampleSetup);
    const getOrgs = vi.spyOn(adminEndpoints, "getOrganizations").mockResolvedValue([]);

    renderPage();

    expect(await screen.findByText("Nhà máy Thốt Nốt")).toBeTruthy();
    expect(screen.getByText("Chính sách cân bằng và lưu kho")).toBeTruthy();
    expect(screen.getByText("Nhà máy Ô Môn")).toBeTruthy();
    expect(screen.getByText("±1.5%")).toBeTruthy();
    expect(screen.getByText("±2.0%")).toBeTruthy();
    expect(getOrgs).not.toHaveBeenCalled();
    expect(screen.queryByRole("heading", { name: "Ghi phiên bản chính sách" })).toBeNull();

    const searchInput = screen.getByRole("searchbox", { name: "Tìm kiếm chính sách" });
    fireEvent.change(searchInput, { target: { value: "Ô Môn" } });
    expect(screen.queryByText("Nhà máy Thốt Nốt")).toBeNull();
    expect(screen.getByText("Nhà máy Ô Môn")).toBeTruthy();

    fireEvent.click(screen.getByRole("button", { name: "Xóa tìm kiếm" }));
    expect(screen.getByText("Nhà máy Thốt Nốt")).toBeTruthy();

    fireEvent.change(screen.getByLabelText(/Loại chính sách/), { target: { value: "blend" } });
    expect(await screen.findByText("Lúa Jasmine 85")).toBeTruthy();

    fireEvent.click(screen.getByRole("button", { name: /Tương thích lưu kho trộn/ }));
    expect(await screen.findByText("Silo Mix A")).toBeTruthy();
  });

  it("uploads evidence and records a new tolerance policy version", async () => {
    useAuthStore.setState({
      isAuthenticated: true,
      user: {
        id: "user-admin",
        email: "admin@example.com",
        displayName: "Quản trị",
        role: "MILL_ADMIN",
        isActive: true,
        permissions: ["platform.configure"],
      },
    });
    vi.spyOn(ledgerEndpoints, "getSetup").mockResolvedValue(sampleSetup);
    vi.spyOn(adminEndpoints, "getOrganizations").mockResolvedValue([
      { id: "org-cust-1", name: "Công ty Gạo Miền Tây", kind: "Customer" },
      { id: "org-mill-1", name: "Nhà máy Nội bộ", kind: "Mill" },
    ]);
    const uploadEvidence = vi.spyOn(ledgerEndpoints, "uploadEvidence").mockResolvedValue({});
    const createPolicy = vi.spyOn(ledgerEndpoints, "createPolicy").mockResolvedValue({});

    renderPage();

    const editorHeading = await screen.findByRole("heading", { name: "Ghi phiên bản chính sách" });
    const form = editorHeading.closest("section")!.querySelector("form")!;

    fireEvent.change(form.querySelector('select[name="facilityId"]')!, { target: { value: "fac-1" } });
    fireEvent.change(form.querySelector('select[name="ownerId"]')!, { target: { value: "org-cust-1" } });
    expect(form.querySelector('select[name="ownerId"]')?.textContent).not.toContain("Nhà máy Nội bộ");

    const fileInput = await waitFor(() => form.querySelector('input[type="file"]')!);
    const file = new File(["evidence-bytes"], "bien-ban.pdf", { type: "application/pdf" });
    fireEvent.change(fileInput, { target: { files: [file] } });
    fireEvent.click(screen.getByRole("button", { name: "Tải chứng cứ lên" }));

    await waitFor(() => expect(uploadEvidence).toHaveBeenCalledTimes(1));
    await screen.findByText(/Đã lưu chứng cứ/);

    fireEvent.change(form.querySelector('select[name="kind"]')!, { target: { value: "DRYING" } });
    fireEvent.change(form.querySelector('input[name="tolerancePercent"]')!, { target: { value: "1.75" } });
    fireEvent.change(form.querySelector('input[name="effectiveFrom"]')!, {
      target: { value: "2026-12-01T08:30" },
    });

    fireEvent.submit(form);

    await waitFor(() => expect(createPolicy).toHaveBeenCalledTimes(1));
    expect(createPolicy).toHaveBeenCalledWith(
      expect.objectContaining({
        facilityId: "fac-1",
        kind: "DRYING",
        tolerancePercent: "1.75",
      }),
    );
    expect(await screen.findByText("Đã ghi nhận phiên bản chính sách.")).toBeTruthy();
  });

  it("allows Mill Manager with blend.yield-policy.manage to publish prospective planning yield rules", async () => {
    useAuthStore.setState({
      isAuthenticated: true,
      user: {
        id: "user-mgr-yield",
        email: "mgr-yield@example.com",
        displayName: "Trưởng ca vận hành",
        role: "MILL_MANAGER",
        organizationId: "org-mill-1",
        organizationName: "Nhà máy Thốt Nốt",
        isActive: true,
        permissions: ["blend.yield-policy.manage"],
      },
    });
    vi.spyOn(ledgerEndpoints, "getSetup").mockResolvedValue(sampleSetup);
    const getOrgs = vi.spyOn(adminEndpoints, "getOrganizations").mockResolvedValue([]);
    const uploadEvidence = vi.spyOn(ledgerEndpoints, "uploadEvidence").mockResolvedValue({});
    const createYieldRule = vi.spyOn(planningEndpoints, "createYieldRule").mockResolvedValue({
      id: "yield-1",
    });

    renderPage();

    fireEvent.click(await screen.findByRole("button", { name: /Tỷ lệ thu hồi dự kiến/ }));
    expect(getOrgs).not.toHaveBeenCalled();

    const editorHeading = await screen.findByRole("heading", { name: "Ghi phiên bản chính sách" });
    const form = editorHeading.closest("section")!.querySelector("form")!;

    fireEvent.change(form.querySelector('select[name="facilityId"]')!, { target: { value: "fac-1" } });
    fireEvent.change(form.querySelector('select[name="compatibilityPolicyId"]')!, { target: { value: "comp-1" } });

    const fileInput = await waitFor(() => form.querySelector('input[type="file"]')!);
    const file = new File(["yield-report"], "yield-trial.pdf", { type: "application/pdf" });
    fireEvent.change(fileInput, { target: { files: [file] } });
    fireEvent.click(screen.getByRole("button", { name: "Tải chứng cứ lên" }));

    await waitFor(() => expect(uploadEvidence).toHaveBeenCalledTimes(1));
    expect(uploadEvidence).toHaveBeenCalledWith(
      expect.objectContaining({
        facilityId: "fac-1",
        ownerId: "org-mill-1",
      }),
    );
    await screen.findByText(/Đã lưu chứng cứ/);

    fireEvent.change(form.querySelector('input[name="outputFraction"]')!, { target: { value: "0.68" } });
    fireEvent.change(form.querySelector('input[name="reviewAuthority"]')!, { target: { value: "Hội đồng kỹ thuật" } });
    fireEvent.change(form.querySelector('input[name="reviewedAt"]')!, {
      target: { value: "2026-11-20T09:00" },
    });
    fireEvent.change(form.querySelector('input[name="effectiveFrom"]')!, {
      target: { value: "2026-12-01T00:00" },
    });
    fireEvent.change(form.querySelector('input[name="effectiveTo"]')!, {
      target: { value: "2027-06-01T00:00" },
    });

    fireEvent.submit(form);

    await waitFor(() => expect(createYieldRule).toHaveBeenCalledTimes(1));
    expect(createYieldRule).toHaveBeenCalledWith(
      expect.objectContaining({
        facilityId: "fac-1",
        compatibilityPolicyId: "comp-1",
        versionNo: 1,
        outputFraction: "0.68",
        reviewedBy: "Trưởng ca vận hành",
        reviewAuthority: "Hội đồng kỹ thuật",
      }),
    );
    expect(await screen.findByText("0.68")).toBeTruthy();
  });
});
