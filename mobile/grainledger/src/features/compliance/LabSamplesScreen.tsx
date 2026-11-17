import { router } from 'expo-router';
import { useCallback, useMemo, useRef, useState } from 'react';
import { FlatList, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { GlassButton } from '@/components/glass/GlassButton';
import { GlassCard } from '@/components/glass/GlassCard';
import { GlassInput } from '@/components/glass/GlassInput';
import { useAuth } from '@/features/auth/AuthProvider';
import { useApiResource } from '@/hooks/use-api-resource';
import { useAppTheme } from '@/theme/ThemeProvider';
import { LabSampleDetail } from './LabSampleDetail';
import { SampleEditor } from './SampleEditor';
import { canViewLabSamples, createLabSamplesService, filterLabSamples, labSampleStats, sampleDate, type LabSample, type SampleFilter } from './lab-samples-api';

export function LabSamplesScreen({ initialCreate = false }: { initialCreate?: boolean }) {
  const { client, user } = useAuth();
  const { theme } = useAppTheme();
  const scope = client.getRequestScope();
  if (!user || scope === null) return null;
  if (!canViewLabSamples(user)) return <SafeAreaView style={[styles.screen, { backgroundColor: theme.colors.backgroundGrouped }]}>
    <View style={styles.content}><GlassCard title="Không có quyền truy cập / Access denied">
      <Text accessibilityRole="alert" style={[theme.typography.body, { color: theme.colors.textPrimary }]}>Mẫu lab chỉ dành cho Quản lý doanh nghiệp. / Lab samples are available to Customer Managers only.</Text>
      <GlassButton label="Về Trang chủ / Home" onPress={() => router.dismissTo('/home')} />
    </GlassCard></View>
  </SafeAreaView>;
  return <SampleList key={scope} scope={scope} initialCreate={initialCreate} />;
}
function SampleList({ scope, initialCreate }: { scope: string; initialCreate: boolean }) {
  const { client, user } = useAuth();
  const { theme } = useAppTheme();
  const { colors: c, typography: t } = theme;
  const [owner] = useState(() => user!);
  const [locale, setLocale] = useState<'vi' | 'en'>('vi');
  const [page, setPage] = useState(1);
  const [draft, setDraft] = useState('');
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState<SampleFilter>('ALL');
  const [selected, setSelected] = useState<LabSample | null>(null);
  const [editor, setEditor] = useState<{ sample: LabSample | null } | null>(() => initialCreate ? { sample: null } : null);
  const [success, setSuccess] = useState('');
  const list = useRef<FlatList<LabSample>>(null);
  const tr = (vi: string, en: string) => locale === 'vi' ? vi : en;
  const service = useMemo(() => createLabSamplesService(client.api, owner, () => client.getRequestScope() === scope), [client, owner, scope]);
  const load = useCallback((signal: AbortSignal) => service.list(page, signal), [service, page]);
  const state = useApiResource(load);
  const data = state.status === 'success' ? state.data : null;
  const filtered = data ? filterLabSamples(data.items, search, status) : [];
  const stats = data ? labSampleStats(data.items) : null;
  const loading = state.status === 'idle' || state.isLoading;
  const changePage = (next: number) => { setPage(next); list.current?.scrollToOffset({ offset: 0, animated: false }); };
  const unknown = tr('Chưa được cung cấp', 'Not provided');
  const closeEditor = () => { setEditor(null); if (initialCreate) router.replace('/compliance/lab-samples'); };
  const reloadAfterEdit = () => { closeEditor(); setSelected(null); void state.reload(); };
  const errorText = state.error?.status === 403 ? tr('Bạn không có quyền xem mẫu lab trong phạm vi này.', 'You do not have access to lab samples in this scope.')
    : state.error?.code === 'configuration' ? tr('Chưa cấu hình dịch vụ mẫu lab.', 'The lab sample service is not configured.')
      : state.error?.code === 'contract' ? tr('Dữ liệu mẫu lab không đúng định dạng.', 'Unsupported lab sample data.')
        : tr('Không thể tải mẫu lab. Kiểm tra kết nối và thử lại.', 'Unable to load lab samples. Check your connection and retry.');
  return <SafeAreaView style={[styles.screen, { backgroundColor: c.backgroundGrouped }]}>
    <FlatList ref={list} data={filtered} keyExtractor={(item) => item.id} contentContainerStyle={styles.content}
      keyboardShouldPersistTaps="handled" keyboardDismissMode="on-drag" refreshing={state.isLoading} onRefresh={() => { void state.reload(); }}
      ListHeaderComponent={<View style={styles.header}>
        <View style={styles.toolbar}>
          <GlassButton opaque variant="glass" label={tr('Về Trang chủ', 'Home')} onPress={() => router.dismissTo('/home')} />
          <GlassButton opaque variant="glass" label={locale === 'vi' ? 'English' : 'Tiếng Việt'} onPress={() => setLocale(locale === 'vi' ? 'en' : 'vi')} />
        </View>
        <Text accessibilityRole="header" style={[t.display, { color: c.textPrimary }]}>{tr('Mẫu lab', 'Lab samples')}</Text>
        <Text style={[t.body, { color: c.textSecondary }]}>{user?.organizationName || tr('Phạm vi tài khoản', 'Account scope')}</Text>
        <GlassButton opaque label={tr('Đăng ký mẫu lab', 'Register lab sample')} onPress={() => { setSuccess(''); setEditor({ sample: null }); }} />
        {success ? <Text accessibilityLiveRegion="polite" style={[t.body, { color: c.textPrimary }]}>{success}</Text> : null}
        <GlassButton opaque variant="glass" label={tr('Tải lại danh sách', 'Refresh samples')} loading={loading}
          loadingLabel={tr('Đang tải…', 'Loading…')} onPress={() => { void state.reload(); }} />
        {stats ? <GlassCard title={tr('Trang đã tải', 'Loaded page')}>
          {[
            [tr('Tổng mẫu trên trang', 'Samples on page'), stats.total],
            [tr('Có mã niêm chì', 'With seal code'), stats.sealed],
            [tr('Đã có lượt bàn giao', 'With handovers'), stats.handedOver],
            [tr('Chưa ghi bàn giao', 'Without handovers'), stats.inStore],
          ].map(([label, value]) => <View key={label} style={styles.summaryRow}>
            <Text style={[t.body, styles.summaryLabel, { color: c.textSecondary }]}>{label}</Text>
            <Text style={[t.heading, styles.number, { color: c.textPrimary }]}>{value}</Text>
          </View>)}
        </GlassCard> : null}
        <GlassCard title={tr('Tìm kiếm và bộ lọc', 'Search and filters')}>
          <GlassInput opaque label={tr('Mã mẫu, niêm chì, lô nguồn hoặc mô tả', 'Sample, seal, source lot or description')} value={draft}
            onChangeText={setDraft} autoCorrect={false} returnKeyType="search" onSubmitEditing={() => setSearch(draft)} />
          <View style={styles.toolbar}>
            <GlassButton opaque variant="glass" label={tr('Tìm kiếm', 'Search')} onPress={() => setSearch(draft)} />
            <GlassButton opaque variant="glass" label={tr('Xóa tìm kiếm', 'Clear search')} onPress={() => { setDraft(''); setSearch(''); }} />
          </View>
          <View style={styles.toolbar}>{(['ALL', 'HANDED_OVER', 'IN_STORE'] as const).map((value) => <GlassButton opaque key={value}
            variant={status === value ? 'primary' : 'glass'} accessibilityState={{ selected: status === value }}
            label={value === 'ALL' ? tr('Tất cả', 'All') : value === 'HANDED_OVER' ? tr('Có bàn giao', 'With handovers') : tr('Chưa bàn giao', 'No handovers')}
            onPress={() => setStatus(value)} />)}</View>
          <Text style={[t.caption, { color: c.textSecondary }]}>{tr('Tìm kiếm và bộ lọc chỉ áp dụng trên trang hiện tại (yêu cầu 20 mẫu mỗi trang).', 'Search and filters apply to the current page only (20 samples requested per page).')}</Text>
        </GlassCard>
        {state.status === 'error' ? <GlassCard title={tr('Không thể tải danh sách', 'Samples unavailable')}>
          <Text accessibilityRole="alert" style={[t.body, { color: c.danger }]}>{errorText}</Text>
          <GlassButton opaque variant="glass" label={tr('Thử lại', 'Retry')} onPress={() => { void state.reload(); }} />
          {page > 1 ? <GlassButton opaque variant="glass" label={tr('Về trang trước', 'Previous page')} onPress={() => changePage(page - 1)} /> : null}
        </GlassCard> : null}
        {data ? <Text accessibilityLiveRegion="polite" style={[t.caption, { color: c.textSecondary }]}>{tr('Hiển thị', 'Showing')} {filtered.length}/{data.items.length} {tr('mẫu trên trang', 'samples on page')} {page}.</Text> : null}
      </View>}
      ListEmptyComponent={state.status !== 'error' ? <GlassCard title={loading ? tr('Đang tải mẫu lab…', 'Loading lab samples…') : tr('Không có mẫu phù hợp', 'No matching samples')}>
        <Text accessibilityLiveRegion="polite" style={[t.body, { color: c.textSecondary }]}>{loading ? tr('Vui lòng chờ.', 'Please wait.')
          : data?.items.length ? tr('Thử đổi bộ lọc hoặc tìm kiếm trên trang này.', 'Change the search or filters on this page.')
            : tr('Không có mẫu được trả về cho trang này.', 'No samples were returned for this page.')}</Text>
      </GlassCard> : undefined}
      renderItem={({ item }) => <GlassCard title={item.code || item.id} style={styles.row}>
        <Text selectable style={[t.body, { color: c.textPrimary }]}>{tr('Niêm chì', 'Seal')}: {item.sealCode || unknown}</Text>
        <Text selectable style={[t.body, { color: c.textPrimary }]}>{tr('Lô nguồn', 'Source lot')}: {item.sourceLotId}</Text>
        <Text style={[t.body, { color: c.textSecondary }]}>{item.materialDescription || unknown}</Text>
        <Text style={[t.caption, { color: c.textSecondary }]}>{tr('Lấy mẫu lúc', 'Collected at')}: {sampleDate(item.collectedAt, locale)}</Text>
        <Text style={[t.body, { color: c.textSecondary }]}>{item.handoverCount > 0 ? tr('Đã có lượt bàn giao', 'Handover recorded') : tr('Chưa ghi bàn giao', 'No handover recorded')}: {item.handoverCount}</Text>
        <GlassButton opaque variant="glass" label={tr('Xem chi tiết', 'View detail')} accessibilityLabel={`${tr('Xem mẫu', 'View sample')} ${item.code || item.id}`} onPress={() => setSelected(item)} />
      </GlassCard>}
      ListFooterComponent={<View style={styles.footer}>
        <View style={styles.toolbar}>
          <GlassButton opaque variant="glass" label={tr('Trang trước', 'Previous page')} disabled={page <= 1 || loading} onPress={() => changePage(page - 1)} />
          <GlassButton opaque variant="glass" label={tr('Trang sau', 'Next page')} disabled={!data?.hasMore || loading} onPress={() => changePage(page + 1)} />
        </View>
        <Text style={[t.caption, { color: c.textSecondary }]}>{tr('Đăng ký và bàn giao cần kết nối máy chủ.', 'Registration and handover require a server connection.')}</Text>
      </View>} />
    {selected ? <LabSampleDetail key={`${scope}:${selected.id}`} sample={selected} service={service} locale={locale} onClose={() => setSelected(null)}
      onHandover={() => { setSelected(null); setSuccess(''); setEditor({ sample: selected }); }} /> : null}
    {editor ? <SampleEditor key={editor.sample?.id ?? 'capture'} sample={editor.sample} scope={scope} locale={locale} onClose={closeEditor}
      onReload={reloadAfterEdit} onSaved={() => {
        setSuccess(editor.sample ? tr('Máy chủ đã ghi nhận bàn giao. Danh sách đang được tải lại.', 'The server accepted the handover. Reloading samples.')
          : tr('Máy chủ đã ghi nhận mẫu. Danh sách đang được tải lại.', 'The server accepted the sample. Reloading samples.'));
        const captured = !editor.sample; setEditor(null); setSelected(null);
        if (captured && page !== 1) setPage(1); else void state.reload();
      }} /> : null}
  </SafeAreaView>;
}
const styles = StyleSheet.create({ screen: { flex: 1 }, content: { padding: 20, maxWidth: 800, width: '100%', alignSelf: 'center' },
  header: { gap: 16, paddingBottom: 20 }, toolbar: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: 8 },
  summaryRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 12, alignItems: 'baseline' }, summaryLabel: { flex: 1, minWidth: 140 },
  number: { fontVariant: ['tabular-nums'] }, row: { marginBottom: 12 }, footer: { gap: 16, paddingVertical: 16 } });
