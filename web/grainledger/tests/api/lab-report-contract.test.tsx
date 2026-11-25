import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import i18n from "@/app/i18n";
import { useAuthStore } from "@/app/store/authStore";
import { MrlComplianceCheckPage } from "@/features/compliance/pages/MrlComplianceCheckPage";
import { labReportEndpoints, sampleEndpoints, type LabReportResponse } from "@/api/compliance";

vi.mock("@/api/compliance", () => ({
  labReportEndpoints: { getLabReport: vi.fn(), getLabReports: vi.fn(), confirmLabReport: vi.fn(), updateLabReport: vi.fn(), deleteLabReport: vi.fn() },
  sampleEndpoints: { getSamples: vi.fn() },
}));

const report: LabReportResponse = {
  id: "report", companyId: "company", laboratoryName: "Actual laboratory", reportNumber: "LAB-001", issuedOn: "2026-11-16",
  receivedAt: "2026-11-16T01:00:00Z", reportKind: "FINAL", relatedReportId: null, relationshipReason: null,
  laboratoryConclusion: null, statedStandard: null, fileName: "report.pdf", contentType: "application/pdf", fileSize: 100, sha256: "digest",
  recordedBy: "recorder", capturedAt: "2026-11-16T01:00:00Z", recordedAt: "2026-11-16T01:00:00Z", status: "PENDING_REVIEW",
  confirmedBy: null, confirmedAt: null, resultSets: [], relatedReports: [], assessmentStatus: "INCOMPLETE", suggestedMarketCode: "VN", assessmentReasons: [],
};

const result = {
  id: "reading", testLabel: "Reviewed pesticide", substanceId: "substance", originalResultText: "0.040 mg/kg", resultKind: "NUMERIC", numericValue: "0.040",
  unit: "mg/kg", lod: null, loq: "0.02", method: "Method A", uncertainty: "0.01", reference: "p. 3",
};
const draft = { ...report, resultSets: [{
  id: "section", sampleId: "sample", confirmedSampleId: null, sourceLotId: null, laboratorySampleReference: null,
  statedSampleCode: "SMP-1", statedSealCode: null, sectionReference: "p. 3", identityStatus: "MATCHED", results: [result],
}] };

beforeEach(async () => {
  vi.clearAllMocks();
  await i18n.changeLanguage("en");
  useAuthStore.setState({ user: { id: "reviewer", role: "CUSTOMER_MANAGER", organizationId: "company", permissions: ["lab.write"], isActive: true, displayName: "Reviewer", email: "reviewer@example.test" } });
  vi.mocked(sampleEndpoints.getSamples).mockResolvedValue({ items: [{ id: "sample", code: "SMP-1", sealCode: "SEAL-1" }], hasMore: false });
  vi.mocked(labReportEndpoints.getLabReports).mockResolvedValue({ items: [], page: 1, pageSize: 20, hasMore: false });
});

afterEach(() => { cleanup(); useAuthStore.setState({ user: null }); });

function mount() {
  const query = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  render(<QueryClientProvider client={query}><MemoryRouter initialEntries={["/compliance/lab-results/report"]}>
    <Routes><Route path="/compliance/lab-results" element={<MrlComplianceCheckPage />} /><Route path="/compliance/lab-results/:id" element={<MrlComplianceCheckPage />} /></Routes>
  </MemoryRouter></QueryClientProvider>);
}

describe("Lab response contract", () => {
  it("uses confirmedAt and renders absent results without substituting sample values", async () => {
    vi.mocked(labReportEndpoints.getLabReport).mockResolvedValue({ ...report, confirmedAt: "2026-11-16T02:00:00Z", confirmedBy: "reviewer", status: "CONFIRMED" });
    mount();
    const dialog = within(await screen.findByRole("dialog"));
    expect(dialog.queryByRole("button", { name: "Confirm report review" })).toBeNull();
    expect(dialog.queryByRole("button", { name: "Edit report draft" })).toBeNull();
    expect(dialog.getByText("Báo cáo chưa có bộ kết quả xét nghiệm.")).toBeTruthy();
    expect(dialog.queryByText("0.008 mg/kg")).toBeNull();
  });

  it("requires explicit checks and sends the selected sample match and as-received confirmation", async () => {
    vi.mocked(labReportEndpoints.getLabReport).mockResolvedValue(draft);
    vi.mocked(labReportEndpoints.confirmLabReport).mockResolvedValue({ ...draft, status: "CONFIRMED", confirmedAt: "2026-11-16T02:00:00Z" });
    mount();
    const dialog = within(await screen.findByRole("dialog"));
    await dialog.findByRole("option", { name: "SMP-1 · SEAL-1" });
    const asReceived = dialog.getByLabelText(/as-received basis/);
    expect((asReceived as HTMLInputElement).checked).toBe(false);
    fireEvent.change(dialog.getByLabelText("Registered sample"), { target: { value: "sample" } });
    fireEvent.change(dialog.getByLabelText("Sample identification basis"), { target: { value: "SAMPLE_CODE" } });
    fireEvent.click(dialog.getByLabelText(/matched every sample/));
    fireEvent.click(dialog.getByLabelText(/compared the transcribed/));
    fireEvent.click(asReceived);
    fireEvent.click(dialog.getByRole("button", { name: "Confirm report review" }));
    await waitFor(() => expect(labReportEndpoints.confirmLabReport).toHaveBeenCalledWith("report", expect.objectContaining({
      payloadSchemaVersion: 1,
      payload: { identityChecked: true, transcriptionChecked: true, asReceivedConfirmed: true, matches: [{ resultSetId: "section", sampleId: "sample", identityBasis: "SAMPLE_CODE", evidenceRef: null }] },
    })));
  });

  it("replaces a draft while retaining the original attachment and every result field", async () => {
    vi.mocked(labReportEndpoints.getLabReport).mockResolvedValue(draft);
    vi.mocked(labReportEndpoints.updateLabReport).mockResolvedValue({ ...draft, id: "replacement" });
    mount();
    fireEvent.click(await screen.findByRole("button", { name: "Edit report draft" }));
    const dialog = within(await screen.findByRole("dialog", { name: "Edit report draft" }));
    fireEvent.change(dialog.getByLabelText("Report number"), { target: { value: "LAB-001-REVISED" } });
    fireEvent.click(dialog.getByLabelText(/entire original file/));
    fireEvent.click(dialog.getByRole("button", { name: "Save draft" }));
    await waitFor(() => expect(labReportEndpoints.updateLabReport).toHaveBeenCalledWith("report", expect.objectContaining({
      payloadSchemaVersion: 1,
      payload: expect.objectContaining({ entityId: "report", reportNumber: "LAB-001-REVISED", contentBase64: null, receivedAt: draft.receivedAt, resultSets: [expect.objectContaining({ entityId: "section", results: [expect.objectContaining({ originalResultText: "0.040 mg/kg", uncertainty: "0.01", method: "Method A" })] })] }),
    })));
  });

  it("requires the draft deletion confirmation before sending the versioned capture envelope", async () => {
    vi.mocked(labReportEndpoints.getLabReport).mockResolvedValue(draft);
    vi.mocked(labReportEndpoints.deleteLabReport).mockResolvedValue(undefined);
    mount();
    fireEvent.click(await screen.findByRole("button", { name: "Delete draft" }));
    const dialog = within(await screen.findByRole("dialog", { name: "Delete draft" }));
    expect(labReportEndpoints.deleteLabReport).not.toHaveBeenCalled();
    fireEvent.click(dialog.getByRole("button", { name: "Delete draft" }));
    await waitFor(() => expect(labReportEndpoints.deleteLabReport).toHaveBeenCalledWith("report", expect.objectContaining({ deviceId: "grainledger-web", payloadSchemaVersion: 1, clientOperationId: expect.any(String), capturedAt: expect.any(String) })));
  });
});
