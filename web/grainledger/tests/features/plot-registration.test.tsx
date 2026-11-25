import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import i18n from "@/app/i18n";
import { procurementEndpoints, type PlotGeometry } from "@/api/procurement";
import { PlotRegistrationPage } from "@/features/field/pages/PlotRegistrationPage";

vi.mock("@/features/field/components/MapLocationPicker", () => ({
  MapLocationPicker: ({ polygon, onChange }: {
    polygon?: [number, number][][];
    onChange: (point: { lat: number; lng: number; formatted: string }) => void;
  }) => polygon ? <span>Saved polygon</span> : (
    <button type="button" onClick={() => onChange({ lat: 10.3541, lng: 106.0125, formatted: "10.3541, 106.0125" })}>Select test location</button>
  ),
}));

const plot = { id: "plot", farmerId: "farmer", code: "PLT-0042-01", areaHa: 1.5, version: 4, canEdit: true };
const geometry: PlotGeometry = { type: "Polygon", coordinates: [[[106, 10], [106, 11], [107, 11], [106, 10]]] };

function mount() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  render(<QueryClientProvider client={client}><PlotRegistrationPage /></QueryClientProvider>);
}

beforeEach(async () => {
  await i18n.changeLanguage("en");
  vi.spyOn(procurementEndpoints, "getPlots").mockResolvedValue({ items: [plot] });
  vi.spyOn(procurementEndpoints, "getFarmers").mockResolvedValue({ items: [{ id: "farmer", code: "FRM-0042", name: "Example farmer" }] });
});
afterEach(cleanup);

it("uses schema v2 and displays the server-assigned plot code", async () => {
  const point: PlotGeometry = { type: "Point", coordinates: [106.0125, 10.3541] };
  const create = vi.spyOn(procurementEndpoints, "createPlot").mockResolvedValue({ ...plot, code: "PLT-0042-02", geometry: point });
  mount();
  await screen.findByText(plot.code);
  fireEvent.click(screen.getByRole("button", { name: "Add plot" }));
  const dialog = within(screen.getByRole("dialog", { name: "Register plot" }));
  fireEvent.change(dialog.getByRole("spinbutton"), { target: { value: "1.5" } });
  fireEvent.click(dialog.getByRole("button", { name: "Select test location" }));
  fireEvent.click(dialog.getByRole("button", { name: "Register plot" }));
  expect(await screen.findByText("Registered plot PLT-0042-02")).toBeTruthy();
  expect(create).toHaveBeenCalledWith(expect.objectContaining({
    payloadSchemaVersion: 2,
    payload: expect.objectContaining({ code: null, farmerId: "farmer", areaHa: 1.5, geometry: point }),
  }));
});

it("loads plot detail before editing and keeps the existing polygon and owner", async () => {
  const detail = vi.spyOn(procurementEndpoints, "getPlot").mockResolvedValue({ ...plot, geometry });
  const update = vi.spyOn(procurementEndpoints, "updatePlot").mockResolvedValue({});
  mount();
  fireEvent.click(await screen.findByRole("button", { name: "Edit plot" }));
  const dialog = within(await screen.findByRole("dialog", { name: "Update plot" }));
  expect(detail).toHaveBeenCalledWith(plot.id);
  expect(dialog.getByText("Saved polygon")).toBeTruthy();
  expect((dialog.getByRole("combobox") as HTMLSelectElement).disabled).toBe(true);
  fireEvent.change(dialog.getByRole("spinbutton"), { target: { value: "2.5" } });
  fireEvent.click(dialog.getByRole("button", { name: "Save changes" }));
  await waitFor(() => expect(update).toHaveBeenCalledWith(plot.id, {
    farmerId: plot.farmerId, code: null, geometry, areaHa: 2.5, expectedVersion: 4,
  }));
});
