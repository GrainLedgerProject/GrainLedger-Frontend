import { afterEach, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import "@/app/i18n";
import { adminEndpoints } from "@/api/admin";
import { ledgerEndpoints } from "@/api/ledger";
import { useAuthStore } from "@/app/store/authStore";
import { FacilityConfigPage } from "@/features/admin/pages/FacilityConfigPage";

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
  useAuthStore.setState({ user: null, isAuthenticated: false, accessToken: null });
});

it("submits the selected facility's version and keeps a rejected edit in its dialog", async () => {
  vi.spyOn(ledgerEndpoints, "getSetup").mockResolvedValue({
    facilities: [{ id: "mill-a", name: "Nhà máy A", version: "revision-12", canEdit: true }],
  });
  const update = vi.spyOn(ledgerEndpoints, "updateFacility").mockRejectedValue(new Error("Version conflict"));
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  render(<QueryClientProvider client={client}><FacilityConfigPage /></QueryClientProvider>);
  fireEvent.click(await screen.findByTitle("Sửa tên cơ sở nhà máy"));
  const dialog = within(await screen.findByRole("dialog"));
  const name = dialog.getByDisplayValue("Nhà máy A");
  fireEvent.change(name, { target: { value: "Nhà máy B" } });
  fireEvent.submit(name.closest("form")!);
  expect((await dialog.findByRole("alert")).textContent).toContain("Version conflict");
  expect(update).toHaveBeenCalledWith("mill-a", { name: "Nhà máy B", version: "revision-12" });
  expect(dialog.getByDisplayValue("Nhà máy B")).toBeTruthy();
});

it("renders synchronized FacilityAssignments panel, creates and updates staff assignments", async () => {
  useAuthStore.setState({
    isAuthenticated: true,
    accessToken: "mock",
    user: {
      id: "admin-1",
      email: "admin@grainledger.test",
      displayName: "Admin",
      role: "MILL_ADMIN",
      permissions: ["platform.configure"],
      isActive: true,
    },
  });
  vi.spyOn(ledgerEndpoints, "getSetup").mockResolvedValue({
    facilities: [{ id: "fac-1", name: "Nhà máy Thốt Nốt", version: "v1", canEdit: true }],
    assignments: [
      {
        userId: "op-1",
        facilityId: "fac-1",
        version: "a-v1",
        canEdit: true,
        canDelete: true,
      },
    ],
  });
  vi.spyOn(adminEndpoints, "getUsers").mockResolvedValue([
    {
      id: "op-1",
      email: "op@grainledger.test",
      displayName: "Nguyễn Văn Vận Hành",
      role: "MillOperator",
      organizationId: null,
      organizationName: null,
      isActive: true,
    },
    {
      id: "mgr-1",
      email: "mgr@grainledger.test",
      displayName: "Trần Quản Lý",
      role: "MillManager",
      organizationId: null,
      organizationName: null,
      isActive: true,
    },
  ]);
  const updateAssign = vi.spyOn(ledgerEndpoints, "updateAssignment").mockResolvedValue({});

  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  render(
    <QueryClientProvider client={client}>
      <FacilityConfigPage />
    </QueryClientProvider>,
  );

  expect(await screen.findByText("Phân công nhân sự theo cơ sở")).toBeTruthy();
  const assignmentsSection = screen.getByRole("region", {
    name: "Phân công nhân sự theo cơ sở",
  });
  expect(
    await within(assignmentsSection).findByText("Nguyễn Văn Vận Hành"),
  ).toBeTruthy();
  expect(within(assignmentsSection).getByText("MillOperator")).toBeTruthy();

  fireEvent.click(within(assignmentsSection).getByRole("button", { name: "Sửa" }));
  expect(within(assignmentsSection).getByText("Đang chỉnh sửa")).toBeTruthy();

  const staffSelect = within(assignmentsSection).getByLabelText(
    /Nhân sự đang hoạt động/,
  );
  fireEvent.change(staffSelect, { target: { value: "mgr-1" } });
  fireEvent.submit(staffSelect.closest("form")!);

  await waitFor(() =>
    expect(updateAssign).toHaveBeenCalledWith("op-1", "fac-1", {
      version: "a-v1",
      newUserId: "mgr-1",
      newFacilityId: "fac-1",
    }),
  );
  expect(
    await within(assignmentsSection).findByText("Đã cập nhật phân công."),
  ).toBeTruthy();
});
