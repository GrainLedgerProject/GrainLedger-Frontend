import { router } from 'expo-router';
import { useCallback, useMemo, useRef, useState } from 'react';
import { FlatList, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { GlassButton } from '@/components/glass/GlassButton';
import { GlassCard } from '@/components/glass/GlassCard';
import { useAuth } from '@/features/auth/AuthProvider';
import { useApiResource } from '@/hooks/use-api-resource';
import { useAppTheme } from '@/theme/ThemeProvider';
import { canViewLabSamples } from './lab-samples-api';
import { createLabReportService, filterReports, reportStats, type LabReport, type ReportFilter } from './lab-reports-api';
import { ComplianceField, ComplianceText, failureText, formStyles } from './compliance-ui';
import { ReportEditor } from './ReportEditor';
import { canWriteReports } from './report-commands';

export function LabReportsScreen() {
  const { client, user } = useAuth();
  if (!user || client.getRequestScope() === null) return null;
  return canViewLabSamples(user) ? <ReportList key={client.getRequestScope()} scope={client.getRequestScope()!} /> : <ComplianceDenied />;
}
export function ComplianceDenied() {
  const { theme } = useAppTheme();
  return <SafeAreaView style={[formStyles.screen, { backgroundColor: theme.colors.backgroundGrouped }]}><View style={formStyles.content}>
    <ComplianceText error>Không có quyền truy cập / Access denied</ComplianceText>
    <GlassButton opaque label="Về Trang chủ / Home" onPress={() => router.dismissTo('/home')} />
  </View></SafeAreaView>;
}
function ReportList({ scope }: { scope: string }) {
  const { client, user } = useAuth();
  const { theme } = useAppTheme();
  const [owner] = useState(() => user!);
  const [locale, setLocale] = useState<'vi' | 'en'>('vi');
  const tr = (vi: string, en: string) => locale === 'vi' ? vi : en;
  const [page, setPage] = useState(1);
  const [draft, setDraft] = useState('');
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState<ReportFilter>('ALL');
  const [editing, setEditing] = useState(false);
  const [success, setSuccess] = useState(false);
  const list = useRef<FlatList<LabReport>>(null);
  const service = useMemo(() => createLabReportService(client.api, owner, () => client.getRequestScope() === scope), [client, owner, scope]);
  const load = useCallback((signal: AbortSignal) => service.list(page, signal), [service, page]);
  const state = useApiResource(load);
  const data = state.status === 'success' ? state.data : null;
  const rows = data ? filterReports(data.items, search, filter) : [];
  const stats = data ? reportStats(data.items) : null;
  const busy = state.status === 'idle' || state.isLoading;
  const changePage = (next: number) => { setPage(next); list.current?.scrollToOffset({ offset: 0, animated: false }); };
  const closeReload = () => { setEditing(false); void state.reload(); };
  return <SafeAreaView style={[formStyles.screen, { backgroundColor: theme.colors.backgroundGrouped }]}>
    <FlatList ref={list} data={rows} keyExtractor={(item) => item.id} contentContainerStyle={formStyles.content} refreshing={state.isLoading}
      onRefresh={() => { void state.reload(); }} keyboardDismissMode="on-drag" keyboardShouldPersistTaps="handled"
      ListHeaderComponent={<View style={{ gap: 16 }}>
        <View style={formStyles.row}><GlassButton opaque variant="glass" label={tr('Trang chủ', 'Home')} onPress={() => router.dismissTo('/home')} />
          <GlassButton opaque variant="glass" label={locale === 'vi' ? 'English' : 'Tiếng Việt'} onPress={() => setLocale(locale === 'vi' ? 'en' : 'vi')} /></View>
        <Text accessibilityRole="header" style={[theme.typography.display, { color: theme.colors.textPrimary }]}>{tr('Kết quả lab & MRL', 'Lab results & MRL')}</Text>
        <ComplianceText>{owner.organizationName || tr('Phạm vi tài khoản', 'Account scope')}</ComplianceText>
        {canWriteReports(owner) ? <GlassButton opaque label={tr('Nhập báo cáo', 'Enter report')} onPress={() => { setSuccess(false); setEditing(true); }} /> : null}
        <GlassButton opaque variant="glass" label={tr('Tải lại', 'Refresh')} loading={busy} onPress={() => { void state.reload(); }} />
        {success ? <ComplianceText>{tr('Máy chủ đã nhận báo cáo. Danh sách đang tải lại.', 'The server accepted the report. Reloading the list.')}</ComplianceText> : null}
        {stats ? <GlassCard opaque title={tr('Thống kê trang đã tải', 'Loaded-page statistics')}>
          <ComplianceText>{tr('Tổng', 'Total')}: {stats.total} · {tr('Đạt', 'Compliant')}: {stats.compliant}</ComplianceText>
          <ComplianceText>{tr('Không đạt', 'Non-compliant')}: {stats.nonCompliant} · {tr('Chờ xác nhận/đánh giá', 'Pending review')}: {stats.pending}</ComplianceText>
        </GlassCard> : null}
        <GlassCard opaque title={tr('Tìm kiếm và lọc trên trang', 'Search and filter this page')}>
          <ComplianceField label={tr('Số báo cáo, lab, tiêu chuẩn hoặc kết luận', 'Report number, lab, standard or conclusion')} value={draft} onChangeText={setDraft}
            returnKeyType="search" onSubmitEditing={() => setSearch(draft)} />
          <View style={formStyles.row}><GlassButton opaque variant="glass" label={tr('Tìm kiếm', 'Search')} onPress={() => setSearch(draft)} />
            <GlassButton opaque variant="glass" label={tr('Xóa tìm kiếm', 'Clear search')} onPress={() => { setDraft(''); setSearch(''); }} /></View>
          <View style={formStyles.row}>{(['ALL', 'COMPLIANT', 'NON_COMPLIANT', 'PENDING'] as const).map((value) => <GlassButton opaque key={value}
            label={value === 'ALL' ? tr('Tất cả', 'All') : value === 'COMPLIANT' ? tr('Đạt', 'Compliant') : value === 'NON_COMPLIANT' ? tr('Không đạt', 'Non-compliant') : tr('Chờ đánh giá', 'Pending')}
            variant={filter === value ? 'primary' : 'glass'} accessibilityState={{ selected: filter === value }} onPress={() => setFilter(value)} />)}</View>
          <ComplianceText>{tr('Bộ lọc và thống kê chỉ áp dụng cho trang hiện tại, yêu cầu 20 báo cáo/trang. Trạng thái đánh giá do máy chủ cung cấp.', 'Filters and statistics apply to this page only, requesting 20 reports/page. Assessment status is supplied by the server.')}</ComplianceText>
        </GlassCard>
        {state.error ? <GlassCard opaque><ComplianceText error>{failureText(state.error, tr)}</ComplianceText>
          <GlassButton opaque variant="glass" label={tr('Thử lại', 'Retry')} onPress={() => { void state.reload(); }} /></GlassCard> : null}
        {data ? <ComplianceText>{tr('Hiển thị', 'Showing')} {rows.length}/{data.items.length} · {tr('Trang', 'Page')} {page}</ComplianceText> : null}
      </View>}
      renderItem={({ item }) => <GlassCard opaque title={item.reportNumber || item.id}>
        <ComplianceText>{item.laboratoryName}</ComplianceText><ComplianceText>{tr('Ngày cấp', 'Issued')}: {item.issuedOn}</ComplianceText>
        <ComplianceText>{tr('Đánh giá máy chủ', 'Server assessment')}: {item.assessmentStatus || tr('Chưa cung cấp', 'Not provided')}</ComplianceText>
        <ComplianceText>{tr('Trạng thái báo cáo', 'Report status')}: {item.status}</ComplianceText>
        <GlassButton opaque variant="glass" label={tr('Xem báo cáo', 'View report')} accessibilityLabel={`${tr('Xem báo cáo', 'View report')} ${item.reportNumber || item.id}`}
          onPress={() => router.push({ pathname: '/compliance/lab-results/[id]', params: { id: item.id } })} />
      </GlassCard>}
      ListEmptyComponent={!state.error ? <ComplianceText>{busy ? tr('Đang tải báo cáo…', 'Loading reports…') : data?.items.length
        ? tr('Không có báo cáo phù hợp bộ lọc trên trang này.', 'No reports match the filters on this page.') : tr('Không có báo cáo trả về.', 'No reports returned.')}</ComplianceText> : undefined}
      ListFooterComponent={<View style={formStyles.row}>
        <GlassButton opaque variant="glass" label={tr('Trang trước', 'Previous page')} disabled={page <= 1 || busy} onPress={() => changePage(page - 1)} />
        <GlassButton opaque variant="glass" label={tr('Trang sau', 'Next page')} disabled={!data?.hasMore || busy} onPress={() => changePage(page + 1)} />
      </View>} />
    {editing ? <ReportEditor report={null} scope={scope} locale={locale} onClose={() => setEditing(false)} onReload={closeReload}
      onSaved={() => { setSuccess(true); setEditing(false); if (page !== 1) changePage(1); else void state.reload(); }} /> : null}
  </SafeAreaView>;
}
