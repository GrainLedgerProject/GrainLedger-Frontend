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
import { ResidueProfilesPage } from "@/features/compliance/pages/ResidueProfilesPage";
import { residueEndpoints } from "@/api/residue";
import type { ResidueProfileVersion } from "@/api/residue";

const auth = vi.hoisted(() => ({
  user: {
    organizationId: "company",
    permissions: ["residue.policy.manage", "residue.company-policy.manage"],
  },
}));
vi.mock("@/app/store/authStore", () => ({
  useAuthStore: (selector: (state: typeof auth) => unknown) => selector(auth),
}));
vi.mock("@/api/residue", () => ({
  residueEndpoints: {
    getRules: vi.fn(),
    getRule: vi.fn(),
    retireRule: vi.fn(),
  },
}));
vi.mock("react-i18next", () => ({
  useTranslation: () => ({
    t: (_key: string, fallback: string, values: Record<string, unknown> = {}) =>
      fallback.replace(/{{(\w+)}}/g, (_, key: string) =>
        String(values[key] ?? ""),
      ),
    i18n: { language: "vi" },
  }),
}));
const profile: ResidueProfileVersion = {
  id: "profile",
  code: "FLOW-1",
  versionNo: 1,
  kind: "FLOW",
  schemaVersion: 2,
  substanceId: "substance",
  commodityId: "commodity",
  residueDefinition: "Tricyclazole",
  unit: "mg/kg",
  decimalPlaces: 6,
  laboratory: [],
  steps: [],
  asReceivedConfirmed: true,
  effectiveFrom: "2026-11-01T00:00:00Z",
  effectiveTo: null,
  supersedesId: null,
  evidenceRef: "Reviewed study",
  applicabilityStatement: "Rice",
  reviewedBy: "Reviewer",
  reviewAuthority: "Laboratory",
  reviewedAt: "2026-11-01T00:00:00Z",
  companyId: null,
};
let cache: QueryClient;
beforeEach(() => {
  auth.user.permissions = [
    "residue.policy.manage",
    "residue.company-policy.manage",
  ];
  vi.mocked(residueEndpoints.getRules).mockResolvedValue({ items: [profile] });
  vi.mocked(residueEndpoints.getRule).mockResolvedValue(profile);
  cache = new QueryClient({
    defaultOptions: { queries: { retry: false, gcTime: Infinity } },
  });
});
afterEach(() => {
  cleanup();
  cache.clear();
});
async function open() {
  render(
    <QueryClientProvider client={cache}>
      <ResidueProfilesPage />
    </QueryClientProvider>,
  );
  fireEvent.click(await screen.findByRole("button", { name: /FLOW-1/ }));
  const dialog = await screen.findByRole("dialog");
  await within(dialog).findByText("Tricyclazole");
  return dialog;
}

describe("Reviewed residue profile retirement", () => {
  it("combines status, scope and search filters and can clear an empty result", async () => {
    const companyProfile = {
      ...profile,
      id: "company-profile",
      code: "COMPANY-1",
      companyId: "company",
      retirement: {
        profileId: "company-profile",
        code: "COMPANY-1",
        companyId: "company",
        reason: "Replaced",
        retiredBy: "reviewer",
        retiredAt: "2026-11-16T01:00:00Z",
      },
    };
    vi.mocked(residueEndpoints.getRules).mockResolvedValue({
      items: [profile, companyProfile],
    });
    render(
      <QueryClientProvider client={cache}>
        <ResidueProfilesPage />
      </QueryClientProvider>,
    );
    await screen.findByRole("button", { name: /COMPANY-1/ });
    fireEvent.change(screen.getByLabelText("Trạng thái"), {
      target: { value: "retired" },
    });
    expect(screen.queryByRole("button", { name: /FLOW-1/ })).toBeNull();
    fireEvent.change(screen.getByLabelText("Phạm vi áp dụng"), {
      target: { value: "system" },
    });
    expect(screen.queryByRole("button", { name: /COMPANY-1/ })).toBeNull();
    expect(screen.getByText("Không có hồ sơ phù hợp")).toBeTruthy();
    fireEvent.click(screen.getAllByRole("button", { name: "Xóa bộ lọc" })[0]);
    expect(screen.getByRole("button", { name: /FLOW-1/ })).toBeTruthy();
    expect(screen.getByRole("button", { name: /COMPANY-1/ })).toBeTruthy();
    fireEvent.change(screen.getByLabelText("Tìm hồ sơ"), {
      target: { value: "  company-1 " },
    });
    expect(screen.queryByRole("button", { name: /FLOW-1/ })).toBeNull();
    expect(screen.getByRole("button", { name: /COMPANY-1/ })).toBeTruthy();
  });

  it("offers a retry for detail errors without showing retirement controls", async () => {
    vi.mocked(residueEndpoints.getRule).mockRejectedValueOnce(
      new Error("Unavailable"),
    );
    render(
      <QueryClientProvider client={cache}>
        <ResidueProfilesPage />
      </QueryClientProvider>,
    );
    fireEvent.click(await screen.findByRole("button", { name: /FLOW-1/ }));
    const dialog = await screen.findByRole("dialog");
    await within(dialog).findByRole("alert");
    expect(
      within(dialog).queryByRole("button", { name: "Ngừng sử dụng hồ sơ" }),
    ).toBeNull();
    fireEvent.click(within(dialog).getByRole("button", { name: "Tải lại" }));
    await within(dialog).findByText("Tricyclazole");
    expect(within(dialog).getByText("Không thời hạn")).toBeTruthy();
  });

  it("requires a reason and persists retirement through the API", async () => {
    vi.mocked(residueEndpoints.retireRule).mockResolvedValue({
      profileId: "profile",
      code: "FLOW-1",
      companyId: null,
      reason: "Replaced",
      retiredBy: "reviewer",
      retiredAt: "2026-11-16T01:00:00Z",
    });
    const dialog = await open();
    fireEvent.click(
      within(dialog).getByRole("button", { name: "Ngừng sử dụng hồ sơ" }),
    );
    const confirm = within(dialog).getByRole("button", {
      name: "Xác nhận ngừng sử dụng",
    });
    expect((confirm as HTMLButtonElement).disabled).toBe(true);
    fireEvent.change(
      within(dialog).getByLabelText("Lý do ngừng sử dụng (bắt buộc)"),
      { target: { value: "  Replaced  " } },
    );
    fireEvent.click(confirm);
    await waitFor(() =>
      expect(residueEndpoints.retireRule).toHaveBeenCalledWith("profile", {
        reason: "Replaced",
      }),
    );
    await screen.findByText("Đã ngừng sử dụng hồ sơ FLOW-1.");
  });

  it("does not let company-policy permission retire a system profile", async () => {
    auth.user.permissions = ["residue.company-policy.manage"];
    const dialog = await open();
    expect(
      within(dialog).queryByRole("button", { name: "Ngừng sử dụng hồ sơ" }),
    ).toBeNull();
  });

  it("shows server errors in the dialog and keeps the reason for retry", async () => {
    vi.mocked(residueEndpoints.retireRule).mockRejectedValue(
      new Error("Profile already retired"),
    );
    const dialog = await open();
    fireEvent.click(
      within(dialog).getByRole("button", { name: "Ngừng sử dụng hồ sơ" }),
    );
    fireEvent.change(
      within(dialog).getByLabelText("Lý do ngừng sử dụng (bắt buộc)"),
      { target: { value: "Replaced" } },
    );
    fireEvent.click(
      within(dialog).getByRole("button", { name: "Xác nhận ngừng sử dụng" }),
    );
    expect(await within(dialog).findByRole("alert")).toBeTruthy();
    expect(
      (
        within(dialog).getByLabelText(
          "Lý do ngừng sử dụng (bắt buộc)",
        ) as HTMLTextAreaElement
      ).value,
    ).toBe("Replaced");
  });
});
