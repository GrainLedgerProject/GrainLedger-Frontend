import { useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { z } from 'zod';
import { exportEndpoints } from '@/api/exports';
import { planningEndpoints } from '@/api/planning';
import { ApiError } from '@/api/client';
import type { BlendPlanDecision } from '@/api/planning';
import { useAuthStore } from '@/app/store/authStore';
import { Modal } from '@/components/Modal/Modal';
import { StatusBadge, type StatusType } from '@/components/StatusBadge/StatusBadge';
import { ArrowsClockwise, CheckSquare, X } from '@phosphor-icons/react';

const assessmentSchema = z.object({
  assessmentStatus: z.string(),
  predictedOutputKg: z.string().nullable().optional(),
  selection: z.object({
    allocations: z.array(z.object({ lotId: z.string(), locationId: z.string(), lotCode: z.string(), quantityKg: z.string() })),
  }).nullable().optional(),
});
const labels = { PENDING: 'Chờ quyết định', APPROVED: 'Đã phê duyệt', REJECTED: 'Đã từ chối', REVOKED: 'Đã thu hồi' };
const badges: Record<BlendPlanDecision['status'], StatusType> = { PENDING: 'PENDING', APPROVED: 'COMPLIANT', REJECTED: 'REJECTED', REVOKED: 'CLOSED' };
const actions = { approve: 'Phê duyệt', reject: 'Từ chối', revoke: 'Thu hồi phê duyệt' };
const reservations = { NOT_RESERVED: 'Chưa giữ tồn', HELD: 'Đang giữ tồn', CONSUMED: 'Đã sử dụng', RELEASED: 'Đã giải phóng', SETTLED: 'Đã hoàn tất' };
type Action = keyof typeof actions;
const button = 'inline-flex min-h-11 items-center justify-center gap-2 rounded-lg border border-ink-tertiary/20 px-4 py-2 text-sm font-semibold hover:bg-surface-raised disabled:opacity-50 disabled:cursor-not-allowed';
const field = 'mt-2 min-h-11 w-full rounded-lg border border-ink-tertiary/25 bg-surface-base px-3 py-2 text-ink-primary';
const message = (error: unknown) => error instanceof Error ? error.message : 'Không thể kết nối máy chủ.';

export function BlendPlanDecisionsPage() {
  const { planId } = useParams<{ planId: string }>();
  const navigate = useNavigate();
  const cache = useQueryClient();
  const canDecide = useAuthStore(state => state.user?.permissions.includes('blend.approve') ?? false);
  const [orderId, setOrderId] = useState('');
  const [containerId, setContainerId] = useState('');
  const [orderPage, setOrderPage] = useState(1);
  const [containerPage, setContainerPage] = useState(1);
  const [planPage, setPlanPage] = useState(1);
  const [notice, setNotice] = useState('');
  const [actionError, setActionError] = useState('');
  const [pending, setPending] = useState<{ action: Action; decision: BlendPlanDecision; operationId: string } | null>(null);
  const [reason, setReason] = useState('');

  const orders = useQuery({ queryKey: ['review-orders', orderPage], queryFn: () => exportEndpoints.getOrders({ page: orderPage, pageSize: 20 }), enabled: !planId });
  const containers = useQuery({ queryKey: ['review-containers', orderId, containerPage], queryFn: () => exportEndpoints.getContainers(orderId, { page: containerPage, pageSize: 20 }), enabled: !planId && Boolean(orderId) });
  const plans = useQuery({ queryKey: ['review-plans', containerId, planPage], queryFn: () => planningEndpoints.getBlendPlans(containerId, { page: planPage, pageSize: 20 }), enabled: !planId && Boolean(containerId) });
  const plan = useQuery({ queryKey: ['review-plan', planId], queryFn: () => planningEndpoints.getBlendPlan(planId!), enabled: Boolean(planId), staleTime: 0, refetchOnWindowFocus: true });
  const proposal = useQuery({ queryKey: ['review-proposal', planId], queryFn: () => planningEndpoints.getProposal(planId!), enabled: Boolean(planId && plan.data?.hasProposal), staleTime: 0, refetchOnWindowFocus: true });
  const decision = useQuery({ queryKey: ['review-decision', planId], queryFn: () => planningEndpoints.getDecision(planId!), enabled: Boolean(planId && plan.data?.hasProposal), staleTime: 0, refetchOnWindowFocus: true });
  const assessment = assessmentSchema.safeParse(proposal.data?.assessment);
  const canApprove = decision.data?.status === 'PENDING' && proposal.data?.freshness === 'CURRENT'
    && decision.data.proposalId === proposal.data.id
    && proposal.data.demandCurrent && proposal.data.stockAndEvidenceCurrent === true
    && assessment.success && assessment.data.assessmentStatus === 'PASS';

  const mutation = useMutation({
    mutationFn: async () => {
      if (!pending || !planId) throw new Error('Chưa chọn phương án.');
      const request = { operationId: pending.operationId, proposalId: pending.decision.proposalId, expectedDecisionVersion: pending.decision.decisionVersion };
      if (pending.action === 'approve') return planningEndpoints.approvePlan(planId, request);
      if (!reason.trim()) throw new Error('Vui lòng nhập lý do.');
      return pending.action === 'reject'
        ? planningEndpoints.rejectPlan(planId, { ...request, reason: reason.trim() })
        : planningEndpoints.revokePlan(planId, { ...request, reason: reason.trim() });
    },
    onSuccess: (updated) => {
      cache.setQueryData(['review-decision', planId], updated);
      setNotice(`Đã ghi nhận: ${labels[updated.status]}.`);
      setPending(null);
      setActionError('');
      void cache.invalidateQueries({ queryKey: ['review-proposal', planId] });
      void cache.invalidateQueries({ queryKey: ['review-plans'] });
    },
    onError: (error) => {
      setActionError(error instanceof ApiError && error.status === 409
        ? `Dữ liệu đã thay đổi. ${error.message} Tải lại thông tin trước khi quyết định lại.` : message(error));
      if (error instanceof ApiError && error.status === 409) {
        setPending(null);
        void cache.invalidateQueries({ queryKey: ['review-decision', planId] });
        void cache.invalidateQueries({ queryKey: ['review-proposal', planId] });
      }
    },
  });
  function begin(action: Action) {
    if (!decision.data) return;
    setPending({ action, decision: decision.data, operationId: crypto.randomUUID() });
    setReason('');
    setActionError('');
    setNotice('');
  }
  const errors = [orders.error, containers.error, plans.error, plan.error, proposal.error, decision.error].filter(Boolean);
  const fetching = orders.isFetching || containers.isFetching || plans.isFetching || plan.isFetching || proposal.isFetching || decision.isFetching;

  return <div className="space-y-6 pb-12">
    <header className="flex flex-wrap items-start justify-between gap-4 border-b border-ink-tertiary/15 pb-4">
      <div><p className="text-xs font-semibold uppercase tracking-wider text-accent-primary">Thẩm định xuất khẩu</p>
        <h2 className="mt-1 text-2xl font-display font-bold text-ink-primary">Duyệt phương án phối trộn</h2>
        <p className="mt-2 text-sm text-ink-secondary">Xem đề xuất, kiểm tra hiệu lực và ghi nhận quyết định trên máy chủ.</p></div>
      <button className={button} disabled={fetching || mutation.isPending} onClick={() => { setActionError(''); void cache.invalidateQueries({ predicate: query => String(query.queryKey[0]).startsWith('review-') }); }}><ArrowsClockwise size={18} />{fetching ? 'Đang tải…' : 'Tải lại'}</button>
    </header>
    {notice && <p role="status" className="rounded-lg bg-accent-primary/10 p-4 text-accent-primary">{notice}</p>}
    {errors.map((error, index) => <p key={index} role="alert" className="rounded-lg bg-accent-danger/10 p-4 text-accent-danger">{message(error)}</p>)}
    {actionError && <p role="alert" className="rounded-lg bg-accent-danger/10 p-4 text-accent-danger">{actionError}</p>}

    {!planId ? <>
      <section className="grid gap-6 rounded-xl border border-ink-tertiary/15 bg-surface-base p-5 md:grid-cols-2">
        <div><label className="text-sm font-semibold" htmlFor="review-order">Đơn hàng xuất khẩu</label>
          <select id="review-order" className={field} value={orderId} disabled={orders.isFetching} onChange={event => { setOrderId(event.target.value); setContainerId(''); setContainerPage(1); setPlanPage(1); }}>
            <option value="">Chọn đơn hàng</option>{orders.data?.items.map(order => <option key={order.id} value={order.id}>{order.code}</option>)}
          </select><PageButtons page={orderPage} hasMore={orders.data?.hasMore ?? false} busy={orders.isFetching} onChange={page => { setOrderPage(page); setOrderId(''); setContainerId(''); }} />
          {orders.isSuccess && orders.data.items.length === 0 && <p className="mt-3 text-sm text-ink-secondary">Chưa có đơn hàng trong phạm vi được phép xem.</p>}</div>
        <div><label className="text-sm font-semibold" htmlFor="review-container">Container</label>
          <select id="review-container" className={field} value={containerId} disabled={!orderId || containers.isFetching} onChange={event => { setContainerId(event.target.value); setPlanPage(1); }}>
            <option value="">Chọn container</option>{containers.data?.items.map(container => <option key={container.id} value={container.id}>{container.internalCode} · {container.targetMassKg} kg</option>)}
          </select><PageButtons page={containerPage} hasMore={containers.data?.hasMore ?? false} busy={!orderId || containers.isFetching} onChange={page => { setContainerPage(page); setContainerId(''); }} />
          {containers.isSuccess && containers.data.items.length === 0 && <p className="mt-3 text-sm text-ink-secondary">Đơn hàng chưa có container.</p>}</div>
      </section>
      {containerId && <section className="space-y-3" aria-label="Các phương án">
        <h3 className="text-lg font-bold">Phương án của container</h3>
        {plans.isFetching && <p role="status">Đang tải phương án…</p>}
        {plans.data?.items.length === 0 && <p className="rounded-xl border border-ink-tertiary/15 p-6 text-ink-secondary">Chưa có phương án cho container này.</p>}
        {plans.data?.items.map(item => <Link key={item.id} to={`/export/plans/${item.id}/review`} className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-ink-tertiary/15 bg-surface-base p-5 hover:bg-surface-raised">
          <div><p className="font-semibold">Phương án v{item.versionNo} · {item.targetProductIdentity ?? 'Chưa xác định sản phẩm'}</p><p className="mt-1 text-sm text-ink-secondary">{item.targetMassKg} kg · {new Date(item.createdAt).toLocaleString('vi-VN')}</p></div>
          <StatusBadge status={item.hasProposal ? 'PENDING' : 'IN_PROGRESS'} label={item.hasProposal ? 'Xem quyết định' : item.status === 'CANCELLED' ? 'Đã hủy' : 'Bản nháp'} />
        </Link>)}
        <PageButtons page={planPage} hasMore={plans.data?.hasMore ?? false} busy={plans.isFetching} onChange={setPlanPage} />
      </section>}
    </> : <>
      <button className={button} disabled={mutation.isPending} onClick={() => navigate('/export/plans/pending')}>← Danh sách phương án</button>
      {plan.isFetching && <p role="status">Đang tải phương án…</p>}
      {plan.data && <section className="space-y-5 rounded-xl border border-ink-tertiary/15 bg-surface-base p-5">
        <div className="flex flex-wrap items-center justify-between gap-3"><h3 className="text-lg font-bold">Phương án v{plan.data.versionNo} · {plan.data.targetProductIdentity ?? 'Chưa xác định sản phẩm'}</h3>
          {decision.data && <StatusBadge status={badges[decision.data.status]} label={labels[decision.data.status]} />}</div>
        <p className="break-all text-xs text-ink-secondary">Mã phương án: {plan.data.id}</p>
        <p>Khối lượng mục tiêu: <strong>{plan.data.targetMassKg} kg</strong></p>
        {!plan.data.hasProposal && <p className="rounded-lg bg-surface-raised p-4 text-ink-secondary">Phương án chưa có đề xuất để thẩm định.</p>}
        {proposal.data && <>
          <div className="grid gap-3 sm:grid-cols-3">
            <Info label="Ngày đề xuất" value={new Date(proposal.data.proposedAt).toLocaleString('vi-VN')} />
            <Info label="Hiệu lực dữ liệu" value={proposal.data.freshness === 'CURRENT' ? 'Còn hiệu lực' : proposal.data.freshness === 'STALE' ? 'Đã thay đổi' : 'Chưa kiểm tra lại'} />
            <Info label="Đánh giá đã lưu" value={assessment.success ? assessment.data.assessmentStatus : 'Chưa đủ dữ liệu'} />
          </div>
          {proposal.data.freshness === 'STALE' && <p role="status" className="rounded-lg bg-accent-warning/10 p-4">Đề xuất đã cũ. Cần đánh giá và đề xuất lại trước khi phê duyệt.</p>}
          {assessment.success && assessment.data.selection && <div className="overflow-x-auto"><table className="w-full text-left text-sm"><caption className="mb-3 text-left font-semibold">Thành phần đề xuất</caption><thead><tr className="border-b border-ink-tertiary/15"><th className="p-3">Lô</th><th className="p-3">Vị trí</th><th className="p-3 text-right">Khối lượng (kg)</th></tr></thead><tbody>{assessment.data.selection.allocations.map((line, index) => <tr key={index} className="border-b border-ink-tertiary/10"><td className="p-3">{line.lotCode}</td><td className="max-w-48 break-all p-3">{line.locationId}</td><td className="p-3 text-right font-mono">{line.quantityKg}</td></tr>)}</tbody></table></div>}
        </>}
        {decision.data && <>
          <div className="grid gap-3 sm:grid-cols-3"><Info label="Trạng thái giữ tồn" value={reservations[decision.data.reservation.status]} /><Info label="Đang giữ (kg)" value={decision.data.reservation.remainingKg} /><Info label="Đã sử dụng (kg)" value={decision.data.reservation.consumedKg} /></div>
          {decision.data.reason && <p className="rounded-lg bg-surface-raised p-4">Lý do: {decision.data.reason}</p>}
          {decision.data.recordedAt && <p className="text-sm text-ink-secondary">Ghi nhận lúc {new Date(decision.data.recordedAt).toLocaleString('vi-VN')}</p>}
          {!canDecide && <p className="text-sm text-ink-secondary">Tài khoản có quyền xem. Cần quyền duyệt phương án để ghi nhận quyết định.</p>}
          {canDecide && <div className="flex flex-wrap gap-3 border-t border-ink-tertiary/15 pt-4">
            {decision.data.status === 'PENDING' && <><button className={`${button} bg-accent-primary text-white`} disabled={!canApprove || fetching || mutation.isPending} onClick={() => begin('approve')}><CheckSquare size={18} />Phê duyệt</button><button className={button} disabled={fetching || mutation.isPending} onClick={() => begin('reject')}>Từ chối</button></>}
            {decision.data.status === 'APPROVED' && decision.data.activeApproval && <button className={`${button} text-accent-danger`} disabled={fetching || mutation.isPending} onClick={() => begin('revoke')}>Thu hồi phê duyệt</button>}
          </div>}
        </>}
      </section>}
    </>}
    <Modal isOpen={Boolean(pending)} onClose={() => { if (!mutation.isPending) setPending(null); }} ariaLabel={pending ? actions[pending.action] : 'Quyết định phương án'} className="w-full max-w-lg p-6" closeOnBackdrop={!mutation.isPending}>
      {pending && <form onSubmit={event => { event.preventDefault(); mutation.mutate(); }} className="space-y-4">
        <div className="flex items-center justify-between gap-4"><h3 className="text-xl font-bold">{actions[pending.action]}</h3><button type="button" className={button} aria-label="Đóng" disabled={mutation.isPending} onClick={() => setPending(null)}><X size={18} /></button></div>
        <p className="text-sm text-ink-secondary">{pending.action === 'approve' ? 'Máy chủ sẽ kiểm tra lại hiệu lực đề xuất và giữ lượng tồn cần thiết trước khi xác nhận phê duyệt.' : pending.action === 'revoke' ? 'Thu hồi quyết định và giải phóng phần tồn còn giữ theo kiểm tra của máy chủ.' : 'Ghi nhận lý do từ chối đề xuất này.'}</p>
        {actionError && <p role="alert" className="rounded-lg bg-accent-danger/10 p-3 text-accent-danger">{actionError}</p>}
        {pending.action !== 'approve' && <label className="block text-sm font-semibold" htmlFor="decision-reason">Lý do (bắt buộc)<textarea id="decision-reason" className={field} rows={3} required maxLength={1000} value={reason} disabled={mutation.isPending} onChange={event => { setReason(event.target.value); setPending({ ...pending, operationId: crypto.randomUUID() }); }} /></label>}
        <button className={`${button} w-full bg-accent-primary text-white`} disabled={mutation.isPending || (pending.action !== 'approve' && !reason.trim())}>{mutation.isPending ? 'Đang gửi…' : `Xác nhận ${actions[pending.action].toLowerCase()}`}</button>
      </form>}
    </Modal>
  </div>;
}

function Info({ label, value }: { label: string; value: string }) {
  return <div className="rounded-lg bg-surface-raised p-4"><p className="text-xs text-ink-secondary">{label}</p><p className="mt-1 break-words font-semibold">{value}</p></div>;
}
function PageButtons({ page, hasMore, busy, onChange }: { page: number; hasMore: boolean; busy: boolean; onChange: (page: number) => void }) {
  return <div className="mt-3 flex items-center gap-3 text-sm"><button className={button} disabled={page <= 1 || busy} onClick={() => onChange(page - 1)}>Trước</button><span>Trang {page}</span><button className={button} disabled={!hasMore || busy} onClick={() => onChange(page + 1)}>Sau</button></div>;
}
