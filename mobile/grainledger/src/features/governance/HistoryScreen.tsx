import { router } from 'expo-router';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { FlatList, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { GlassButton } from '@/components/glass/GlassButton';
import { GlassCard } from '@/components/glass/GlassCard';
import { useAuth } from '@/features/auth/AuthProvider';
import { useApiResource } from '@/hooks/use-api-resource';
import { useAppTheme } from '@/theme/ThemeProvider';
import { ComplianceField, ComplianceSheet, ComplianceText, formStyles, type Locale } from '../compliance/compliance-ui';
import { idSchema } from './api-common';
import { PageControls, ResourceFeedback, StructuredData } from './domain-ui';
import { createHistoryService, filterHistory, historyEntity, historyKey, type HistoryEntry } from './history-api';
import { eventLabel, readableDecimal } from './event-presentation';
import { useDomainRefresh } from './use-domain-refresh';
import { normalizeApiError } from '@/services/api/errors';
import { failureText } from '../compliance/compliance-ui';

const kinds = ['ALL', 'PROCUREMENT_COMMITTED', 'DRYING', 'MILLING', 'MERGE', 'BLENDING', 'BAGGING', 'HOLD', 'HOLD_RESPONSE', 'VARIANCE_CONFIRMATION', 'CORRECTION_REQUEST', 'CORRECTION'];
export function HistoryScreen({ reference, pageHint }: { reference?: { type: string; id: string }; pageHint?: string | string[] }) {
  const { client, user } = useAuth(); const scope = client.getRequestScope(); if (!user || scope === null) return null;
  if (reference && (typeof reference.type !== 'string' || typeof reference.id !== 'string' || !['event', 'posting', 'lot', 'operation'].includes(reference.type.toLowerCase()) || !idSchema.safeParse(reference.id).success)) return <InvalidHistoryReference />;
  return <History key={`${scope}:${reference?.type ?? ''}:${reference?.id ?? ''}`} scope={scope} reference={reference} pageHint={pageHint} />;
}
function InvalidHistoryReference() { const { theme } = useAppTheme(); return <SafeAreaView style={[formStyles.screen, { backgroundColor: theme.colors.backgroundGrouped }]}><View style={formStyles.content}>
  <ComplianceText error>Tham chiếu lịch sử không hợp lệ / Invalid history reference</ComplianceText><GlassButton opaque label="Danh sách lịch sử / History" onPress={() => router.dismissTo('/events')} /></View></SafeAreaView>; }
function History({ scope, reference, pageHint }: { scope: string; reference?: { type: string; id: string }; pageHint?: string | string[] }) {
  const { client, user } = useAuth(); const { theme } = useAppTheme(); const [owner] = useState(() => user!);
  const [locale, setLocale] = useState<Locale>('vi'); const tr = (vi: string, en: string) => locale === 'vi' ? vi : en;
  const [page, setPage] = useState(() => typeof pageHint === 'string' && /^\d+$/.test(pageHint) && Number.isSafeInteger(Number(pageHint)) && Number(pageHint) > 0 ? Number(pageHint) : 1);
  const [draft, setDraft] = useState(''); const [search, setSearch] = useState(''); const [entity, setEntity] = useState('ALL'); const [kind, setKind] = useState('ALL'); const [picked, setSelected] = useState<HistoryEntry | null>(null); const [referenceClosed, setReferenceClosed] = useState(false);
  const [showRaw, setShowRaw] = useState(false);
  const finder = useRef<AbortController | null>(null); const [findingPage, setFindingPage] = useState(0); const [finderMessage, setFinderMessage] = useState('');
  useEffect(() => () => finder.current?.abort(), []);
  const service = useMemo(() => createHistoryService(client.api, owner, () => client.getRequestScope() === scope), [client, owner, scope]);
  const refType = reference?.type; const refId = reference?.id;
  const load = useCallback((signal: AbortSignal) => service.list(page, search, signal, refType && refId ? { type: refType, id: refId } : undefined), [service, page, search, refType, refId]);
  const state = useApiResource(load); const data = state.status === 'success' ? state.data : null;
  const referenceRows = data?.items.filter((row) => !reference || reference.type.toLowerCase() === 'lot' ||
    (reference.type.toLowerCase() === 'posting' ? row.postingId === reference.id : reference.type.toLowerCase() === 'operation' ? row.operationId === reference.id : row.id === reference.id)) ?? [];
  const rows = filterHistory(referenceRows, entity, kind);
  const selected = picked ?? (!referenceClosed && reference && ['posting', 'event'].includes(reference.type.toLowerCase()) ? referenceRows[0] ?? null : null);
  useDomainRefresh(state.reload, Boolean(selected || findingPage));
  function closeDetail() { setSelected(null); setReferenceClosed(true); }
  function changePage(next: number) { setSelected(null); setReferenceClosed(false); setPage(next); }
  async function findReference() {
    if (!reference || finder.current) return;
    const controller = new AbortController(); finder.current = controller; setFindingPage(1); setFinderMessage('');
    try {
      const result = await service.findReference({ type: reference.type.toLowerCase(), id: reference.id }, controller.signal, setFindingPage);
      if (controller.signal.aborted) return;
      if (result) { setPage(result.page); setShowRaw(false); setSelected(result.entry); setReferenceClosed(true); }
      else setFinderMessage(tr('Không thấy trong đợt tra cứu này. Dữ liệu có thể thay đổi trong lúc phân trang; có thể thử lại.', 'No match during this lookup. Rows may change during paging; you can retry.'));
    } catch (error) { if (!controller.signal.aborted) setFinderMessage(failureText(normalizeApiError(error), tr)); }
    finally { if (finder.current === controller) { finder.current = null; setFindingPage(0); } }
  }
  return <SafeAreaView style={[formStyles.screen, { backgroundColor: theme.colors.backgroundGrouped }]}>
    <FlatList data={rows} keyExtractor={historyKey} contentContainerStyle={formStyles.content} refreshing={state.isLoading} onRefresh={() => { setSelected(null); void state.reload(); }}
      keyboardShouldPersistTaps="handled" keyboardDismissMode="on-drag" ListHeaderComponent={<View style={{ gap: 16 }}>
        <View style={formStyles.row}><GlassButton opaque variant="glass" label={tr('Trang chủ', 'Home')} onPress={() => router.dismissTo('/home')} /><GlassButton opaque variant="glass" label={locale === 'vi' ? 'English' : 'Tiếng Việt'} onPress={() => setLocale(locale === 'vi' ? 'en' : 'vi')} /></View>
        <ComplianceText heading>{tr('Lịch sử sự kiện', 'Event history')}</ComplianceText>
        {reference ? <GlassCard opaque title={tr('Tham chiếu đang tra cứu', 'Current reference')}><ComplianceText>{reference.type}: {reference.id}</ComplianceText>
          <ComplianceText>{tr('Chi tiết được đối chiếu từ các trang lịch sử thực tế. Nếu liên kết không có số trang hoặc dữ liệu dịch chuyển, dùng phân trang để tìm tiếp; chưa tìm thấy trên trang này không có nghĩa bản ghi không tồn tại.', 'Detail is matched against actual history pages. If the link has no page hint or rows have moved, continue paging; no match on this page does not mean the record does not exist.')}</ComplianceText>
          <GlassButton opaque variant="glass" label={tr('Toàn bộ lịch sử', 'All history')} onPress={() => router.dismissTo('/events')} /></GlassCard> : <GlassCard opaque title={tr('Tìm trên máy chủ', 'Server search')}>
          <ComplianceField label={tr('Mã lô, đơn vị hoặc loại sự kiện', 'Lot code, owner or event kind')} value={draft} onChangeText={setDraft} returnKeyType="search" onSubmitEditing={() => { setPage(1); setSelected(null); setSearch(draft.trim()); }} />
          <View style={formStyles.row}><GlassButton opaque variant="glass" label={tr('Tìm kiếm', 'Search')} onPress={() => { setPage(1); setSelected(null); setSearch(draft.trim()); }} />
            <GlassButton opaque variant="glass" label={tr('Xóa tìm kiếm', 'Clear search')} onPress={() => { setPage(1); setDraft(''); setSearch(''); setSelected(null); }} /></View>
        </GlassCard>}
        {reference && reference.type.toLowerCase() !== 'lot' ? <GlassCard opaque title={tr('Tra cứu tham chiếu qua các trang', 'Find reference across pages')}>
          <ComplianceText>{tr('Tra cứu lần lượt lịch sử được phép xem. Nếu lịch sử lớn, việc tìm có thể mất thời gian; bạn có thể dừng bất kỳ lúc nào.', 'Search authorized history pages sequentially. Large histories may take time; you can stop at any time.')}</ComplianceText>
          {findingPage ? <><ComplianceText>{tr('Đang kiểm tra trang', 'Checking page')} {findingPage}</ComplianceText><GlassButton opaque variant="glass" label={tr('Dừng tra cứu', 'Stop lookup')} onPress={() => { finder.current?.abort(); finder.current = null; setFindingPage(0); setFinderMessage(tr('Đã dừng tra cứu.', 'Lookup stopped.')); }} /></>
            : <GlassButton opaque variant="glass" label={tr('Tìm tham chiếu từ trang đầu', 'Find reference from first page')} onPress={() => { void findReference(); }} />}
          {finderMessage ? <ComplianceText>{finderMessage}</ComplianceText> : null}
        </GlassCard> : null}
        <GlassCard opaque title={tr('Bộ lọc trên trang hiện tại', 'Current-page filters')}><View style={formStyles.row}>{['ALL', 'Lot', 'Operation', 'Event'].map((value) => <GlassButton opaque key={value} label={value === 'ALL' ? tr('Mọi đối tượng', 'All entities') : value}
          variant={entity === value ? 'primary' : 'glass'} accessibilityState={{ selected: entity === value }} onPress={() => setEntity(value)} />)}</View>
          <View style={formStyles.row}>{kinds.map((value) => <GlassButton opaque key={value} label={value === 'ALL' ? tr('Mọi loại sự kiện', 'All event kinds') : eventLabel(value, locale)}
            variant={kind === value ? 'primary' : 'glass'} accessibilityState={{ selected: kind === value }} onPress={() => setKind(value)} />)}</View>
        </GlassCard>
        <GlassButton opaque variant="glass" label={tr('Tải lại', 'Refresh')} loading={state.isLoading} onPress={() => { setSelected(null); void state.reload(); }} />
        <ResourceFeedback loading={state.status === 'idle' || state.isLoading} error={state.error} onReload={() => { void state.reload(); }} tr={tr} />
        {data ? <ComplianceText>{rows.length}/{data.items.length} {tr('dòng hiển thị trên trang; tổng trong phạm vi truy vấn', 'rows shown on this page; total within query scope')}: {data.totalCount}</ComplianceText> : null}
      </View>}
      renderItem={({ item }) => <GlassCard opaque title={eventLabel(item.kind, locale)}><ComplianceText>{new Date(item.occurredAt).toLocaleString(locale === 'vi' ? 'vi-VN' : 'en-US')}</ComplianceText>
        <ComplianceText>{historyEntity(item)}: {item.lotId ?? item.operationId ?? item.id}</ComplianceText><ComplianceText>{tr('Người ghi', 'Actor')}: {item.actorId}</ComplianceText>
        <ComplianceText>{tr('Khối lượng bút toán', 'Posting mass')}: {item.quantityKg === null ? tr('Chưa cung cấp', 'Not supplied') : `${readableDecimal(item.quantityKg, locale)} kg`}</ComplianceText>
        <View style={formStyles.row}><GlassButton opaque variant="glass" label={tr('Xem chi tiết', 'View detail')} onPress={() => { setShowRaw(false); setSelected(item); }} />
          <GlassButton opaque variant="glass" label={tr('Mở liên kết chi tiết', 'Open detail link')} onPress={() => router.push({ pathname: '/events/[type]/[id]', params: { type: item.postingId ? 'posting' : 'event', id: item.postingId ?? item.id, page: String(page) } })} /></View>
      </GlassCard>}
      ListEmptyComponent={data ? <ComplianceText>{data.items.length ? tr('Không có dòng phù hợp trên trang này. Có thể xóa bộ lọc hoặc tiếp tục phân trang.', 'No matching rows on this page. Clear filters or continue paging.') : tr('Không có dòng lịch sử trả về cho trang này.', 'No history rows returned on this page.')}</ComplianceText> : undefined}
      ListFooterComponent={<PageControls page={page} hasMore={data?.hasMore ?? false} busy={state.isLoading || findingPage > 0} tr={tr} onChange={changePage} />} />
    {selected ? <ComplianceSheet title={eventLabel(selected.kind, locale)} busy={false} onClose={closeDetail} tr={tr}>
      <StructuredData value={{ id: selected.id, postingId: selected.postingId, actorId: selected.actorId, occurredAt: selected.occurredAt, lotId: selected.lotId, operationId: selected.operationId,
        locationId: selected.locationId, ownerId: selected.ownerId, ownerName: selected.ownerName, quantityKg: selected.quantityKg, reversesPostingId: selected.reversesPostingId }} locale={locale} />
      <GlassCard opaque title={tr('Nội dung nghiệp vụ được trả về', 'Returned business details')}><StructuredData value={selected.details} locale={locale} /></GlassCard>
      <GlassButton opaque variant="glass" label={tr('Dữ liệu gốc để đối chiếu (JSON)', 'Original data for comparison (JSON)')} accessibilityState={{ expanded: showRaw }} onPress={() => setShowRaw(!showRaw)} />
      {showRaw ? <ComplianceText>{JSON.stringify(selected.details, null, 2)}</ComplianceText> : null}
      <ComplianceText>{tr('Nhấn giữ văn bản để sao chép mã. Dữ liệu không cung cấp email, chữ ký hay trạng thái xác minh.', 'Long press text to copy IDs. This API does not provide email, signatures or verification status.')}</ComplianceText>
      <GlassButton opaque variant="glass" label={tr('Đóng', 'Close')} onPress={closeDetail} />
    </ComplianceSheet> : null}
  </SafeAreaView>;
}
