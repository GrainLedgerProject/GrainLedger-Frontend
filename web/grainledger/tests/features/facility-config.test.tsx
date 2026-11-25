import { afterEach, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen, within } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import "@/app/i18n";
import { ledgerEndpoints } from "@/api/ledger";
import { FacilityConfigPage } from "@/features/admin/pages/FacilityConfigPage";

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
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
