import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { cleanup, fireEvent, render, screen, within } from "@testing-library/react";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import i18n from "@/app/i18n";
import { useAuthStore } from "@/app/store/authStore";
import { CropSeasonsPage } from "@/features/field/pages/CropSeasonsPage";
import type { UserRole } from "@/shared/types/roles";

const companyId = "10000000-0000-4000-8000-000000000001";
const season = {
  id: "10000000-0000-4000-8000-000000000002", companyId, name: "Winter–Spring 2027",
  startsOn: "2026-12-01", endsOn: "2027-03-31", createdBy: "actor", version: 9, canEdit: true, canDelete: true,
};
const plot = { id: "10000000-0000-4000-8000-000000000003", code: "PLT-100" };
const calls = vi.fn<typeof fetch>();
const requests = (method: string) => calls.mock.calls.filter(([, init]) => (init?.method ?? "GET") === method);
const url = (request: RequestInfo | URL) => new URL(String(request), "http://localhost");
const page = <T,>(items: T[]) => Response.json({ items, page: 1, pageSize: 15, totalCount: items.length, hasMore: false });

function openAs(role: UserRole, permissions: string[]) {
  useAuthStore.setState({ user: { id: "actor", organizationId: companyId, role, permissions, isActive: true, displayName: "Test user", email: "test@example.test" } });
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(<QueryClientProvider client={client}><CropSeasonsPage /></QueryClientProvider>);
}

beforeEach(async () => {
  await i18n.changeLanguage("en");
  calls.mockReset();
  vi.stubGlobal("fetch", calls);
});

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
  useAuthStore.setState({ user: null });
});

it("creates a season for the chosen customer and updates it with the loaded reference version", async () => {
  let created = false;
  let current = season;
  calls.mockImplementation(async (input, init) => {
    if (url(input).pathname === "/api/admin/organizations") return Response.json([{ id: companyId, kind: "Customer", name: "Customer One" }, { id: "mill", kind: "Mill", name: "Mill One" }]);
    if (init?.method === "POST") { created = true; return Response.json(season, { status: 201 }); }
    if (init?.method === "PUT") { current = { ...season, name: "Updated season", version: 10 }; return Response.json(current); }
    if (url(input).pathname === `/api/crop-seasons/${season.id}`) return Response.json(current);
    return page(created ? [current] : []);
  });
  openAs("MILL_ADMIN", ["platform.configure"]);
  await screen.findByRole("option", { name: "Customer One" });
  expect(screen.queryByRole("option", { name: "Mill One" })).toBeNull();
  expect(requests("GET").map(([input]) => url(input).pathname)).toEqual(["/api/admin/organizations"]);
  fireEvent.change(screen.getByLabelText("Customer company"), { target: { value: companyId } });
  fireEvent.click(await screen.findByRole("button", { name: "Add season" }));
  const create = within(screen.getByRole("dialog", { name: "Add season" }));
  fireEvent.change(create.getByLabelText("Season name"), { target: { value: season.name } });
  fireEvent.change(create.getByLabelText("Start date"), { target: { value: season.startsOn } });
  fireEvent.change(create.getByLabelText("End date"), { target: { value: "2026-11-30" } });
  fireEvent.click(create.getByRole("button", { name: "Save changes" }));
  expect(requests("POST")).toHaveLength(0);
  fireEvent.change(create.getByLabelText("End date"), { target: { value: season.endsOn } });
  fireEvent.click(create.getByRole("button", { name: "Save changes" }));
  await screen.findByText("Season added.");
  const body = { companyId, name: season.name, startsOn: season.startsOn, endsOn: season.endsOn };
  expect(JSON.parse(String(requests("POST")[0][1]?.body))).toEqual(body);
  expect(requests("GET").find(([input]) => url(input).pathname === "/api/crop-seasons")?.[0]).toContain(`companyId=${companyId}`);
  fireEvent.click(await screen.findByRole("button", { name: "Edit season" }));
  const edit = within(screen.getByRole("dialog", { name: "Edit season" }));
  fireEvent.change(edit.getByLabelText("Season name"), { target: { value: "Updated season" } });
  fireEvent.click(edit.getByRole("button", { name: "Save changes" }));
  await screen.findByText("Season updated.");
  expect(JSON.parse(String(requests("PUT")[0][1]?.body))).toEqual({ ...body, name: "Updated season", expectedVersion: 9 });
  expect(requests("GET").some(([input]) => url(input).pathname === "/api/plot-seasons")).toBe(false);
});

it("links a plot with schema v1, replays the exact request after a lost response, and protects referenced links", async () => {
  let linked = false;
  calls.mockImplementation(async (input, init) => {
    const endpoint = url(input);
    if (endpoint.pathname === "/api/plots") return page([plot]);
    if (endpoint.pathname === `/api/crop-seasons/${season.id}`) return Response.json(season);
    if (endpoint.pathname === "/api/plot-seasons") {
      if (init?.method === "POST") {
        if (requests("POST").length === 1) throw new TypeError("Connection lost");
        linked = true;
        return Response.json({ id: "link", ...JSON.parse(String(init.body)).payload });
      }
      return page(linked ? [{ id: "link", plotCode: plot.code, riceVariety: "ST25", canEdit: false, canDelete: false }] : []);
    }
    return page([season]);
  });
  openAs("CUSTOMER_PROCUREMENT_OFFICER", ["farms.write"]);
  fireEvent.click(await screen.findByRole("button", { name: season.name }));
  fireEvent.click(await screen.findByRole("button", { name: "Link plot" }));
  const dialog = within(screen.getByRole("dialog", { name: "Link plot" }));
  await dialog.findByRole("option", { name: plot.code });
  fireEvent.change(dialog.getByLabelText("Plot code"), { target: { value: plot.id } });
  fireEvent.change(dialog.getByLabelText("Rice variety"), { target: { value: " ST25 " } });
  fireEvent.click(dialog.getByRole("button", { name: "Save changes" }));
  fireEvent.click(await dialog.findByRole("button", { name: "Retry" }));
  expect(await screen.findByText("Plot linked to the season.")).toBeTruthy();
  expect(await screen.findByText("Read only")).toBeTruthy();
  expect(screen.queryByRole("button", { name: "Add season" })).toBeNull();
  expect(screen.queryByRole("button", { name: `Edit plot ${plot.code}` })).toBeNull();
  expect(url(requests("GET").find(([input]) => url(input).pathname === "/api/plot-seasons")![0]).searchParams.get("seasonId")).toBe(season.id);
  const [first, retry] = requests("POST");
  expect(retry[1]?.body).toBe(first[1]?.body);
  expect(JSON.parse(String(first[1]?.body))).toMatchObject({
    payloadSchemaVersion: 1, payload: { plotId: plot.id, seasonId: season.id, riceVariety: "ST25" },
  });
});

it("keeps the season and plot actions read-only for the customer manager", async () => {
  calls.mockImplementation(async input => {
    if (url(input).pathname === `/api/crop-seasons/${season.id}`) return Response.json(season);
    if (url(input).pathname === "/api/plot-seasons") return page([{ id: "link", plotCode: plot.code, riceVariety: "ST25", canEdit: true, canDelete: true }]);
    return page([season]);
  });
  openAs("CUSTOMER_MANAGER", ["farms.read"]);
  fireEvent.click(await screen.findByRole("button", { name: season.name }));
  expect(await screen.findByText("ST25")).toBeTruthy();
  for (const name of ["Add season", "Edit season", "Link plot", `Edit plot ${plot.code}`, `Unlink plot ${plot.code}`]) {
    expect(screen.queryByRole("button", { name })).toBeNull();
  }
});
