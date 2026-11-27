import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { cleanup, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import type { ReactNode } from "react";
import { authEndpoints } from "@/api/auth";
import { ApiError } from "@/api/client";
import { catalogsEndpoints } from "@/api/catalogs";
import { exportEndpoints, type ExportContainerDto } from "@/api/exports";
import { ledgerEndpoints, type CorrectionOperation } from "@/api/ledger";
import i18n from "@/app/i18n";
import { useAuthStore } from "@/app/store/authStore";
import { RegisterPage } from "@/features/auth/pages/RegisterPage";
import { StockTransferPage } from "@/features/mill/pages/StockTransferPage";
import { VarianceReviewPage } from "@/features/mill/pages/VarianceReviewPage";
import { ExportOrderMaintenance } from "@/features/export/components/ExportOrderMaintenance";
import type { UserRole } from "@/shared/types/roles";

function mount(children: ReactNode) {
  const cache = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(<QueryClientProvider client={cache}><MemoryRouter>{children}</MemoryRouter></QueryClientProvider>);
}

function signIn(role: UserRole, permissions: string[]) {
  useAuthStore.setState({ user: { id: "actor", role, permissions, isActive: true, displayName: "Actor", email: "actor@example.test", assignedFacilities: ["mill"] } });
}

const page = <T,>(items: T[]) => ({ items, page: 1, pageSize: 20, totalCount: items.length, hasMore: false });

beforeEach(async () => { await i18n.changeLanguage("en"); });
afterEach(() => { cleanup(); vi.restoreAllMocks(); useAuthStore.setState({ user: null }); });

it("registers and resends verification before submitting the same email and a leading-zero OTP", async () => {
  const pending = { email: "new@example.test", registrationId: "registration", expiresIn: 600 };
  const register = vi.spyOn(authEndpoints, "register").mockResolvedValue(pending);
  const resend = vi.spyOn(authEndpoints, "resendVerification").mockResolvedValue(pending);
  const verify = vi.spyOn(authEndpoints, "verifyEmail").mockResolvedValue({ id: "new", email: pending.email, displayName: "New user", phoneNumber: null, organizationId: null, organizationName: null, role: null, permissions: [], isActive: false });
  mount(<RegisterPage />);
  expect(screen.getByText("Step 1 / 2")).toBeTruthy();
  const googleLink = screen.getByRole("link", { name: "Continue with Google" });
  expect(googleLink.querySelector("svg")).toBeTruthy();
  fireEvent.change(screen.getByLabelText("Full name"), { target: { value: "New user" } });
  fireEvent.change(screen.getByLabelText("Email address"), { target: { value: pending.email } });
  fireEvent.change(screen.getByLabelText("New password"), { target: { value: "LongPassword#42" } });
  fireEvent.click(screen.getByRole("button", { name: "Create account" }));
  await screen.findByRole("heading", { name: "Verify email" });
  expect(screen.getByText("Step 2 / 2")).toBeTruthy();
  expect(register).toHaveBeenCalledWith({ email: pending.email, displayName: "New user", password: "LongPassword#42" });
  fireEvent.click(screen.getByRole("button", { name: "Resend code" }));
  await screen.findByText("A new verification code was sent.");
  expect(resend).toHaveBeenCalledWith({ email: pending.email, registrationId: pending.registrationId });
  fireEvent.change(screen.getByLabelText("Six-digit verification code"), { target: { value: "012345" } });
  fireEvent.click(screen.getByRole("button", { name: "Verify email" }));
  await screen.findByRole("heading", { name: "Email verified" });
  expect(screen.getByText("Completed")).toBeTruthy();
  expect(verify).toHaveBeenCalledWith({ email: pending.email, registrationId: pending.registrationId, otp: "012345" });
});

it("uses available stock, excludes uncleared compartments and retries the same transfer with its numeric pool revision", async () => {
  signIn("MILL_OPERATOR", ["conversions.write", "lots.read.facility"]);
  const source = { id: "source", facilityId: "mill", name: "Pool A", kind: "STORE", cleared: true, mixedBulk: true, ownerId: "owner", version: "v1" };
  const destination = { ...source, id: "destination", name: "Bay B", mixedBulk: false };
  const uncleared = { ...destination, id: "uncleared", name: "Uncleared C", kind: "COMPARTMENT", ownerId: null, cleared: false };
  const lot = { id: "lot", code: "LOT-001", ownerId: "owner", isCurrentPool: true, poolRevision: 11, positions: [{ locationId: source.id, availableKg: "12.500000", poolRevision: 11 }] };
  vi.spyOn(ledgerEndpoints, "getLookups").mockResolvedValue({ facilities: [{ id: "mill", name: "Test mill" }], locations: [source, destination, uncleared] });
  vi.spyOn(ledgerEndpoints, "getLots").mockResolvedValue(page([lot]));
  vi.spyOn(ledgerEndpoints, "getLot").mockResolvedValue(lot);
  const transfer = vi.spyOn(ledgerEndpoints, "postTransfer").mockRejectedValueOnce(new ApiError(0, "Response lost")).mockResolvedValue({ id: "transfer" });
  mount(<StockTransferPage />);
  await screen.findByRole("option", { name: "LOT-001" });
  fireEvent.change(screen.getByLabelText("Stock lot"), { target: { value: lot.id } });
  await screen.findByRole("option", { name: /Pool A.*12\.500000/ });
  fireEvent.change(screen.getByLabelText("Source location"), { target: { value: source.id } });
  expect(screen.queryByRole("option", { name: /Uncleared C/ })).toBeNull();
  fireEvent.change(screen.getByLabelText("Destination location"), { target: { value: destination.id } });
  fireEvent.change(screen.getByLabelText("Transfer quantity (kg)"), { target: { value: "12.500001" } });
  fireEvent.click(screen.getByRole("button", { name: "Post transfer" }));
  expect(transfer).not.toHaveBeenCalled();
  fireEvent.change(screen.getByLabelText("Transfer quantity (kg)"), { target: { value: "12.500000" } });
  fireEvent.click(screen.getByRole("button", { name: "Post transfer" }));
  fireEvent.click(await screen.findByRole("button", { name: "Retry" }));
  await screen.findByText("Transfer posted to the ledger.");
  expect(transfer).toHaveBeenCalledTimes(2);
  expect(transfer.mock.calls[1]).toEqual(transfer.mock.calls[0]);
  expect(transfer.mock.calls[0][0]).toMatchObject({ lotId: "lot", fromLocationId: "source", toLocationId: "destination", quantityKg: "12.500000", poolRevision: 11 });
});

it("confirms the selected draft version with uploaded evidence through the manager queue", async () => {
  signIn("MILL_MANAGER", ["conversions.confirm"]);
  const draft: CorrectionOperation = { id: "draft", version: "version-1", kind: "MILLING", status: "DRAFT", ownerId: "owner", facilityId: "mill", equipmentId: "equipment", occurredAt: "2026-11-01T08:00:00Z", declaredLossKg: "0", varianceKg: "1", inputs: [{ lotId: "input", locationId: "in", quantityKg: "10" }], outputs: [{ id: "output", locationId: "out", code: "OUTPUT-01", stage: "HEAD_RICE", commodityId: "grain", quantityKg: "9" }] };
  const queue = vi.spyOn(ledgerEndpoints, "getOperations").mockResolvedValue(page([draft]));
  vi.spyOn(ledgerEndpoints, "getOperation").mockResolvedValue(draft);
  vi.spyOn(ledgerEndpoints, "getLookups").mockResolvedValue({ facilities: [{ id: "mill", name: "Test mill" }] });
  const evidence = vi.spyOn(ledgerEndpoints, "uploadEvidence").mockResolvedValue({});
  const confirm = vi.spyOn(ledgerEndpoints, "confirmOperation").mockResolvedValue({});
  mount(<VarianceReviewPage />);
  fireEvent.click(await screen.findByRole("button", { name: /OUTPUT-01/ }));
  fireEvent.change(await screen.findByLabelText(/Review document/), { target: { files: [new File(["review"], "review.txt", { type: "text/plain" })] } });
  fireEvent.click(screen.getByRole("button", { name: "Upload evidence" }));
  await screen.findByText(/Evidence stored/);
  fireEvent.change(screen.getByLabelText("Reason"), { target: { value: "Verified weigh sheets" } });
  fireEvent.click(screen.getByLabelText(/reviewed the displayed masses/));
  fireEvent.click(screen.getByRole("button", { name: "Confirm variance" }));
  await screen.findByText(/The operator can post/);
  expect(queue).toHaveBeenCalledWith(expect.objectContaining({ status: "DRAFT", queueOnly: true }));
  expect(confirm).toHaveBeenCalledWith("draft", { version: "version-1", evidenceId: evidence.mock.calls[0][0].id, reason: "Verified weigh sheets" });
});

it("uses the container ETag and preserves its mass unit when changing the target", async () => {
  const container: ExportContainerDto = { id: "target", orderId: "order", internalCode: "CON-01", targetMassKg: "25000.000000", originalMass: "25", originalUnit: "T", status: "PLANNED", version: 4 };
  vi.spyOn(exportEndpoints, "getContainerResource").mockResolvedValue({ data: container, etag: '"4"' });
  vi.spyOn(catalogsEndpoints, "getMarkets").mockResolvedValue(page([]));
  vi.spyOn(catalogsEndpoints, "getCommodities").mockResolvedValue(page([]));
  vi.spyOn(catalogsEndpoints, "getQualityAttributes").mockResolvedValue(page([]));
  vi.spyOn(catalogsEndpoints, "getMeasurementUnits").mockResolvedValue(page([{ id: "tonne", code: "T", name: "Tonne", quantityKind: "MASS", isDeleted: false } as Awaited<ReturnType<typeof catalogsEndpoints.getMeasurementUnits>>["items"][number]]));
  const submit = vi.spyOn(exportEndpoints, "updateContainer").mockResolvedValue(container);
  const saved = vi.fn().mockResolvedValue(undefined);
  mount(<ExportOrderMaintenance action={{ type: "target", container }} onClose={() => {}} onSaved={saved} />);
  const dialog = within(await screen.findByRole("dialog", { name: "Edit container target" }));
  fireEvent.change(await dialog.findByLabelText("Mass"), { target: { value: "26" } });
  fireEvent.click(dialog.getByRole("button", { name: "Save changes" }));
  await waitFor(() => expect(saved).toHaveBeenCalledOnce());
  expect(submit).toHaveBeenCalledWith(container.id, { operationId: expect.any(String), targetMass: "26", unit: "T" }, '"4"');
});
