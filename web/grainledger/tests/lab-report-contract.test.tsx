import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { MrlComplianceCheckPage } from '@/features/compliance/pages/MrlComplianceCheckPage';
import { labReportEndpoints, type LabReportResponse } from '@/api/compliance';

vi.mock('@/api/compliance', () => ({ labReportEndpoints: { getLabReport: vi.fn(), getLabReports: vi.fn(), confirmLabReport: vi.fn() } }));
vi.mock('react-i18next', () => ({ useTranslation: () => ({ t: (_key: string, fallback: string) => fallback, i18n: { language: 'vi' } }) }));
afterEach(cleanup);
const report: LabReportResponse = { id: 'report', companyId: 'company', laboratoryName: 'Actual laboratory', reportNumber: 'LAB-001', issuedOn: '2026-11-16', receivedAt: '2026-11-16T01:00:00Z', reportKind: 'ORIGINAL', relatedReportId: null, relationshipReason: null, laboratoryConclusion: null, statedStandard: null, fileName: 'report.pdf', contentType: 'application/pdf', fileSize: 100, sha256: 'digest', recordedBy: 'recorder', capturedAt: '2026-11-16T01:00:00Z', recordedAt: '2026-11-16T01:00:00Z', status: 'PENDING_REVIEW', confirmedBy: null, confirmedAt: null, resultSets: [], relatedReports: [], assessmentStatus: 'INCOMPLETE', suggestedMarketCode: 'VN', assessmentReasons: [] };
function mount() {
  render(<MemoryRouter initialEntries={['/compliance/lab-results/report']}><Routes><Route path="/compliance/lab-results/:id" element={<MrlComplianceCheckPage />} /></Routes></MemoryRouter>);
}

describe('Lab response contract', () => {
  it('uses confirmedAt from the response and never substitutes test results when results are absent', async () => {
    vi.mocked(labReportEndpoints.getLabReport).mockResolvedValue({ ...report, confirmedAt: '2026-11-16T02:00:00Z', confirmedBy: 'reviewer', status: 'CONFIRMED' });
    mount();
    const dialog = await screen.findByRole('dialog');
    expect(within(dialog).queryByRole('button', { name: 'Xác nhận báo cáo hợp lệ' })).toBeNull();
    expect(within(dialog).getByText('Báo cáo chưa có bộ kết quả xét nghiệm.')).toBeTruthy();
    expect(within(dialog).queryByText('0.008 mg/kg')).toBeNull();
  });

  it('sends as-received confirmation only after the user explicitly selects it', async () => {
    vi.mocked(labReportEndpoints.getLabReport).mockResolvedValue(report);
    vi.mocked(labReportEndpoints.confirmLabReport).mockResolvedValue({ ...report, status: 'CONFIRMED', confirmedAt: '2026-11-16T02:00:00Z' });
    mount();
    const dialog = await screen.findByRole('dialog');
    const checkbox = within(dialog).getByLabelText(/mẫu nguyên trạng/);
    expect((checkbox as HTMLInputElement).checked).toBe(false);
    fireEvent.click(checkbox);
    fireEvent.click(within(dialog).getByRole('button', { name: 'Xác nhận báo cáo hợp lệ' }));
    await waitFor(() => expect(labReportEndpoints.confirmLabReport).toHaveBeenCalledWith('report', expect.objectContaining({ payload: expect.objectContaining({ asReceivedConfirmed: true }) })));
  });
});
