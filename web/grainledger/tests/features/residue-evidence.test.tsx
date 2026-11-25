import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { MemoryRouter } from "react-router-dom";
import "@/app/i18n";
import { catalogsEndpoints } from "@/api/catalogs";
import { labReportEndpoints } from "@/api/compliance";
import { residueEndpoints } from "@/api/residue";
import { useAuthStore } from "@/app/store/authStore";
import { ResidueEvidencePage } from "@/features/compliance/pages/ResidueEvidencePage";

function renderPage() {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
  return render(
    <MemoryRouter>
      <QueryClientProvider client={client}>
        <ResidueEvidencePage />
      </QueryClientProvider>
    </MemoryRouter>,
  );
}

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
  useAuthStore.setState({ user: null, isAuthenticated: false });
});

describe("ResidueEvidencePage", () => {
  it("shows missing organization error when user has no organizationId", () => {
    useAuthStore.setState({
      isAuthenticated: true,
      user: {
        id: "u-1",
        email: "no-org@example.com",
        displayName: "No Org",
        role: "CUSTOMER_MANAGER",
        isActive: true,
        permissions: ["residue.evidence.manage"],
      },
    });

    renderPage();

    expect(screen.getByRole("alert")).toBeTruthy();
  });

  it("renders published source groups, switches to selection tab, and publishes a new source group", async () => {
    useAuthStore.setState({
      isAuthenticated: true,
      user: {
        id: "u-mgr",
        email: "mgr@example.com",
        displayName: "Manager",
        role: "CUSTOMER_MANAGER",
        organizationId: "org-1",
        isActive: true,
        permissions: ["residue.evidence.manage"],
      },
    });

    vi.spyOn(residueEndpoints, "getSourceGroups").mockResolvedValue({
      items: [
        {
          id: "grp-1",
          companyId: "org-1",
          schemaVersion: 2,
          code: "GRP-DELTA-01",
          versionNo: 1,
          substanceId: "sub-1",
          sourceIds: ["11111111-1111-4111-8111-111111111111"],
          supportingResultIds: [],
          productStage: "RAW_PADDY",
          productIdentity: "RAW_PADDY",
          lower: "0.001",
          upper: "0.005",
          unit: "mg/kg",
          decimalPlaces: 4,
          precedence: "DIRECT_FIRST",
          asReceivedConfirmed: true,
          profileCode: "EU-JASMINE",
          residueDefinition: "Sum of Tricyclazole",
          effectiveFrom: "2026-10-01T00:00:00Z",
          effectiveTo: null,
          supersedesId: null,
          evidenceRef: "LAB-REF-01",
          applicabilityStatement: "Applies to Autumn Crop",
          reviewedBy: "Nguyễn QA",
          reviewAuthority: "SGS",
          reviewedAt: "2026-10-01T00:00:00Z",
        },
      ],
      page: 1,
      pageSize: 25,
      totalCount: 1,
      hasMore: false,
    });
    vi.spyOn(residueEndpoints, "getReportSelections").mockResolvedValue({
      items: [],
      page: 1,
      pageSize: 25,
      totalCount: 0,
      hasMore: false,
    });
    vi.spyOn(catalogsEndpoints, "getActiveSubstances").mockResolvedValue({
      items: [{ id: "sub-1", code: "TRI", name: "Tricyclazole", isActive: true }],
      page: 1,
      pageSize: 50,
      totalCount: 1,
      hasMore: false,
    });
    vi.spyOn(labReportEndpoints, "getLabReports").mockResolvedValue({
      items: [],
      page: 1,
      pageSize: 20,
      totalCount: 0,
      hasMore: false,
    });
    const createGroup = vi.spyOn(residueEndpoints, "createSourceGroup").mockResolvedValue({});

    renderPage();

    const searchBox = screen.getByRole("searchbox");
    const publishedCard = searchBox.closest("section")!;
    expect(await within(publishedCard).findByText(/GRP-DELTA-01/)).toBeTruthy();

    fireEvent.change(searchBox, { target: { value: "NOT-FOUND" } });
    expect(within(publishedCard).queryByText(/GRP-DELTA-01/)).toBeNull();
    fireEvent.click(screen.getByRole("button", { name: "Xóa bộ lọc tìm kiếm" }));
    expect(within(publishedCard).getByText(/GRP-DELTA-01/)).toBeTruthy();

    const form = document.querySelector("form")!;
    fireEvent.change(form.querySelector('input[name="code"]')!, { target: { value: "GRP-NEW-02" } });
    fireEvent.change(form.querySelector('input[name="versionNo"]')!, { target: { value: "1" } });
    fireEvent.change(form.querySelector('select[name="substanceId"]')!, { target: { value: "sub-1" } });
    fireEvent.change(form.querySelector('select[name="precedence"]')!, { target: { value: "DIRECT_FIRST" } });
    fireEvent.change(form.querySelector('textarea[name="sourceIds"]')!, {
      target: { value: "11111111-1111-4111-8111-111111111111" },
    });
    fireEvent.change(form.querySelector('input[name="lower"]')!, { target: { value: "0.001" } });
    fireEvent.change(form.querySelector('input[name="upper"]')!, { target: { value: "0.008" } });
    fireEvent.change(form.querySelector('input[name="decimalPlaces"]')!, { target: { value: "3" } });
    fireEvent.change(form.querySelector('input[name="profileCode"]')!, { target: { value: "EU-PROF" } });
    fireEvent.change(form.querySelector('input[name="residueDefinition"]')!, { target: { value: "Tricyclazole" } });
    fireEvent.change(form.querySelector('input[name="effectiveFrom"]')!, {
      target: { value: "2026-11-25T08:00" },
    });
    fireEvent.change(form.querySelector('input[name="evidenceRef"]')!, { target: { value: "DOC-02" } });
    fireEvent.change(form.querySelector('input[name="reviewedBy"]')!, { target: { value: "Trần QA" } });
    fireEvent.change(form.querySelector('input[name="reviewAuthority"]')!, { target: { value: "Vinacontrol" } });
    fireEvent.change(form.querySelector('input[name="reviewedAt"]')!, {
      target: { value: "2026-11-25T09:00" },
    });
    fireEvent.change(form.querySelector('textarea[name="applicabilityStatement"]')!, {
      target: { value: "Batch 2" },
    });
    fireEvent.click(form.querySelector('input[name="asReceived"]')!);

    fireEvent.submit(form);

    await waitFor(() => expect(createGroup).toHaveBeenCalledTimes(1));
    expect(createGroup.mock.calls[0][0]).toEqual(
      expect.objectContaining({
        companyId: "org-1",
        code: "GRP-NEW-02",
        versionNo: 1,
        substanceId: "sub-1",
      }),
    );

    const navButtons = document.querySelectorAll("nav button");
    fireEvent.click(navButtons[1]);
    await waitFor(() => expect(screen.getByRole("combobox", { name: /báo cáo/i })).toBeTruthy());
  });
});
