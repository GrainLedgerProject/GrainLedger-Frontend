import { randomUUID } from 'expo-crypto';
import { router } from 'expo-router';
import { useCallback, useMemo, useState } from 'react';
import { FlatList, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { z } from 'zod';
import { GlassButton } from '@/components/glass/GlassButton';
import { GlassCard } from '@/components/glass/GlassCard';
import { useAuth } from '@/features/auth/AuthProvider';
import { useApiResource } from '@/hooks/use-api-resource';
import { useAppTheme } from '@/theme/ThemeProvider';
import { ComplianceField, ComplianceSheet, ComplianceText, formStyles, type Locale } from '../compliance/compliance-ui';
import { contract, permission } from './api-common';
import { RequestSheet, ResourceFeedback, StructuredData, type FieldSpec } from './domain-ui';
import { createResidueService, groupInputSchema, mayManageRule, mayRetireRule, prepareReviewConfirmation, reportReviewSchema, ruleInputSchema, selectionInputSchema, settingInputSchema, type ResidueCollection, type ResidueCommand, type ResidueRule, type ReviewResponse } from './residue-api';
import { groupSpecs, reviewDraft, reviewRequestSpecs, ruleSpecs, selectionSpecs, settingSpecs, textField } from './residue-forms';
import { useDomainRefresh } from './use-domain-refresh';

type Editor = { title: string; fields: FieldSpec[]; initial: Record<string, unknown>; schema: z.ZodType; kind: ResidueCollection | 'retire' | 'settingsBatch'; rule?: ResidueRule };
const labels = { rules: ['Hồ sơ', 'Profiles'], settings: ['Chính sách áp dụng', 'Adoption settings'], selections: ['Lựa chọn kết quả', 'Report selections'], groups: ['Nhóm nguồn', 'Source groups'] } as const;
export function ResidueScreen() {
  const { client, user } = useAuth(); const scope = client.getRequestScope();
  return user?.isActive && scope !== null ? <ResidueBrowser key={scope} scope={scope} /> : null;
}
function ResidueBrowser({ scope }: { scope: string }) {
  const { client, user } = useAuth(); const { theme } = useAppTheme(); const [owner] = useState(() => user!);
  const [locale, setLocale] = useState<Locale>('vi'); const tr = (vi: string, en: string) => locale === 'vi' ? vi : en;
  const service = useMemo(() => createResidueService(client.api, owner, () => client.getRequestScope() === scope), [client, owner, scope]);
  const [kind, setKind] = useState<ResidueCollection>('rules'); const [search, setSearch] = useState(''); const [status, setStatus] = useState('all'); const [filterScope, setFilterScope] = useState('all');
  const [selected, setSelected] = useState<Record<string, unknown> | null>(null); const [editor, setEditor] = useState<Editor | null>(null);
  const [reviewIdDraft, setReviewIdDraft] = useState(''); const [reviewId, setReviewId] = useState(''); const [notice, setNotice] = useState('');
  const load = useCallback((signal: AbortSignal) => service.list(kind, signal), [service, kind]); const state = useApiResource(load);
  useDomainRefresh(state.reload, Boolean(editor || selected || reviewId));
  const rows = state.status === 'success' ? state.data as Record<string, unknown>[] : null;
  const query = search.trim().toLowerCase();
  const visible = rows?.filter((row) => `${row.code ?? row.ruleCode ?? ''} ${row.residueDefinition ?? ''} ${row.sourceId ?? ''}`.toLowerCase().includes(query) &&
    (kind !== 'rules' || (status === 'all' || Boolean(row.retirement) === (status === 'retired')) && (filterScope === 'all' || Boolean(row.companyId) === (filterScope === 'company')))) ?? [];
  const closeReload = () => { setEditor(null); setSelected(null); setReviewId(''); void state.reload(); };
  const saved = () => { setNotice(tr('Máy chủ đã ghi nhận. Đang tải lại dữ liệu.', 'The server accepted the action. Reloading data.')); closeReload(); };
  const execute = useCallback(async (data: unknown, signal: AbortSignal) => {
    if (!editor) return;
    const command: ResidueCommand = editor.kind === 'retire' ? { kind: 'retire', rule: editor.rule!, data: contract(z.object({ reason: z.string().trim().min(1) }), data) } : { kind: editor.kind, data };
    await service.execute(command, signal);
  }, [service, editor]);
  function newRule(previous?: ResidueRule) {
    const companyId = previous?.companyId ?? (permission(owner, 'residue.policy.manage') ? null : owner.organizationId);
    const initial = previous ? { ...previous, ...reviewDraft(randomUUID, companyId), versionNo: Number(previous.versionNo) + 1, supersedesId: previous.id,
      laboratory: previous.laboratory.map((item) => ({ ...item })), steps: previous.steps.map((item) => ({ ...item })), asReceivedConfirmed: false }
      : { ...reviewDraft(randomUUID, companyId), code: '', versionNo: 1, kind: 'FLOW', schemaVersion: 2, substanceId: '', commodityId: '', residueDefinition: '', unit: 'mg/kg', decimalPlaces: 6, laboratory: [], steps: [], asReceivedConfirmed: false };
    setSelected(null); setEditor({ title: tr('Công bố phiên bản hồ sơ', 'Publish profile version'), kind: 'rules', fields: ruleSpecs(randomUUID), schema: ruleInputSchema, initial });
  }
  function beginPublish() {
    setNotice('');
    if (kind === 'rules') { newRule(); return; }
    const base = reviewDraft(randomUUID, owner.organizationId);
    const initial = kind === 'settings' ? { ...base, ruleCode: '', versionNo: 1, mode: 'SYSTEM_DEFAULT' }
      : kind === 'selections' ? { ...base, sourceId: '', substanceId: '', selectedResultId: '', supersededResultIds: [], residueDefinition: '', absoluteUncertainty: null, reportingThreshold: null, schemaVersion: 2, asReceivedConfirmed: false, profileCode: '', laboratoryMethod: '' }
        : { ...base, code: '', versionNo: 1, substanceId: '', sourceIds: [], supportingResultIds: [], productStage: 'RAW_PADDY', productIdentity: 'RAW_PADDY', residueDefinition: '', lower: '', upper: '', unit: 'mg/kg', precedence: 'DIRECT_FIRST', decimalPlaces: 6, schemaVersion: 2, asReceivedConfirmed: false, profileCode: '' };
    setEditor({ title: tr('Công bố dữ liệu đã thẩm định', 'Publish reviewed data'), kind, fields: kind === 'settings' ? settingSpecs : kind === 'selections' ? selectionSpecs : groupSpecs,
      schema: kind === 'settings' ? settingInputSchema : kind === 'selections' ? selectionInputSchema : groupInputSchema, initial });
  }
  const canPublish = kind === 'rules' ? permission(owner, 'residue.policy.manage') || Boolean(owner.organizationId && permission(owner, 'residue.company-policy.manage'))
    : Boolean(owner.organizationId && permission(owner, kind === 'settings' ? 'residue.company-policy.manage' : 'residue.evidence.manage'));
  return <SafeAreaView style={[formStyles.screen, { backgroundColor: theme.colors.backgroundGrouped }]}>
    <FlatList data={visible} keyExtractor={(row) => String(row.id)} contentContainerStyle={formStyles.content} keyboardShouldPersistTaps="handled" keyboardDismissMode="on-drag"
      refreshing={state.isLoading} onRefresh={() => { void state.reload(); }} ListHeaderComponent={<View style={{ gap: 16 }}>
        <View style={formStyles.row}><GlassButton opaque variant="glass" label={tr('Trang chủ', 'Home')} onPress={() => router.dismissTo('/home')} /><GlassButton opaque variant="glass" label={locale === 'vi' ? 'English' : 'Tiếng Việt'} onPress={() => setLocale(locale === 'vi' ? 'en' : 'vi')} /></View>
        <ComplianceText heading>{tr('Hồ sơ & bằng chứng dư lượng', 'Residue profiles & evidence')}</ComplianceText>
        <View style={formStyles.row}>{(Object.keys(labels) as ResidueCollection[]).map((value) => <GlassButton opaque key={value} label={labels[value][locale === 'vi' ? 0 : 1]} variant={kind === value ? 'primary' : 'glass'} accessibilityState={{ selected: kind === value }}
          onPress={() => { setKind(value); setSelected(null); setSearch(''); setStatus('all'); setFilterScope('all'); setNotice(''); }} />)}</View>
        {notice ? <ComplianceText>{notice}</ComplianceText> : null}
        <GlassButton opaque variant="glass" label={tr('Tải lại', 'Refresh')} loading={state.isLoading} onPress={() => { void state.reload(); }} />
        <ComplianceField label={tr('Tìm trong dữ liệu đã tải', 'Search loaded records')} value={search} onChangeText={setSearch} />
        {kind === 'rules' ? <><View style={formStyles.row}>{['all', 'published', 'retired'].map((value) => <GlassButton opaque key={value} label={value === 'all' ? tr('Tất cả', 'All') : value === 'retired' ? tr('Đã ngừng', 'Retired') : tr('Chưa ngừng', 'Not retired')}
          variant={status === value ? 'primary' : 'glass'} accessibilityState={{ selected: status === value }} onPress={() => setStatus(value)} />)}</View>
          <View style={formStyles.row}>{['all', 'system', 'company'].map((value) => <GlassButton opaque key={value} label={value === 'all' ? tr('Mọi phạm vi', 'All scopes') : value === 'system' ? tr('Hệ thống', 'System') : tr('Công ty', 'Company')}
            variant={filterScope === value ? 'primary' : 'glass'} accessibilityState={{ selected: filterScope === value }} onPress={() => setFilterScope(value)} />)}</View></> : null}
        {rows ? <ComplianceText>{visible.length}/{rows.length} {tr('bản ghi được tải (không phải tổng toàn hệ thống)', 'loaded records (not a system-wide total)')}</ComplianceText> : null}
        {canPublish ? <GlassButton opaque label={tr('Công bố phiên bản mới', 'Publish new version')} onPress={beginPublish} /> : null}
        {kind === 'settings' && canPublish ? <GlassButton opaque variant="glass" label={tr('Công bố nhiều chính sách cùng lúc', 'Publish settings batch')} onPress={() => setEditor({ title: tr('Công bố chính sách theo lô', 'Publish settings batch'), kind: 'settingsBatch',
          schema: z.object({ items: z.array(settingInputSchema).min(1).max(100) }), initial: { items: [] }, fields: [{ key: 'items', label: ['Các chính sách', 'Settings'], kind: 'array', fields: settingSpecs, createRow: () => ({ ...reviewDraft(randomUUID, owner.organizationId), ruleCode: '', versionNo: 1, mode: 'SYSTEM_DEFAULT' }) }] })} /> : null}
        {permission(owner, 'residue.evidence.manage') && owner.organizationId ? <GlassCard opaque title={tr('Đối chiếu kết quả báo cáo lab', 'Review lab report results')}>
          <ComplianceField label={tr('ID báo cáo lab', 'Lab report ID')} value={reviewIdDraft} onChangeText={setReviewIdDraft} />
          <GlassButton opaque variant="glass" label={tr('Mở đối chiếu', 'Open review')} disabled={!z.uuid().safeParse(reviewIdDraft.trim()).success} onPress={() => setReviewId(reviewIdDraft.trim())} />
        </GlassCard> : null}
        <ResourceFeedback loading={state.status === 'idle' || state.isLoading} error={state.error} onReload={() => { void state.reload(); }} tr={tr} />
      </View>}
      renderItem={({ item }) => <GlassCard opaque title={String(item.code ?? item.ruleCode ?? item.id)}>
        <ComplianceText>{String(item.residueDefinition ?? item.mode ?? item.sourceId ?? '')}</ComplianceText>
        <ComplianceText>{tr('Phiên bản / phạm vi', 'Version / scope')}: {String(item.versionNo ?? '—')} · {item.companyId ? tr('Công ty', 'Company') : tr('Hệ thống', 'System')}</ComplianceText>
        {kind === 'rules' ? <ComplianceText>{item.retirement ? tr('Đã ngừng sử dụng', 'Retired') : tr('Phiên bản được công bố; kiểm tra thời gian hiệu lực', 'Published version; check effective dates')}</ComplianceText> : null}
        <GlassButton opaque variant="glass" label={tr('Xem chi tiết', 'View detail')} onPress={() => setSelected(item)} />
      </GlassCard>}
      ListEmptyComponent={rows ? <ComplianceText>{rows.length ? tr('Không có bản ghi phù hợp bộ lọc.', 'No records match these filters.') : tr('Không có bản ghi trả về.', 'No records returned.')}</ComplianceText> : undefined} />
    {selected ? <ResidueDetail record={selected} kind={kind} service={service} locale={locale} onClose={() => setSelected(null)}
      onVersion={newRule} onRetire={(rule) => { setSelected(null); setEditor({ title: tr('Ngừng sử dụng toàn chuỗi hồ sơ', 'Retire entire profile series'), kind: 'retire', rule, schema: z.object({ reason: z.string().trim().min(1) }), initial: { reason: '' }, fields: [textField('reason', 'Lý do ngừng sử dụng *', 'Retirement reason *', { multiline: true })] }); }} /> : null}
    {editor ? <RequestSheet title={editor.title} fields={editor.fields} initial={editor.initial} schema={editor.schema} execute={execute} locale={locale} onClose={() => setEditor(null)} onReload={closeReload} onSaved={saved}
      preview={editor.kind === 'selections' ? { run: service.previewSelection, canSubmit: (result) => (result as { reasons: string[] }).reasons.length === 0 } : undefined}>
      <ComplianceText>{tr('Công bố tạo bản ghi bất biến mới. Cần bằng chứng và thẩm định thực tế; quyền ứng dụng không thay thế thẩm định chuyên môn. Ngừng sử dụng áp dụng cả chuỗi phiên bản.', 'Publication appends an immutable record. Actual evidence and domain review are required; app permission is not scientific approval. Retirement applies to the entire profile series.')}</ComplianceText>
    </RequestSheet> : null}
    {reviewId ? <ReportReviewSheet reportId={reviewId} service={service} companyId={owner.organizationId!} locale={locale} onClose={() => setReviewId('')} onSaved={saved} /> : null}
  </SafeAreaView>;
}
function ResidueDetail({ record, kind, service, locale, onClose, onRetire, onVersion }: { record: Record<string, unknown>; kind: ResidueCollection;
  service: ReturnType<typeof createResidueService>; locale: Locale; onClose: () => void; onRetire: (rule: ResidueRule) => void; onVersion: (rule: ResidueRule) => void }) {
  const { user } = useAuth(); const tr = (vi: string, en: string) => locale === 'vi' ? vi : en;
  const load = useCallback((signal: AbortSignal) => kind === 'rules' ? service.rule(String(record.id), signal) : service.detail(kind, String(record.id), signal), [service, kind, record.id]);
  const state = useApiResource(load); const data = state.status === 'success' ? state.data : null;
  useDomainRefresh(state.reload);
  const rule = kind === 'rules' ? data as ResidueRule | null : null;
  return <ComplianceSheet title={tr('Chi tiết bản đã công bố', 'Published record detail')} busy={false} onClose={onClose} tr={tr}>
    <ResourceFeedback loading={state.isLoading || state.status === 'idle'} error={state.error} onReload={() => { void state.reload(); }} tr={tr} />
    {data ? <StructuredData value={data} locale={locale} /> : null}
    {rule && user && mayRetireRule(user, rule) ? <GlassButton opaque variant="glass" label={tr('Ngừng sử dụng toàn chuỗi', 'Retire entire series')} onPress={() => onRetire(rule)} /> : null}
    {rule && user && !rule.retirement && mayManageRule(user, rule.companyId) ? <GlassButton opaque label={tr('Tạo phiên bản kế tiếp', 'Create next version')} onPress={() => onVersion(rule)} /> : null}
    <GlassButton opaque variant="glass" label={tr('Đóng', 'Close')} onPress={onClose} />
  </ComplianceSheet>;
}
export function ReportReviewSheet({ reportId, companyId, service, locale, onClose, onSaved }: { reportId: string; companyId: string; service: ReturnType<typeof createResidueService>; locale: Locale; onClose: () => void; onSaved: () => void }) {
  const tr = (vi: string, en: string) => locale === 'vi' ? vi : en;
  const execute = useCallback((data: unknown, signal: AbortSignal) => service.execute({ kind: 'reviewConfirm', reportId, data }, signal), [service, reportId]);
  const run = useCallback((data: unknown, signal: AbortSignal) => service.previewReview(reportId, data, signal), [service, reportId]);
  return <RequestSheet title={tr('Đối chiếu dư lượng báo cáo', 'Review report residue')} fields={reviewRequestSpecs(randomUUID)} initial={{ companyId, effectiveFrom: null, rows: [], asReceivedConfirmed: false }}
    schema={reportReviewSchema} execute={execute} locale={locale} onClose={onClose} onReload={onClose} onSaved={onSaved} submitLabel={tr('Xác nhận bản đã xem trước', 'Confirm reviewed preview')}
    preview={{ run, canSubmit: (result) => { const value = result as ReviewResponse; return value.rows.length > 0 && value.rows.every((row) => !row.reasons.length && Boolean(row.input.previewFingerprint)); },
      prepare: (data, result) => ({ companyId: (data as { companyId: string }).companyId, ...prepareReviewConfirmation(result as ReviewResponse, (data as { asReceivedConfirmed: boolean }).asReceivedConfirmed) }) }}>
    <ComplianceText>{reportId}</ComplianceText><ComplianceText>{tr('Đọc kết quả, hồ sơ, chính sách và các mâu thuẫn do máy chủ trả về trước khi xác nhận. Mọi thay đổi sẽ yêu cầu xem trước lại. Máy chủ kiểm tra dấu đối chiếu để phát hiện dữ liệu đã cũ.', 'Review server-returned results, profiles, settings and conflicts before confirming. Any edit requires a new preview. The server checks fingerprints for stale evidence.')}</ComplianceText>
  </RequestSheet>;
}
