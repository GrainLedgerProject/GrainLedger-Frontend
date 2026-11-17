import { randomUUID } from 'expo-crypto';
import { router } from 'expo-router';
import { useCallback, useMemo, useState } from 'react';
import { FlatList, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { GlassButton } from '@/components/glass/GlassButton';
import { GlassCard } from '@/components/glass/GlassCard';
import { useAuth } from '@/features/auth/AuthProvider';
import { useApiResource } from '@/hooks/use-api-resource';
import { useAppTheme } from '@/theme/ThemeProvider';
import { ComplianceDenied } from '../compliance/LabReportsScreen';
import { ComplianceField, ComplianceSheet, ComplianceText, failureText, formStyles, useComplianceAction, type Locale } from '../compliance/compliance-ui';
import { endpointId } from './api-common';
import { assessmentSchema, canApprove, createDecisionService, makeDecision, mayDecide, mayReadDecisions, type Decision, type DecisionAction, type Plan, type Proposal } from './decisions-api';
import { PageControls, ResourceFeedback, StructuredData } from './domain-ui';
import { useDomainRefresh } from './use-domain-refresh';

export function DecisionsScreen({ planId }: { planId?: string }) {
  const { client, user } = useAuth(); const scope = client.getRequestScope(); if (!user || scope === null) return null;
  if (!mayReadDecisions(user)) return <ComplianceDenied />;
  if (planId) { try { endpointId(planId); } catch { return <InvalidDecisionReference />; } }
  return <DecisionWorkspace key={`${scope}:${planId ?? 'list'}`} scope={scope} planId={planId} />;
}
function InvalidDecisionReference() { const { theme } = useAppTheme(); return <SafeAreaView style={[formStyles.screen, { backgroundColor: theme.colors.backgroundGrouped }]}><View style={formStyles.content}>
  <ComplianceText error>Tham chiếu phương án không hợp lệ / Invalid plan reference</ComplianceText><GlassButton opaque label="Danh sách phương án / Plans" onPress={() => router.dismissTo('/export/plans/pending')} /></View></SafeAreaView>; }
function DecisionWorkspace({ scope, planId }: { scope: string; planId?: string }) {
  const { client, user } = useAuth(); const { theme } = useAppTheme(); const [owner] = useState(() => user!);
  const [locale, setLocale] = useState<Locale>('vi');
  const service = useMemo(() => createDecisionService(client.api, owner, () => client.getRequestScope() === scope), [client, owner, scope]);
  return <SafeAreaView style={[formStyles.screen, { backgroundColor: theme.colors.backgroundGrouped }]}>
    {planId ? <DecisionDetail id={planId} service={service} locale={locale} onLocale={() => setLocale(locale === 'vi' ? 'en' : 'vi')} allowed={mayDecide(owner)} />
      : <DecisionLists service={service} locale={locale} onLocale={() => setLocale(locale === 'vi' ? 'en' : 'vi')} />}
  </SafeAreaView>;
}
type Choice = { id: string; title: string; detail: string };
function DecisionLists({ service, locale, onLocale }: { service: ReturnType<typeof createDecisionService>; locale: Locale; onLocale: () => void }) {
  const tr = (vi: string, en: string) => locale === 'vi' ? vi : en;
  const [order, setOrder] = useState<Choice | null>(null); const [container, setContainer] = useState<Choice | null>(null);
  const [pages, setPages] = useState({ orders: 1, containers: 1, plans: 1 });
  const step = !order ? 'orders' : !container ? 'containers' : 'plans'; const page = pages[step];
  const orderId = order?.id; const containerId = container?.id;
  const load = useCallback(async (signal: AbortSignal) => {
    if (!orderId) { const value = await service.orders(page, signal); return { ...value, items: value.items.map((row) => ({ id: row.id, title: row.code, detail: `${row.requiredMassKg} kg · ${row.shippingFrom} → ${row.shippingTo}` })) }; }
    if (!containerId) { const value = await service.containers(orderId, page, signal); return { ...value, items: value.items.map((row) => ({ id: row.id, title: row.internalCode, detail: `${row.targetMassKg} kg · ${row.status}` })) }; }
    const value = await service.plans(containerId, page, signal); return { ...value, items: value.items.map((row) => ({ id: row.id, title: `v${row.versionNo} · ${row.targetProductIdentity ?? '—'}`, detail: `${row.targetMassKg} kg · ${row.status} · ${row.hasProposal ? 'Proposal' : 'Draft'}` })) };
  }, [service, orderId, containerId, page]);
  const state = useApiResource(load); const data = state.status === 'success' ? state.data : null;
  useDomainRefresh(state.reload);
  return <FlatList data={data?.items ?? []} keyExtractor={(row) => row.id} contentContainerStyle={formStyles.content} refreshing={state.isLoading} onRefresh={() => { void state.reload(); }}
    ListHeaderComponent={<View style={{ gap: 16 }}><View style={formStyles.row}><GlassButton opaque variant="glass" label={tr('Trang chủ', 'Home')} onPress={() => router.dismissTo('/home')} /><GlassButton opaque variant="glass" label={locale === 'vi' ? 'English' : 'Tiếng Việt'} onPress={onLocale} /></View>
      <ComplianceText heading>{tr('Duyệt phương án phối trộn', 'Review blend plans')}</ComplianceText>
      <ComplianceText>{step === 'orders' ? tr('Chọn đơn hàng trong phạm vi được phép.', 'Choose an authorized export order.') : step === 'containers' ? tr('Chọn container của đơn hàng.', 'Choose an order container.') : tr('Chọn phương án để đọc đề xuất và quyết định.', 'Choose a plan to review its proposal and decision.')}</ComplianceText>
      {order ? <><ComplianceText>{tr('Đơn hàng', 'Order')}: {order.title}</ComplianceText><GlassButton opaque variant="glass" label={tr('Đổi đơn hàng', 'Change order')} onPress={() => { setOrder(null); setContainer(null); }} /></> : null}
      {container ? <><ComplianceText>Container: {container.title}</ComplianceText><GlassButton opaque variant="glass" label={tr('Đổi container', 'Change container')} onPress={() => setContainer(null)} /></> : null}
      <GlassButton opaque variant="glass" label={tr('Tải lại', 'Refresh')} loading={state.isLoading} onPress={() => { void state.reload(); }} />
      <ResourceFeedback loading={state.status === 'idle' || state.isLoading} error={state.error} onReload={() => { void state.reload(); }} tr={tr} />
    </View>}
    renderItem={({ item }) => <GlassCard opaque title={item.title}><ComplianceText>{item.detail}</ComplianceText>
      <GlassButton opaque variant="glass" label={step === 'plans' ? tr('Xem đề xuất và quyết định', 'View proposal and decision') : tr('Chọn', 'Choose')} onPress={() => {
        if (step === 'orders') { setOrder(item); setContainer(null); setPages({ ...pages, containers: 1, plans: 1 }); }
        else if (step === 'containers') { setContainer(item); setPages({ ...pages, plans: 1 }); }
        else router.push({ pathname: '/export/plans/[planId]/review', params: { planId: item.id } });
      }} />
    </GlassCard>}
    ListEmptyComponent={data ? <ComplianceText>{tr('Không có bản ghi trả về cho lựa chọn và trang này.', 'No records returned for this selection and page.')}</ComplianceText> : undefined}
    ListFooterComponent={<PageControls page={page} hasMore={data?.hasMore ?? false} busy={state.isLoading} tr={tr} onChange={(next) => setPages({ ...pages, [step]: next })} />} />;
}
function DecisionDetail({ id, service, locale, onLocale, allowed }: { id: string; service: ReturnType<typeof createDecisionService>; locale: Locale; onLocale: () => void; allowed: boolean }) {
  const tr = (vi: string, en: string) => locale === 'vi' ? vi : en;
  const load = useCallback((signal: AbortSignal) => service.detail(id, signal), [id, service]); const state = useApiResource(load); const data = state.status === 'success' ? state.data : null;
  const [pending, setPending] = useState<{ action: DecisionAction; plan: Plan; proposal: Proposal; decision: Decision } | null>(null); const [notice, setNotice] = useState('');
  useDomainRefresh(state.reload, Boolean(pending));
  const assessment = assessmentSchema.safeParse(data?.proposal?.assessment);
  const reload = () => { setPending(null); void state.reload(); };
  return <><FlatList data={[]} contentContainerStyle={formStyles.content} refreshing={state.isLoading} onRefresh={reload}
    ListHeaderComponent={<View style={{ gap: 16 }}><View style={formStyles.row}><GlassButton opaque variant="glass" label={tr('Danh sách phương án', 'Plans')} onPress={() => router.dismissTo('/export/plans/pending')} /><GlassButton opaque variant="glass" label={locale === 'vi' ? 'English' : 'Tiếng Việt'} onPress={onLocale} /></View>
      <ComplianceText heading>{tr('Đề xuất và quyết định', 'Proposal and decision')}</ComplianceText>{notice ? <ComplianceText>{notice}</ComplianceText> : null}
      <GlassButton opaque variant="glass" label={tr('Tải lại hiệu lực', 'Refresh freshness')} loading={state.isLoading} onPress={reload} />
      <ResourceFeedback loading={state.status === 'idle' || state.isLoading} error={state.error} onReload={reload} tr={tr} />
      {data ? <>
        <GlassCard opaque title={tr('Phương án', 'Plan')}><StructuredData value={data.plan} locale={locale} /></GlassCard>
        {!data.plan.hasProposal ? <ComplianceText>{tr('Chưa có đề xuất để thẩm định. Không thể duyệt bản nháp.', 'There is no proposal to review. A draft cannot be approved.')}</ComplianceText> : null}
        {data.proposal ? <GlassCard opaque title={tr('Đề xuất đã lưu', 'Saved proposal')}>
          {data.proposal.freshness !== 'CURRENT' ? <ComplianceText error>{tr('Đề xuất đã cũ hoặc chưa kiểm tra lại; không thể phê duyệt.', 'The proposal is stale or not rechecked; approval is unavailable.')}</ComplianceText> : null}
          {!assessment.success ? <ComplianceText>{tr('Dữ liệu đánh giá không đủ để phê duyệt.', 'Assessment data is insufficient for approval.')}</ComplianceText> : null}
          <StructuredData value={data.proposal} locale={locale} />
        </GlassCard> : null}
        {data.decision ? <GlassCard opaque title={tr('Quyết định và giữ tồn', 'Decision and reservations')}><StructuredData value={data.decision} locale={locale} /></GlassCard> : null}
        {!allowed ? <ComplianceText>{tr('Cần quyền blend.approve để ghi quyết định. Máy chủ tiếp tục kiểm tra công ty và thẩm quyền.', 'The blend.approve permission is required to decide. The server also checks company scope and authority.')}</ComplianceText> : null}
        {allowed && data.proposal && data.decision ? <View style={formStyles.row}>{(['approve', 'reject', 'revoke'] as const).filter((action) => action === 'revoke' ? data.decision!.status === 'APPROVED' && data.decision!.activeApproval : data.decision!.status === 'PENDING').map((action) => <GlassButton opaque key={action}
          label={action === 'approve' ? tr('Phê duyệt', 'Approve') : action === 'reject' ? tr('Từ chối', 'Reject') : tr('Thu hồi phê duyệt', 'Revoke approval')} variant={action === 'approve' ? 'primary' : 'glass'}
          disabled={state.isLoading || (action === 'approve' && !canApprove(data.proposal!, data.decision!))} onPress={() => { setNotice(''); setPending({ action, plan: data.plan, proposal: data.proposal!, decision: data.decision! }); }} />)}</View> : null}
      </> : null}
    </View>} renderItem={() => null} />
    {pending ? <DecisionSheet context={pending} service={service} locale={locale} onClose={() => setPending(null)} onReload={reload}
      onConflict={() => { setNotice(tr('Dữ liệu đã thay đổi. Đã đóng xác nhận và tải lại; hãy đọc đề xuất trước khi quyết định lại.', 'Data changed. Confirmation was closed and reloaded; review the proposal before deciding again.')); reload(); }}
      onSaved={() => { setNotice(tr('Máy chủ đã ghi nhận quyết định. Đang tải lại đề xuất và giữ tồn thực tế.', 'The server accepted the decision. Reloading the proposal and actual reservations.')); reload(); }} /> : null}
  </>;
}
function DecisionSheet({ context, service, locale, onClose, onReload, onConflict, onSaved }: { context: { action: DecisionAction; plan: Plan; proposal: Proposal; decision: Decision }; service: ReturnType<typeof createDecisionService>; locale: Locale;
  onClose: () => void; onReload: () => void; onConflict: () => void; onSaved: () => void }) {
  const tr = (vi: string, en: string) => locale === 'vi' ? vi : en; const [reason, setReason] = useState(''); const { action, state, busy } = useComplianceAction(service.execute);
  const title = context.action === 'approve' ? tr('Phê duyệt', 'Approve') : context.action === 'reject' ? tr('Từ chối', 'Reject') : tr('Thu hồi phê duyệt', 'Revoke approval');
  async function submit() {
    if (busy || (context.action !== 'approve' && !reason.trim())) return;
    const accepted = await action.submit(JSON.stringify([context.action, context.plan.id, context.proposal.id, context.decision.decisionVersion, reason.trim()]),
      () => makeDecision(context.action, context.plan, context.proposal, context.decision, reason, randomUUID));
    if (accepted) onSaved(); else if ([409, 412].includes(action.getSnapshot().error?.status ?? 0)) onConflict();
  }
  return <ComplianceSheet title={title} busy={busy} onClose={onClose} tr={tr}><ComplianceText>{context.plan.id} · {tr('Phiên bản quyết định', 'Decision version')}: {context.decision.decisionVersion}</ComplianceText>
    <ComplianceText>{context.action === 'approve' ? tr('Máy chủ kiểm tra lại đề xuất và giữ tồn trước khi phê duyệt. Không có giữ tồn cục bộ.', 'The server rechecks the proposal and reserves stock before approving. The app does not reserve stock locally.')
      : context.action === 'revoke' ? tr('Máy chủ thu hồi phê duyệt và xử lý phần tồn còn giữ. Phần đã sử dụng không được coi là đã giải phóng.', 'The server revokes approval and handles remaining reserved stock. Consumed quantities are not treated as released.') : tr('Ghi nhận lý do từ chối đề xuất này.', 'Record the reason for rejecting this proposal.')}</ComplianceText>
    {context.action !== 'approve' ? <ComplianceField label={tr('Lý do * (tối đa 1000 ký tự)', 'Reason * (up to 1000 characters)')} value={reason} onChangeText={setReason} maxLength={1000} multiline disabled={busy} /> : null}
    {state.error ? <><ComplianceText error>{failureText(state.error, tr, true)}</ComplianceText><GlassButton opaque variant="glass" label={tr('Đóng và tải lại', 'Close and reload')} disabled={busy} onPress={onReload} /></> : null}
    <GlassButton opaque label={title} loading={busy} disabled={context.action !== 'approve' && !reason.trim()} onPress={() => { void submit(); }} />
  </ComplianceSheet>;
}
