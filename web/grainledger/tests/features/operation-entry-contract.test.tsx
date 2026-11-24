import { afterEach, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { ledgerEndpoints } from "@/api/ledger";
import i18n from "@/app/i18n";
import { useAuthStore } from "@/app/store/authStore";
import { OperationEntryPage } from "@/features/mill/pages/OperationEntryPage";

afterEach(() => {
  cleanup();
  useAuthStore.setState({ user: null, isAuthenticated: false, accessToken: null, hasUnsavedDrafts: false });
});

it.each([
  { title: "retries committing the same saved draft", output: "10", awaitingReview: false },
  { title: "hands the saved draft to the variance queue", output: "9.99", awaitingReview: true },
])("sends the processing contract and $title", async ({ output, awaitingReview }) => {
  await i18n.changeLanguage("en");
  useAuthStore.setState({
    user: { id: "operator", role: "MILL_OPERATOR", isActive: true, email: "operator@example.test", displayName: "Operator", permissions: ["conversions.write"] },
  });
  vi.spyOn(ledgerEndpoints, "getLots").mockResolvedValue({ items: [
    { id: "lot", code: "LOT-01", ownerId: "owner", commodityId: "commodity", productIdentity: "DRIED_PADDY",
      positions: [{ facilityId: "facility", locationId: "input", quantityKg: "10", availableKg: "10", poolRevision: 4 }] },
  ] });
  vi.spyOn(ledgerEndpoints, "getSetup").mockResolvedValue({
    equipment: [{ id: "equipment", facilityId: "facility", name: "Mill", version: "equipment-version" }],
    locations: [{ id: "output", facilityId: "facility", name: "Output silo", kind: "STORE", mixedBulk: false, cleared: true, ownerId: "owner", version: "location-version" }],
    policies: [{ id: "policy", kind: "MILLING", facilityId: "facility", tolerancePercent: "0.1", effectiveFrom: "2026-01-01T00:00:00Z", evidenceId: "evidence" }],
  });
  const save = vi.spyOn(ledgerEndpoints, "recordOperation").mockImplementation(async body => ({ id: (body as { id: string }).id }));
  const commit = vi.spyOn(ledgerEndpoints, "commitOperation")
    .mockRejectedValueOnce(new Error("Lost commit response")).mockResolvedValue({ id: "committed" });
  const screenView = render(<MemoryRouter><OperationEntryPage /></MemoryRouter>);
  await screen.findByRole("option", { name: "Mill" });
  fireEvent.change(screen.getByLabelText("Processing equipment"), { target: { value: "equipment" } });
  fireEvent.change(screen.getByLabelText("Output storage location"), { target: { value: "output" } });
  fireEvent.change(screenView.container.querySelector("#input-mass-field")!, { target: { value: "10" } });
  fireEvent.change(screenView.container.querySelector("#head-rice-field")!, { target: { value: output } });
  const submit = screen.getByRole("button", { name: "Validate & Record in Ledger" });
  fireEvent.click(submit);
  if (awaitingReview) {
    await screen.findByRole("link", { name: "Processing variance review" });
    expect(commit).not.toHaveBeenCalled();
  } else {
    await screen.findByText("Lost commit response");
    fireEvent.click(submit);
    await waitFor(() => expect(commit).toHaveBeenCalledTimes(2));
    expect(commit.mock.calls[1]).toEqual(commit.mock.calls[0]);
  }
  expect(save).toHaveBeenCalledTimes(1);
  expect(save).toHaveBeenCalledWith({
    id: expect.any(String), ownerId: "owner", facilityId: "facility", kind: "MILLING",
    equipmentId: "equipment", occurredAt: expect.any(String), declaredLossKg: "0", declaredLossReason: "",
    inputs: [{ lotId: "lot", locationId: "input", quantityKg: "10", poolRevision: 4 }],
    outputs: [{ id: expect.any(String), stage: "HEAD_RICE", productIdentity: "HEAD_RICE", locationId: "output", commodityId: "commodity", quantityKg: output }],
  });
});
