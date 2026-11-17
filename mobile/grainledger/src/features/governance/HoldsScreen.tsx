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
import { ComplianceSheet, ComplianceText, formStyles, type Locale } from '../compliance/compliance-ui';
import { PageControls, RequestSheet, ResourceFeedback, StructuredData, type FieldSpec } from './domain-ui';
import { createHoldCommand, createHoldsService, holdCreateInput, holdRespondInput, mayCreateHold, mayReadHolds, mayRespondHold, respondHoldCommand, type Hold, type HoldCommand } from './holds-api';
import { textField } from './residue-forms';
import { useDomainRefresh } from './use-domain-refresh';

export function HoldsScreen({ initialCreate = false }: { initialCreate?: boolean }) {
  const { client, user } = useAuth(); const scope = client.getRequestScope(); if (!user || scope === null) return null;
  return mayReadHolds(user) ? <Holds key={scope} scope={scope} initialCreate={initialCreate} /> : <ComplianceDenied />;
}
function Holds({ scope, initialCreate }: { scope: string; initialCreate: boolean }) {
  const { client, user } = useAuth(); const { theme } = useAppTheme(); const [owner] = useState(() => user!);
  const [locale, setLocale] = useState<Locale>('vi'); const tr = (vi: string, en: string) => locale === 'vi' ? vi : en;
  const service = useMemo(() => createHoldsService(client.api, owner, () => client.getRequestScope() === scope), [client, owner, scope]);
  const [page, setPage] = useState(1); const [selected, setSelected] = useState<Hold | null>(null);
  const [editor, setEditor] = useState<{ hold: Hold | null } | null>(() => initialCreate && mayCreateHold(owner) ? { hold: null } : null);
  const [notice, setNotice] = useState('');
  const load = useCallback((signal: AbortSignal) => service.list(page, signal), [service, page]); const state = useApiResource(load); const data = state.status === 'success' ? state.data : null;
  useDomainRefresh(state.reload, Boolean(editor || selected));
  const reload = () => { setEditor(null); setSelected(null); void state.reload(); };
  const fields: FieldSpec[] = editor?.hold ? [textField('evidenceId', 'ID bằng chứng hợp lệ tại cơ sở của lô *', 'Evidence ID at the lot’s facility *'),
    textField('status', 'Trạng thái phản hồi đã thực hiện', 'Completed response status', { kind: 'select', options: ['ACKNOWLEDGED', 'ISOLATED', 'RESPONDED'] }),
    textField('response', 'Phản hồi thực tế *', 'Actual response *', { multiline: true }), textField('notes', 'Ghi chú và căn cứ thực tế *', 'Actual notes and basis *', { multiline: true })]
    : [textField('lotId', 'ID lô Ledger thực tế *', 'Actual Ledger lot ID *'), textField('lotCode', 'Mã lô để đối chiếu (không thay thế ID)', 'Lot code for reference (does not replace ID)'),
      textField('reasonCode', 'Mã lý do *', 'Reason code *'), textField('notes', 'Lý do và căn cứ phong tỏa *', 'Hold reason and basis *', { multiline: true })];
  return <SafeAreaView style={[formStyles.screen, { backgroundColor: theme.colors.backgroundGrouped }]}>
    <FlatList data={data?.items ?? []} keyExtractor={(row) => row.id} contentContainerStyle={formStyles.content} refreshing={state.isLoading} onRefresh={() => { void state.reload(); }}
      ListHeaderComponent={<View style={{ gap: 16 }}><View style={formStyles.row}><GlassButton opaque variant="glass" label={tr('Trang chủ', 'Home')} onPress={() => router.dismissTo('/home')} />
        <GlassButton opaque variant="glass" label={locale === 'vi' ? 'English' : 'Tiếng Việt'} onPress={() => setLocale(locale === 'vi' ? 'en' : 'vi')} /></View>
        <ComplianceText heading>{tr('Lệnh HOLD', 'HOLD orders')}</ComplianceText>
        <ComplianceText>{tr('HOLD không được giải phóng tự do. Phản hồi không tự chuyển tồn kho hoặc xác nhận đạt MRL.', 'HOLD cannot be freely released. A response does not itself transfer stock or establish MRL compliance.')}</ComplianceText>
        {notice ? <ComplianceText>{notice}</ComplianceText> : null}
        {mayCreateHold(owner) ? <GlassButton opaque label={tr('Ban hành HOLD', 'Issue HOLD')} onPress={() => { setNotice(''); setEditor({ hold: null }); }} /> : null}
        {initialCreate && !mayCreateHold(owner) ? <ComplianceText>{tr('Tài khoản này không được ban hành HOLD theo quyền máy chủ; có thể tra cứu danh sách.', 'This account cannot issue HOLD under server authorization; the list remains available.')}</ComplianceText> : null}
        <GlassButton opaque variant="glass" label={tr('Tải lại', 'Refresh')} loading={state.isLoading} onPress={() => { void state.reload(); }} />
        <ResourceFeedback loading={state.isLoading || state.status === 'idle'} error={state.error} onReload={() => { void state.reload(); }} tr={tr} />
        {data ? <ComplianceText>{tr('Tổng trong phạm vi được phép', 'Total in authorized scope')}: {data.totalCount}</ComplianceText> : null}
      </View>}
      renderItem={({ item }) => <GlassCard opaque title={item.lotCode || item.lotId}>
        <ComplianceText>{item.reason}</ComplianceText><ComplianceText>{tr('Trạng thái máy chủ', 'Server status')}: {item.status}</ComplianceText><ComplianceText>{item.ownerName}</ComplianceText>
        <GlassButton opaque variant="glass" label={tr('Chi tiết và thông tin lô', 'Detail and lot context')} onPress={() => setSelected(item)} />
        {mayRespondHold(owner) ? <GlassButton opaque variant="glass" label={tr('Ghi phản hồi cách ly', 'Record isolation response')} onPress={() => { setNotice(''); setEditor({ hold: item }); }} /> : null}
      </GlassCard>}
      ListEmptyComponent={data ? <ComplianceText>{tr('Không có lệnh HOLD được trả về cho trang này. Trạng thái này không chứng minh toàn bộ tồn kho an toàn.', 'No HOLD orders returned on this page. This does not establish that all inventory is safe.')}</ComplianceText> : undefined}
      ListFooterComponent={<PageControls page={page} hasMore={data?.hasMore ?? false} busy={state.isLoading} tr={tr} onChange={setPage} />} />
    {selected ? <ComplianceSheet title={tr('Chi tiết HOLD', 'HOLD detail')} busy={false} onClose={() => setSelected(null)} tr={tr}>
      <StructuredData value={selected} locale={locale} /><GlassButton opaque variant="glass" label={tr('Xem tồn theo vị trí và hạn chế của lô', 'View lot positions and restrictions')}
        onPress={() => { const lotId = selected.lotId; setSelected(null); router.push({ pathname: '/stock/lots/[lotId]', params: { lotId } }); }} />
      <GlassButton opaque variant="glass" label={tr('Đóng', 'Close')} onPress={() => setSelected(null)} />
    </ComplianceSheet> : null}
    {editor ? <HoldEditor key={editor.hold?.id ?? 'create'} hold={editor.hold} fields={fields} locale={locale} onClose={() => setEditor(null)} onReload={reload}
      onSaved={() => { setNotice(tr('Máy chủ đã nhận thao tác HOLD. Đang tải lại trạng thái.', 'The server accepted the HOLD action. Reloading status.')); reload(); }} /> : null}
  </SafeAreaView>;
}
function HoldEditor({ hold, fields, locale, onClose, onReload, onSaved }: { hold: Hold | null; fields: FieldSpec[]; locale: Locale; onClose: () => void; onReload: () => void; onSaved: () => void }) {
  const tr = (vi: string, en: string) => locale === 'vi' ? vi : en;
  const { client, user } = useAuth(); const [scope] = useState(() => client.getRequestScope()); const [owner] = useState(() => user!);
  const service = useMemo(() => createHoldsService(client.api, owner, () => client.getRequestScope() === scope), [client, owner, scope]);
  const send = useCallback((command: unknown, signal: AbortSignal) => service.execute(command as HoldCommand, signal), [service]);
  return <RequestSheet title={hold ? tr('Phản hồi HOLD', 'Respond to HOLD') : tr('Ban hành HOLD', 'Issue HOLD')} fields={fields}
    initial={hold ? { evidenceId: '', status: 'ACKNOWLEDGED', response: '', notes: '' } : { lotId: '', lotCode: '', reasonCode: '', notes: '' }} schema={hold ? holdRespondInput : holdCreateInput}
    execute={send} buildCommand={(data) => hold ? respondHoldCommand(hold.id, data, randomUUID, () => new Date().toISOString()) : createHoldCommand(data, randomUUID, () => new Date().toISOString())}
    locale={locale} onClose={onClose} onReload={onReload} onSaved={onSaved}>
    <ComplianceText>{hold ? `${hold.lotCode} · ${hold.id}` : tr('Lấy ID thật từ chi tiết Tồn kho. Mã lô là thông tin đối chiếu; ứng dụng không tự tạo ID lô.', 'Use the actual ID from Stock detail. The lot code is reference text; the app does not invent a lot ID.')}</ComplianceText>
    {hold ? <ComplianceText>{tr('Cần bằng chứng được phép tại cơ sở của lô và quyền quản lý nhà máy. Chọn ISOLATED chỉ khi tồn thực tế đã chuyển vào vị trí cách ly; máy chủ kiểm tra điều kiện này. Không có thao tác RELEASE.', 'Valid evidence at the lot facility and mill-manager authorization are required. Use ISOLATED only after physical stock transfer to isolation; the server verifies this. RELEASE is unavailable.')}</ComplianceText> : null}
  </RequestSheet>;
}
