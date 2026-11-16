import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { BlendPlanDecisionsPage } from '@/features/export/pages/BlendPlanDecisionsPage';
import { planningEndpoints } from '@/api/planning';
import { ApiError } from '@/api/client';
import type { BlendPlanDecision, BlendPlanDraftDto, BlendPlanProposal } from '@/api/contracts';

const auth = vi.hoisted(() => ({ user: { permissions: ['blend.approve'] } }));
vi.mock('@/app/store/authStore', () => ({ useAuthStore: (selector: (state: typeof auth) => unknown) => selector(auth) }));
vi.mock('@/app/store/uiStore', () => ({ useUiStore: { getState: () => ({}) } }));
vi.mock('@/api/planning', () => ({ planningEndpoints: { getBlendPlan: vi.fn(), getBlendPlans: vi.fn(), getProposal: vi.fn(), getDecision: vi.fn(), approvePlan: vi.fn(), rejectPlan: vi.fn(), revokePlan: vi.fn() } }));
vi.mock('react-i18next', () => ({ useTranslation: () => ({ t: (_key: string, fallback: string) => fallback, i18n: { language: 'vi' } }) }));

const draft: BlendPlanDraftDto = { id: 'plan', orderId: 'order', containerId: 'container', specificationId: 'spec', versionNo: 1, version: 1, status: 'DRAFT', targetMassKg: '25000.000001', targetProductIdentity: 'RICE', demandSnapshot: '{}', createdAt: '2026-11-16T01:00:00Z', cancelledAt: null, demandCurrent: true, canCancel: false, hasProposal: true };
const proposal: BlendPlanProposal = { id: 'actual-proposal', planId: 'plan', previewId: 'preview', proposedAt: '2026-11-16T01:00:00Z', assessment: { assessmentStatus: 'PASS', selection: { allocations: [{ lotId: 'lot', locationId: 'location', lotCode: 'LOT-1', quantityKg: '25000.000001' }] } }, demandCurrent: true, stockAndEvidenceCurrent: true, freshness: 'CURRENT', freshnessReasons: [], stockReserved: false };
const decision: BlendPlanDecision = { planId: 'plan', proposalId: 'actual-proposal', status: 'PENDING', decisionVersion: 0, actorId: null, recordedAt: null, reason: null, activeApproval: false, reservation: { status: 'NOT_RESERVED', reservedKg: '0', remainingKg: '0', consumedKg: '0', releasedKg: '0', lines: [] } };
let cache: QueryClient;
beforeEach(() => {
  auth.user.permissions = ['blend.approve'];
  vi.mocked(planningEndpoints.getBlendPlan).mockResolvedValue(draft);
  vi.mocked(planningEndpoints.getProposal).mockResolvedValue(proposal);
  vi.mocked(planningEndpoints.getDecision).mockResolvedValue(decision);
  cache = new QueryClient({ defaultOptions: { queries: { retry: false, gcTime: Infinity }, mutations: { retry: false } } });
});
afterEach(() => { cleanup(); cache.clear(); });

function mount() {
  return render(<QueryClientProvider client={cache}><MemoryRouter initialEntries={['/export/plans/plan/review']}><Routes><Route path="/export/plans/:planId/review" element={<BlendPlanDecisionsPage />} /></Routes></MemoryRouter></QueryClientProvider>);
}
async function clickAction(name: string) {
  const button = await screen.findByRole('button', { name, exact: true });
  await waitFor(() => expect((button as HTMLButtonElement).disabled).toBe(false));
  fireEvent.click(button);
  return screen.findByRole('dialog', { name, exact: true });
}

describe('Blend decision workflow', () => {
  it('shows server allocations with exact mass and approves the current proposal/version', async () => {
    vi.mocked(planningEndpoints.approvePlan).mockResolvedValue({ ...decision, status: 'APPROVED', decisionVersion: 1, activeApproval: true });
    mount();
    const dialog = await clickAction('Phê duyệt');
    expect(screen.getByText('LOT-1')).toBeTruthy();
    expect(screen.getAllByText(/25000\.000001/).length).toBeGreaterThan(0);
    fireEvent.click(within(dialog).getByRole('button', { name: 'Xác nhận phê duyệt' }));
    await waitFor(() => expect(planningEndpoints.approvePlan).toHaveBeenCalledWith('plan', { operationId: expect.any(String), proposalId: 'actual-proposal', expectedDecisionVersion: 0 }));
    await screen.findByText('Đã ghi nhận: Đã phê duyệt.');
  });

  it('blocks stale approval and requires a nonblank rejection reason', async () => {
    vi.mocked(planningEndpoints.getProposal).mockResolvedValue({ ...proposal, freshness: 'STALE', stockAndEvidenceCurrent: false });
    vi.mocked(planningEndpoints.rejectPlan).mockResolvedValue({ ...decision, status: 'REJECTED', decisionVersion: 1 });
    mount();
    const dialog = await clickAction('Từ chối');
    expect((screen.getByRole('button', { name: 'Phê duyệt', exact: true }) as HTMLButtonElement).disabled).toBe(true);
    const confirm = within(dialog).getByRole('button', { name: 'Xác nhận từ chối' });
    expect((confirm as HTMLButtonElement).disabled).toBe(true);
    fireEvent.change(within(dialog).getByLabelText('Lý do (bắt buộc)'), { target: { value: '  Cần lấy mẫu lại  ' } });
    fireEvent.click(confirm);
    await waitFor(() => expect(planningEndpoints.rejectPlan).toHaveBeenCalledWith('plan', expect.objectContaining({ reason: 'Cần lấy mẫu lại', proposalId: 'actual-proposal', expectedDecisionVersion: 0 })));
  });

  it('revokes an active approval using its decision version', async () => {
    vi.mocked(planningEndpoints.getDecision).mockResolvedValue({ ...decision, status: 'APPROVED', decisionVersion: 1, activeApproval: true });
    vi.mocked(planningEndpoints.revokePlan).mockResolvedValue({ ...decision, status: 'REVOKED', decisionVersion: 2 });
    mount();
    const dialog = await clickAction('Thu hồi phê duyệt');
    fireEvent.change(within(dialog).getByLabelText('Lý do (bắt buộc)'), { target: { value: 'Yêu cầu thay đổi' } });
    fireEvent.click(within(dialog).getByRole('button', { name: 'Xác nhận thu hồi phê duyệt' }));
    await waitFor(() => expect(planningEndpoints.revokePlan).toHaveBeenCalledWith('plan', expect.objectContaining({ reason: 'Yêu cầu thay đổi', expectedDecisionVersion: 1 })));
  });

  it('shows a concurrency conflict and reloads the server decision without faking success', async () => {
    vi.mocked(planningEndpoints.approvePlan).mockRejectedValue(new ApiError(409, 'Decision changed'));
    mount();
    const dialog = await clickAction('Phê duyệt');
    fireEvent.click(within(dialog).getByRole('button', { name: 'Xác nhận phê duyệt' }));
    await screen.findByRole('alert');
    await waitFor(() => expect(planningEndpoints.getDecision).toHaveBeenCalledTimes(2));
    expect(screen.queryByText('Đã ghi nhận: Đã phê duyệt.')).toBeNull();
  });

  it('keeps viewers read-only even when the page is accessible', async () => {
    auth.user.permissions = [];
    mount();
    await screen.findByText(/Tài khoản có quyền xem/);
    expect(screen.queryByRole('button', { name: 'Phê duyệt' })).toBeNull();
    expect(screen.queryByRole('button', { name: 'Từ chối' })).toBeNull();
  });
});
