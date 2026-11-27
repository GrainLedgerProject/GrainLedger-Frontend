import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen, within } from "@testing-library/react";
import i18n from "@/app/i18n";
import { useAuthStore } from "@/app/store/authStore";
import { useUiStore } from "@/app/store/uiStore";
import { FarmerRegistrationPage } from "@/features/field/pages/FarmerRegistrationPage";

vi.mock("@/features/field/offline/offlineCache", () => ({
  getCachedFarmers: vi.fn().mockResolvedValue([]),
  saveCachedFarmers: vi.fn().mockResolvedValue(undefined),
}));

const farmer = {
  id: "10000000-0000-4000-8000-000000000001",
  code: "FRM-0042",
  name: "Farmer Example",
  contact: null,
  createdAt: "2026-11-24T03:00:00Z",
  version: 7,
};
const request = vi.fn<typeof fetch>();

beforeEach(async () => {
  await i18n.changeLanguage("en");
  useAuthStore.setState({
    isAuthenticated: true,
    accessToken: "mock",
    user: {
      id: "purchaser-1",
      email: "purchaser@grainledger.test",
      displayName: "Purchaser",
      role: "CUSTOMER_PROCUREMENT_OFFICER",
      permissions: ["farms.write", "purchases.write"],
      isActive: true,
    },
  });
  useUiStore.setState({ isOnline: true });
  request.mockReset();
  vi.stubGlobal("fetch", request);
});

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
  useAuthStore.setState({ user: null, isAuthenticated: false, accessToken: null });
});

describe("Farmer registration modal", () => {
  it("sends schema version 2 with a server-assigned code and replays the same request after a lost response", async () => {
    let attempts = 0;
    request.mockImplementation(async (_url, init) => {
      if (init?.method !== "POST") return Response.json({ items: [] });
      attempts++;
      if (attempts === 1) throw new TypeError("Connection lost");
      return Response.json(farmer);
    });
    render(<FarmerRegistrationPage />);
    await screen.findByText("No farmers yet");
    fireEvent.click(screen.getByRole("button", { name: "Add farmer" }));
    const dialog = within(screen.getByRole("dialog", { name: "Register farmer" }));
    expect(dialog.getByText("The system assigns a code after registration.")).toBeTruthy();
    expect(dialog.getAllByRole("textbox")).toHaveLength(2);
    fireEvent.change(dialog.getByRole("textbox", { name: /Farmer full name/ }), {
      target: { value: "  Farmer Example  " },
    });
    fireEvent.click(dialog.getByRole("button", { name: "Register" }));
    await dialog.findByRole("alert");
    fireEvent.click(dialog.getByRole("button", { name: "Register" }));
    await screen.findByText("Registered farmer Farmer Example (code FRM-0042)");

    const submissions = request.mock.calls.filter(([, init]) => init?.method === "POST");
    expect(submissions).toHaveLength(2);
    expect(new URL(String(submissions[0][0]), "http://localhost").pathname).toBe("/api/farmers");
    const body = JSON.parse(String(submissions[0][1]?.body));
    expect(body).toEqual({
      deviceId: "grainledger-web",
      clientOperationId: expect.stringMatching(/^[\da-f-]{36}$/i),
      capturedAt: expect.stringMatching(/^\d{4}-\d{2}-\d{2}T/),
      payloadSchemaVersion: 2,
      payload: {
        entityId: expect.stringMatching(/^[\da-f-]{36}$/i),
        code: null,
        name: "Farmer Example",
        contact: null,
      },
    });
    expect(submissions[1][1]?.body).toBe(submissions[0][1]?.body);
  });

  it("updates the current version without changing the code and shows API errors in the modal", async () => {
    request.mockImplementation(async (_url, init) => {
      if (init?.method === "PUT") {
        return Response.json(
          { title: "The farmer changed. Reload before editing.", code: "REFERENCE_STALE" },
          { status: 412, headers: { "Content-Type": "application/problem+json" } },
        );
      }
      return Response.json({ items: [farmer] });
    });
    render(<FarmerRegistrationPage />);
    fireEvent.click(await screen.findByRole("button", { name: "Edit farmer" }));
    const dialog = within(screen.getByRole("dialog", { name: "Update farmer" }));
    expect(dialog.getByText(farmer.code)).toBeTruthy();
    expect(dialog.getAllByRole("textbox")).toHaveLength(2);
    fireEvent.change(dialog.getByRole("textbox", { name: /Farmer full name/ }), {
      target: { value: "Updated farmer" },
    });
    fireEvent.click(dialog.getByRole("button", { name: "Save changes" }));
    expect((await dialog.findByRole("alert")).textContent).toContain("Reload before editing.");
    const update = request.mock.calls.find(([, init]) => init?.method === "PUT");
    expect(new URL(String(update?.[0]), "http://localhost").pathname).toBe(`/api/farmers/${farmer.id}`);
    expect(JSON.parse(String(update?.[1]?.body))).toEqual({
      code: null,
      name: "Updated farmer",
      contact: null,
      expectedVersion: 7,
    });
  });
});
