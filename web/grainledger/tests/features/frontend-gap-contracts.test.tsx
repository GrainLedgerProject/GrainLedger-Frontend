import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { cleanup, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { authEndpoints } from "@/api/auth";
import { catalogsEndpoints } from "@/api/catalogs";
import { configureApiSession } from "@/api/session";
import { ledgerEndpoints, type ReceivingTask } from "@/api/ledger";
import { procurementEndpoints } from "@/api/procurement";
import i18n from "@/app/i18n";
import { useAuthStore } from "@/app/store/authStore";
import { PesticideDeclarationPage } from "@/features/field/pages/PesticideDeclarationPage";
import { ReceivingTasksPage } from "@/features/mill/pages/ReceivingTasksPage";
import type { UserRole } from "@/shared/types/roles";

const page = <T,>(items: T[]) => ({ items, page: 1, pageSize: 20, totalCount: items.length, hasMore: false });

function renderAs(role: UserRole, permissions: string[], content: React.ReactNode) {
  useAuthStore.setState({ user: { id: "gap-test", organizationId: "tenant", displayName: "Test user", email: "test@example.test", role, permissions, isActive: true } });
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  render(<QueryClientProvider client={client}><MemoryRouter>{content}</MemoryRouter></QueryClientProvider>);
}

beforeEach(async () => { await i18n.changeLanguage("en"); });
afterEach(() => {
  cleanup();
  localStorage.clear();
  useAuthStore.getState().logout();
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
  configureApiSession({ read: () => ({ version: 0, ownerKey: null, accessToken: null, refreshToken: null }), apply: vi.fn(), expire: vi.fn(), setConnected: vi.fn() });
});

it("records the selected plot season and all declared items using schema 2 and retries the same envelope", async () => {
  vi.spyOn(procurementEndpoints, "getSprayDeclarations").mockResolvedValue(page([]));
  vi.spyOn(procurementEndpoints, "getPlotSeasons").mockResolvedValue(page([
    { id: "plot-season", plotId: "plot", seasonId: "season", plotCode: "P-01", seasonName: "Summer", riceVariety: "ST25",
      createdBy: null, version: 1, canEdit: true, canDelete: true },
  ]));
  vi.spyOn(catalogsEndpoints, "getActiveSubstances").mockResolvedValue(page([]));
  const save = vi.spyOn(procurementEndpoints, "recordSprayDeclaration")
    .mockRejectedValueOnce(new Error("Unknown outcome")).mockResolvedValueOnce({ id: "created" });
  renderAs("CUSTOMER_PROCUREMENT_OFFICER", ["farms.write"], <PesticideDeclarationPage />);
  fireEvent.click(screen.getByRole("button", { name: "Record application" }));
  const dialog = within(await screen.findByRole("dialog", { name: "Record an application" }));
  await dialog.findByRole("option", { name: "P-01 · Summer · ST25" });
  fireEvent.change(dialog.getByLabelText("Plot and season *"), { target: { value: "plot-season" } });
  fireEvent.change(dialog.getByLabelText("Information source *"), { target: { value: "Farm log" } });
  fireEvent.change(dialog.getByLabelText("Evidence reference"), { target: { value: "Page 18" } });
  fireEvent.click(dialog.getByRole("button", { name: "Add product or substance" }));
  const [first, second] = dialog.getAllByLabelText("Product name");
  fireEvent.change(first, { target: { value: "Product A" } });
  fireEvent.change(second, { target: { value: "Product B" } });
  fireEvent.click(dialog.getByRole("button", { name: "Save declaration" }));
  await dialog.findByRole("alert");
  fireEvent.click(dialog.getByRole("button", { name: "Retry" }));
  await waitFor(() => expect(save).toHaveBeenCalledTimes(2));
  expect(save.mock.calls[1][0]).toEqual(save.mock.calls[0][0]);
  expect(save.mock.calls[0][0]).toMatchObject({ payloadSchemaVersion: 2, payload: {
    plotSeasonId: "plot-season", informationSource: "Farm log", evidenceRef: "Page 18",
    items: [{ productName: "Product A", substanceId: null }, { productName: "Product B", substanceId: null }],
  } });
  await screen.findByText("Pesticide declaration saved.");
  expect(localStorage.getItem("grainledger:spray-pending:tenant:gap-test")).toBeNull();
});

const task: ReceivingTask = {
  id: "receipt", code: "RCT-01", ownerCompanyId: "tenant", ownerCompanyName: "Owner",
  facilityId: "facility", facilityName: "Mill", receivingLocationName: "Scale",
  status: "PENDING_ARRIVAL", receivingVersion: 4, receivedAt: "2026-01-01T00:00:00Z",
  expectedTotalKg: "20", actualTotalKg: null, usableStockKg: "0", latestMeasurementSetId: null,
  effectiveThreshold: { percentage: "0.25", revision: "threshold", source: "COMPANY_OVERRIDE" },
  items: [
    { id: "line-a", lineNo: 1, lotCode: "A", riceVariety: "ST25", expectedKg: "10", actualKg: null },
    { id: "line-b", lineNo: 2, lotCode: "B", riceVariety: "ST25", expectedKg: "10", actualKg: null },
  ],
  measurementSets: [], reviews: [],
};

function mockReceiving(record: ReceivingTask) {
  vi.spyOn(ledgerEndpoints, "getLookups").mockResolvedValue({ facilities: [{ id: "facility", name: "Mill" }] });
  const list = vi.spyOn(ledgerEndpoints, "getReceivingTasks").mockResolvedValue(page([record]));
  vi.spyOn(ledgerEndpoints, "getReceiving").mockResolvedValue(record);
  return list;
}

it("records each actual measurement against its procurement line and current version", async () => {
  const queue = mockReceiving(task);
  const measure = vi.spyOn(ledgerEndpoints, "recordReceivingMeasurement").mockResolvedValue({ ...task, status: "RECEIVED_MATCHED", receivingVersion: 5 });
  renderAs("MILL_OPERATOR", ["lots.receive"], <ReceivingTasksPage />);
  fireEvent.click(await screen.findByRole("button", { name: "RCT-01" }));
  const fields = await screen.findAllByLabelText("Measured quantity *");
  fireEvent.change(fields[0], { target: { value: "10" } });
  fireEvent.change(fields[1], { target: { value: "10000" } });
  fireEvent.change(screen.getAllByLabelText("Unit")[1], { target: { value: "G" } });
  fireEvent.click(screen.getByLabelText("I confirm the measurement for each line."));
  fireEvent.click(screen.getByRole("button", { name: "Save measurements" }));
  await waitFor(() => expect(measure).toHaveBeenCalledWith("receipt", expect.objectContaining({
    expectedReceivingVersion: 4,
    items: [
      { procurementItemId: "line-a", measuredValue: "10", measuredUnit: "KG" },
      { procurementItemId: "line-b", measuredValue: "10000", measuredUnit: "G" },
    ],
  })));
  expect(queue).toHaveBeenCalledWith(expect.objectContaining({ facilityId: "facility", page: 1 }));
});

it("binds a manager decision to the saved measurement set and uploaded evidence", async () => {
  const reviewed: ReceivingTask = {
    ...task, status: "AWAITING_MANAGER_REVIEW", latestMeasurementSetId: "set", receivingVersion: 5,
    items: task.items.map((row, index) => ({ ...row, actualKg: index === 0 ? "9" : "10" })),
    measurementSets: [{ id: "set", recordedAt: task.receivedAt, capturedAt: task.receivedAt,
      observations: "", threshold: task.effectiveThreshold, items: [] }],
  };
  mockReceiving(reviewed);
  const upload = vi.spyOn(ledgerEndpoints, "uploadEvidence").mockResolvedValue(undefined);
  const save = vi.spyOn(ledgerEndpoints, "reviewReceiving").mockResolvedValue({ ...reviewed, status: "REMEASUREMENT_REQUESTED", receivingVersion: 6 });
  renderAs("MILL_MANAGER", ["receiving.reconcile"], <ReceivingTasksPage />);
  fireEvent.click(await screen.findByRole("button", { name: "RCT-01" }));
  fireEvent.change(await screen.findByLabelText("Decision *"), { target: { value: "REQUEST_REMEASUREMENT" } });
  fireEvent.change(screen.getByLabelText("Reason *"), { target: { value: "Recheck scale" } });
  fireEvent.change(screen.getByLabelText("Review document / weighing record"), { target: { files: [new File(["scale"], "scale.txt")] } });
  fireEvent.click(screen.getByRole("button", { name: "Upload evidence" }));
  await waitFor(() => expect((screen.getByRole("button", { name: "Record decision" }) as HTMLButtonElement).disabled).toBe(false));
  fireEvent.click(screen.getByRole("button", { name: "Record decision" }));
  await waitFor(() => expect(save).toHaveBeenCalledWith("receipt", expect.objectContaining({
    expectedReceivingVersion: 5, measurementSetId: "set", action: "REQUEST_REMEASUREMENT", reason: "Recheck scale",
    evidenceId: upload.mock.calls[0][0].id,
  })));
});

it("sends the backend CSRF token when revoking a Google cookie session", async () => {
  configureApiSession({
    read: () => ({ version: 1, ownerKey: "tenant:user", accessToken: null, refreshToken: null, cookieSession: true }),
    apply: vi.fn(), expire: vi.fn(), setConnected: vi.fn(),
  });
  const fetch = vi.fn<typeof globalThis.fetch>()
    .mockResolvedValueOnce(Response.json({ token: "anti-forgery" }))
    .mockResolvedValueOnce(new Response(null, { status: 204 }));
  vi.stubGlobal("fetch", fetch);
  await authEndpoints.logoutAll();
  expect(fetch.mock.calls.map(([url]) => url)).toEqual(["/api/auth/csrf", "/api/auth/logout-all"]);
  expect(new Headers(fetch.mock.calls[1][1]?.headers).get("X-CSRF-TOKEN")).toBe("anti-forgery");
  expect(fetch.mock.calls[1][1]).toMatchObject({ method: "POST", credentials: "include" });
});
