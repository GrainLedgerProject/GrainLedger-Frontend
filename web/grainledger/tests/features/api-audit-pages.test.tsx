import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  act,
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
  within,
} from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { MemoryRouter } from "react-router-dom";
import "@/app/i18n";
import i18n from "@/app/i18n";
import { catalogsEndpoints } from "@/api/catalogs";
import { residueEndpoints } from "@/api/residue";
import { ApiError } from "@/api/client";
import { useAuthStore } from "@/app/store/authStore";
import { MrlVersionsPage } from "@/features/catalogs/pages/MrlVersionsPage";
import { CompanyResiduePoliciesPage } from "@/features/compliance/pages/CompanyResiduePoliciesPage";
import { MasterDataPage } from "@/features/catalogs/pages/MasterDataPage";
import { auditPage, auditProfile, auditVersion } from "../fixtures/apiAuditData";

vi.mock("@/api/catalogs");
vi.mock("@/api/residue");
vi.mock("@/app/store/feedbackStore", () => ({
  confirmAction: vi.fn().mockResolvedValue(true),
}));
let cache: QueryClient;
beforeEach(async () => {
  vi.resetAllMocks();
  const { confirmAction } = await import("@/app/store/feedbackStore");
  vi.mocked(confirmAction).mockResolvedValue(true);
  await i18n.changeLanguage("vi");
  useAuthStore.setState({
    user: {
      id: "user",
      email: "user@example.com",
      displayName: "User",
      role: "MILL_ADMIN",
      organizationId: "company",
      organizationName: "Company",
      isActive: true,
      permissions: ["platform.configure", "residue.company-policy.manage"],
    },
  });
  vi.mocked(catalogsEndpoints.getMrlVersions).mockResolvedValue(
    auditPage([auditVersion]),
  );
  vi.mocked(catalogsEndpoints.getMarkets).mockResolvedValue(
    auditPage([{ id: "market-1", code: "JP", name: "Japan" }]),
  );
  vi.mocked(catalogsEndpoints.getCommodities).mockResolvedValue(
    auditPage([
      {
        id: "rice-1",
        code: "RICE",
        name: "Rice",
        createdBy: null,
        version: 2,
        canEdit: true,
        canDelete: true,
        isArchived: false,
      },
    ]),
  );
  vi.mocked(catalogsEndpoints.getActiveSubstances).mockResolvedValue(
    auditPage([{ id: "sub-1", code: "REAL-1", name: "Actual substance" }]),
  );
  vi.mocked(catalogsEndpoints.getMrlVersion).mockResolvedValue({
    data: auditVersion,
    etag: '"7"',
  });
  vi.mocked(catalogsEndpoints.getMrlLimits).mockResolvedValue(
    auditPage([
      {
        id: "limit-1",
        mrlVersionId: auditVersion.id,
        substanceId: "sub-1",
        limitValue: 0.125,
        unit: "mg/kg",
      },
    ]),
  );
  vi.mocked(residueEndpoints.getRules).mockResolvedValue({
    items: [auditProfile],
  });
  vi.mocked(residueEndpoints.getPolicySettings).mockResolvedValue({
    items: [],
  });
  cache = new QueryClient({
    defaultOptions: { queries: { retry: false, gcTime: Infinity } },
  });
});
afterEach(() => {
  cleanup();
  cache.clear();
  useAuthStore.setState({ user: null });
});
function mount(page: React.ReactNode) {
  return render(
    <MemoryRouter>
      <QueryClientProvider client={cache}>{page}</QueryClientProvider>
    </MemoryRouter>,
  );
}
async function detail() {
  mount(<MrlVersionsPage />);
  fireEvent.click(await screen.findByRole("button", { name: /^Chi tiết ·/ }));
  const modal = await screen.findByRole("dialog");
  await within(modal).findByText("0.125 mg/kg");
  return modal;
}

describe("MRL catalog integration", () => {
  it("keeps filters and record actions when switching between grid and list", async () => {
    vi.mocked(catalogsEndpoints.getMrlVersions).mockResolvedValue(
      auditPage([
        auditVersion,
        {
          ...auditVersion,
          id: "published-version",
          status: "PUBLISHED",
          versionNo: 2,
        },
      ]),
    );
    mount(<MrlVersionsPage />);
    await screen.findAllByRole("button", { name: /^Chi tiết ·/ });
    fireEvent.change(screen.getByRole("searchbox"), {
      target: { value: "Rice" },
    });
    fireEvent.change(screen.getByLabelText("Trạng thái"), {
      target: { value: "DRAFT" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Danh sách" }));
    expect(
      screen
        .getByRole("button", { name: "Danh sách" })
        .getAttribute("aria-pressed"),
    ).toBe("true");
    expect(within(screen.getByRole("table")).getAllByRole("row")).toHaveLength(
      2,
    );
    fireEvent.click(screen.getByRole("button", { name: "Lưới" }));
    expect(screen.queryByRole("table")).toBeNull();
    expect(screen.getAllByRole("button", { name: /^Chi tiết ·/ })).toHaveLength(
      1,
    );
    expect((screen.getByRole("searchbox") as HTMLInputElement).value).toBe(
      "Rice",
    );
    fireEvent.click(screen.getByRole("button", { name: "Danh sách" }));
    fireEvent.click(screen.getByRole("button", { name: /^Chi tiết ·/ }));
    await within(await screen.findByRole("dialog")).findByText("0.125 mg/kg");
    expect(catalogsEndpoints.getMrlVersion).toHaveBeenCalledWith(
      auditVersion.id,
    );
    expect(catalogsEndpoints.getMrlVersions).toHaveBeenCalledTimes(1);
  });
  it("uses actual market, status and substance limits instead of sample thresholds", async () => {
    const modal = await detail();
    expect(within(modal).getByText("Actual substance")).toBeDefined();
    expect(screen.queryByText("TCZ001")).toBeNull();
    expect(screen.queryByText("Châu Âu (EU)")).toBeNull();
  });
  it("closes the previous organization's version and refetches after a switch", async () => {
    await detail();
    vi.mocked(catalogsEndpoints.getMrlVersions).mockResolvedValue(auditPage([]));
    act(() => {
      const user = useAuthStore.getState().user!;
      useAuthStore.setState({ user: { ...user, organizationId: "different-company" } });
    });
    await waitFor(() => expect(catalogsEndpoints.getMrlVersions).toHaveBeenCalledTimes(2));
    expect(screen.queryByRole("dialog")).toBeNull();
    expect(screen.queryByRole("button", { name: /^Chi tiết ·/ })).toBeNull();
  });

  it("blocks stale saves until the user reloads the version", async () => {
    vi.mocked(catalogsEndpoints.upsertMrlLimit).mockRejectedValueOnce(
      new ApiError(412, "stale"),
    );
    const modal = await detail();
    fireEvent.change(within(modal).getByLabelText(/Ngưỡng tối đa/), {
      target: { value: "0.5" },
    });
    fireEvent.submit(
      within(modal)
        .getByRole("button", { name: "Lưu ngưỡng hoạt chất" })
        .closest("form")!,
    );
    await within(modal).findByRole("alert");
    expect(catalogsEndpoints.upsertMrlLimit).toHaveBeenCalledWith(
      "mrl-1",
      "sub-1",
      { limitValue: "0.5", unit: "mg/kg" },
      '"7"',
    );
    expect(
      (
        within(modal).getByRole("button", {
          name: "Lưu ngưỡng hoạt chất",
        }) as HTMLButtonElement
      ).disabled,
    ).toBe(true);
    fireEvent.click(within(modal).getByRole("button", { name: /Tải lại/ }));
    await waitFor(() =>
      expect(
        (
          within(modal).getByRole("button", {
            name: "Lưu ngưỡng hoạt chất",
          }) as HTMLButtonElement
        ).disabled,
      ).toBe(false),
    );
  });
  it("keeps published versions read only and hides write actions without permission", async () => {
    vi.mocked(catalogsEndpoints.getMrlVersion).mockResolvedValue({
      data: { ...auditVersion, status: "PUBLISHED" },
      etag: '"9"',
    });
    useAuthStore.setState({
      user: { ...useAuthStore.getState().user!, permissions: ["mrl.read"] },
    });
    const modal = await detail();
    expect(
      within(modal).queryByRole("button", { name: "Công bố phiên bản" }),
    ).toBeNull();
    expect(
      within(modal).queryByRole("button", { name: "Lưu ngưỡng hoạt chất" }),
    ).toBeNull();
    expect(
      screen.queryByRole("button", { name: "Nhập bảng MRL từ JSON" }),
    ).toBeNull();
  });
  it("requires a readable ETag before enabling any draft mutation", async () => {
    vi.mocked(catalogsEndpoints.getMrlVersion).mockResolvedValue({
      data: auditVersion,
      etag: null,
    });
    const modal = await detail();
    expect(
      (
        within(modal).getByRole("button", {
          name: "Công bố phiên bản",
        }) as HTMLButtonElement
      ).disabled,
    ).toBe(true);
    expect(
      (
        within(modal).getByRole("button", {
          name: "Lưu ngưỡng hoạt chất",
        }) as HTMLButtonElement
      ).disabled,
    ).toBe(true);
    expect(within(modal).getByRole("alert").textContent).toContain("ETag");
  });
  it("preserves original timestamp precision when only the regulatory source changes", async () => {
    vi.mocked(catalogsEndpoints.getMrlVersion).mockResolvedValue({
      data: { ...auditVersion, effectiveFrom: "2026-11-18T00:00:37.123456Z" },
      etag: '"7"',
    });
    const modal = await detail();
    fireEvent.click(
      within(modal).getByRole("button", { name: "Chỉnh sửa bản nháp" }),
    );
    const editor = await screen.findByRole("dialog");
    fireEvent.change(within(editor).getByLabelText("Căn cứ pháp lý"), {
      target: { value: "Updated regulation" },
    });
    fireEvent.submit(
      within(editor)
        .getByRole("button", { name: "Lưu thay đổi" })
        .closest("form")!,
    );
    await waitFor(() =>
      expect(catalogsEndpoints.updateMrlVersion).toHaveBeenCalledWith(
        "mrl-1",
        { sourceRef: "Updated regulation" },
        '"7"',
      ),
    );
  });
  it("reports import validation in the dialog and never submits invalid JSON", async () => {
    mount(<MrlVersionsPage />);
    fireEvent.click(
      await screen.findByRole("button", { name: "Nhập bảng MRL từ JSON" }),
    );
    const modal = screen.getByRole("dialog");
    fireEvent.change(within(modal).getByRole("textbox"), {
      target: { value: '{"limits": []}' },
    });
    fireEvent.submit(
      within(modal)
        .getByRole("button", { name: "Nhập bảng MRL từ JSON" })
        .closest("form")!,
    );
    await within(modal).findByRole("alert");
    expect(catalogsEndpoints.importMrlVersion).not.toHaveBeenCalled();
  });
  it("preserves the ETag loaded when opening a master catalog edit", async () => {
    vi.mocked(catalogsEndpoints.getCommodity).mockResolvedValue({
      data: {
        id: "rice-1",
        code: "RICE",
        name: "Rice",
        createdBy: null,
        version: 5,
        canEdit: true,
        canDelete: true,
        isArchived: false,
      },
      etag: '"5"',
    });
    mount(<MasterDataPage />);
    fireEvent.click(await screen.findByTitle("Chỉnh sửa"));
    const modal = await screen.findByRole("dialog");
    const input = within(modal)
      .getAllByRole("textbox")
      .find((node) => (node as HTMLInputElement).value === "Rice")!;
    fireEvent.change(input, { target: { value: "Updated rice" } });
    fireEvent.submit(input.closest("form")!);
    await waitFor(() =>
      expect(catalogsEndpoints.updateCommodity).toHaveBeenCalledWith(
        "rice-1",
        { name: "Updated rice" },
        '"5"',
      ),
    );
  });
});

async function preparePolicy() {
  mount(<CompanyResiduePoliciesPage />);
  fireEvent.click(
    await screen.findByRole("checkbox", { name: /RICE-FLOW-01/ }),
  );
  for (const [label, value] of [
    ["Hiệu lực từ", "2026-11-19T08:00"],
    ["Người rà soát", "Company reviewer"],
    ["Thẩm quyền rà soát", "Quality manager"],
    ["Thời điểm rà soát", "2026-11-01T08:00"],
  ])
    fireEvent.change(screen.getByLabelText(label), { target: { value } });
  fireEvent.click(screen.getByRole("checkbox", { name: /Tôi đã kiểm tra/ }));
  return screen
    .getByRole("button", { name: "Công bố các thiết lập đã rà soát" })
    .closest("form")!;
}
describe("Company policy publishing", () => {
  it("publishes a typed company scoped batch and retains the UUID on a retry", async () => {
    vi.mocked(residueEndpoints.batchPolicySettings)
      .mockRejectedValueOnce(new Error("Temporary failure"))
      .mockResolvedValueOnce({ items: [] });
    const form = await preparePolicy();
    fireEvent.submit(form);
    await screen.findByText("Temporary failure");
    const first = vi.mocked(residueEndpoints.batchPolicySettings).mock
      .calls[0][0];
    expect(first.items[0]).toMatchObject({
      companyId: "company",
      ruleCode: "RICE-FLOW-01",
      mode: "SYSTEM_DEFAULT",
      versionNo: 1,
      supersedesId: null,
      reviewedBy: "Company reviewer",
      evidenceRef: auditProfile.evidenceRef,
    });
    expect(first.items[0].id).toMatch(/^[a-f0-9-]{36}$/);
    fireEvent.submit(form);
    await waitFor(() =>
      expect(residueEndpoints.batchPolicySettings).toHaveBeenCalledTimes(2),
    );
    expect(
      vi.mocked(residueEndpoints.batchPolicySettings).mock.calls[1][0],
    ).toEqual(first);
  });
  it("detects changed scientific sources before calling the batch API", async () => {
    const form = await preparePolicy();
    vi.mocked(residueEndpoints.getRules).mockResolvedValue({
      items: [{ ...auditProfile, evidenceRef: "Changed source" }],
    });
    fireEvent.submit(form);
    const alert = await screen.findByRole("alert");
    expect(alert.textContent).toContain("đã thay đổi");
    expect(residueEndpoints.batchPolicySettings).not.toHaveBeenCalled();
    expect(
      (
        screen.getByRole("button", {
          name: "Công bố các thiết lập đã rà soát",
        }) as HTMLButtonElement
      ).disabled,
    ).toBe(true);
  });
  it("does not request company data when access is denied", async () => {
    useAuthStore.setState({
      user: { ...useAuthStore.getState().user!, permissions: [] },
    });
    mount(<CompanyResiduePoliciesPage />);
    expect(screen.getByRole("alert")).toBeDefined();
    expect(residueEndpoints.getRules).not.toHaveBeenCalled();
    expect(residueEndpoints.getPolicySettings).not.toHaveBeenCalled();
  });
});
