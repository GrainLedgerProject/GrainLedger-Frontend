import { useCallback, useMemo, useRef, useState } from 'react';
import { router, useLocalSearchParams } from 'expo-router';
import { FlatList, StyleSheet, Text, View, useWindowDimensions } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { GlassButton } from '@/components/glass/GlassButton';
import { GlassCard } from '@/components/glass/GlassCard';
import { GlassInput } from '@/components/glass/GlassInput';
import { GlassStatCard } from '@/components/glass/GlassStatCard';
import { useAuth } from '@/features/auth/AuthProvider';
import { useApiResource } from '@/hooks/use-api-resource';
import { useAppTheme } from '@/theme/ThemeProvider';
import { createStockService, formatMass, stockStages, stockTotals, type StockLot, type StockStage } from './stock-api';

export function StockScreen() {
  const { client, user } = useAuth();
  // Remount local filters on identity/access change as well as clearing request data in useApiResource.
  const scope = client.getRequestScope();
  if (!user || scope === null) return null;
  return <StockList key={scope} />;
}

function StockList() {
  const { client, user } = useAuth();
  const { theme } = useAppTheme();
  const { colors: c, typography: t, spacing: s } = theme;
  const { width, fontScale } = useWindowDimensions();
  const list = useRef<FlatList<StockLot>>(null);
  const params = useLocalSearchParams<{ search?: string | string[] }>();
  const incomingSearch = typeof params.search === 'string' ? params.search : '';
  const [locale, setLocale] = useState<'vi' | 'en'>('vi');
  const tr = (vi: string, en: string) => (locale === 'vi' ? vi : en);
  const [draft, setDraft] = useState(incomingSearch);
  const [filters, setFilters] = useState<{ search: string; stage: StockStage; page: number }>({ search: incomingSearch, stage: '', page: 1 });
  // Incoming search links may update an already mounted Stock tab.
  const [previousSearch, setPreviousSearch] = useState(incomingSearch);
  if (previousSearch !== incomingSearch) {
    setPreviousSearch(incomingSearch);
    setDraft(incomingSearch);
    setFilters({ search: incomingSearch, stage: '', page: 1 });
  }
  const service = useMemo(() => createStockService(client.api), [client]);
  const load = useCallback((signal: AbortSignal) => service.list(filters, signal), [service, filters]);
  const state = useApiResource(load);
  const data = state.status === 'success' ? state.data : null;
  const totals = data ? stockTotals(data.items) : null;
  const loading = state.status === 'idle' || state.isLoading;
  const pageNote = tr('Chỉ tính các lô trên trang hiện tại.', 'Current page lots only.');
  const stageLabels = [tr('Tất cả', 'All'), tr('Lúa tươi / Sấy', 'Paddy / Drying'), tr('Gạo lức', 'Brown rice'),
    tr('Gạo trắng xát', 'Milled rice'), tr('Gạo phối trộn', 'Blended rice'), tr('Đã đóng bao', 'Packed')];
  const unknown = tr('Chưa có dữ liệu', 'Not provided');
  const mass = (value: string | null | undefined) => value == null ? unknown : `${formatMass(value, 3, locale)} kg`;
  const metrics = [
    { key: 'quantityKg', label: tr('Tổng tồn kho', 'Total stock'), tone: 'primary' },
    { key: 'availableKg', label: tr('Khả dụng', 'Available'), tone: 'info' },
    { key: 'reservedKg', label: tr('Đang bảo lưu', 'Reserved'), tone: 'warning' },
    { key: 'quarantinedKg', label: tr('Cách ly (HOLD)', 'Quarantined (HOLD)'), tone: 'danger' },
  ] as const;
  const errorText = state.error?.status === 403
    ? tr('Bạn không có quyền xem tồn kho trong phạm vi này.', 'You do not have access to stock in this scope.')
    : state.error?.code === 'configuration'
      ? tr('Chưa cấu hình dịch vụ tồn kho.', 'The stock service is not configured.')
      : state.error?.code === 'contract'
        ? tr('Dữ liệu tồn kho không đúng định dạng. Vui lòng thử lại hoặc liên hệ quản trị viên.', 'Unsupported stock data. Retry or contact your administrator.')
        : tr('Không thể tải tồn kho. Kiểm tra kết nối và thử lại.', 'Unable to load stock. Check your connection and retry.');
  const applySearch = () => setFilters({ ...filters, search: draft, page: 1 });
  const changePage = (page: number) => {
    setFilters({ ...filters, page });
    list.current?.scrollToOffset({ offset: 0, animated: false });
  };

  return (
    <SafeAreaView edges={['top', 'left', 'right']} style={[styles.screen, { backgroundColor: c.backgroundGrouped }]}>
      <FlatList
        ref={list}
        data={data?.items ?? []}
        keyExtractor={(lot) => lot.id}
        contentContainerStyle={[styles.content, { padding: s.page }]}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="on-drag"
        refreshing={state.isLoading}
        onRefresh={() => {
          void state.reload();
        }}
        ListHeaderComponent={
          <View style={[styles.sections, styles.header]}>
            <View style={styles.toolbar}>
              <View style={styles.headerTitle}>
                <Text style={[t.caption, styles.brand, { color: c.primary }]}>GRAINLEDGER</Text>
                <Text accessibilityRole="header" style={[t.display, { color: c.textPrimary }]}>
                  {tr('Tồn kho', 'Stock')}
                </Text>
              </View>
              <GlassButton
                opaque
                variant="glass"
                label={locale === 'vi' ? 'English' : 'Tiếng Việt'}
                onPress={() => setLocale(locale === 'vi' ? 'en' : 'vi')}
              />
            </View>

            <GlassCard
              opaque
              title={tr('Sổ cái tồn kho', 'Inventory ledger')}
              description={tr('Dữ liệu theo quyền công ty và cơ sở do máy chủ cấp.', 'Company and facility access is enforced by the server.')}
            >
              <Text style={[t.body, { color: c.textPrimary }]}>
                {user?.organizationName || tr('Phạm vi tài khoản', 'Account scope')}
              </Text>
              <GlassButton
                opaque
                label={tr('Tải lại tồn kho', 'Refresh stock')}
                loading={loading}
                loadingLabel={tr('Đang tải…', 'Loading…')}
                onPress={() => {
                  void state.reload();
                }}
              />
            </GlassCard>

            <View style={[styles.metrics, { gap: s.md }]}>
              {metrics.map(({ key, label, tone }) => {
                const value = totals?.[key] ?? null;
                return (
                  <GlassStatCard
                    key={key}
                    opaque
                    label={label}
                    tone={tone}
                    unit="kg"
                    loading={loading}
                    value={value === null ? null : formatMass(value, 3, locale)}
                    detail={pageNote}
                    unavailable={!loading && value === null ? unknown : undefined}
                    style={{ width: width >= 600 && fontScale < 1.4 ? '48%' : '100%' }}
                  />
                );
              })}
            </View>

            <GlassCard opaque title={tr('Bộ lọc', 'Filters')}>
              <GlassInput
                opaque
                label={tr('Tìm theo mã lô', 'Search lot code')}
                value={draft}
                onChangeText={setDraft}
                autoCapitalize="none"
                autoCorrect={false}
                returnKeyType="search"
                onSubmitEditing={applySearch}
              />
              <View style={styles.toolbar}>
                <GlassButton opaque label={tr('Tìm kiếm', 'Search')} onPress={applySearch} />
                <GlassButton
                  opaque
                  variant="glass"
                  label={tr('Xóa bộ lọc', 'Clear filters')}
                  onPress={() => {
                    setDraft('');
                    setFilters({ search: '', stage: '', page: 1 });
                  }}
                />
              </View>
              <View style={styles.toolbar}>
                {stockStages.map((stage, i) => (
                  <GlassButton
                    opaque
                    key={stage}
                    variant={filters.stage === stage ? 'primary' : 'glass'}
                    label={stageLabels[i]}
                    accessibilityState={{ selected: filters.stage === stage }}
                    onPress={() => setFilters({ ...filters, stage, page: 1 })}
                  />
                ))}
              </View>
            </GlassCard>

            {state.status === 'error' ? (
              <GlassCard opaque title={tr('Không thể tải tồn kho', 'Stock unavailable')}>
                <Text accessibilityRole="alert" style={[t.body, { color: c.danger }]}>
                  {errorText}
                </Text>
                <GlassButton
                  opaque
                  label={tr('Thử lại', 'Retry')}
                  onPress={() => {
                    void state.reload();
                  }}
                />
                {filters.page > 1 ? (
                  <GlassButton
                    opaque
                    variant="glass"
                    label={tr('Về trang đầu', 'Return to first page')}
                    onPress={() => changePage(1)}
                  />
                ) : null}
              </GlassCard>
            ) : null}

            {data ? (
              <Text accessibilityLiveRegion="polite" style={[t.body, { color: c.textSecondary }]}>
                {tr('Hiển thị', 'Showing')}: {data.items.length} {tr('lô', 'lots')}. {pageNote}
              </Text>
            ) : null}
          </View>
        }
        ListEmptyComponent={
          state.status !== 'error' ? (
            <GlassCard
              opaque
              title={loading ? tr('Đang tải tồn kho…', 'Loading stock…') : tr('Không tìm thấy lô hàng', 'No lots found')}
            >
              <Text accessibilityLiveRegion="polite" style={[t.body, { color: c.textSecondary }]}>
                {loading
                  ? tr('Đang đối chiếu dữ liệu tồn kho.', 'Retrieving stock data.')
                  : tr('Chưa có dữ liệu phù hợp với bộ lọc hiện tại.', 'No stock matches the current filters.')}
              </Text>
            </GlassCard>
          ) : undefined
        }
        renderItem={({ item: lot }) => (
          <GlassCard opaque shadow="none" title={lot.code}>
            <Text style={[t.label, { color: c.textPrimary }]}>
              {stageLabels[stockStages.findIndex((stage) => stage === lot.stage)] ?? lot.stage}
            </Text>
            <Text style={[t.body, { color: lot.status === 'HOLD' ? c.danger : c.textPrimary, fontWeight: lot.status === 'HOLD' ? '700' : '400' }]}>
              {tr('Trạng thái', 'Status')}:{' '}
              {lot.status === 'HOLD'
                ? tr('Lệnh HOLD', 'HOLD')
                : lot.status === 'ACTIVE'
                ? tr('Đang hoạt động', 'Active')
                : lot.status === 'CONSUMED'
                ? tr('Đã tiêu thụ', 'Consumed')
                : lot.status}
            </Text>
            <Text style={[t.body, { color: c.textSecondary }]}>
              {tr('Chủ hàng', 'Owner')}: {lot.ownerName || unknown}
            </Text>
            <Text style={[t.body, { color: c.textSecondary }]}>
              {tr('Cơ sở', 'Facility')}: {lot.facilityName || unknown}
            </Text>
            <Text style={[t.body, { color: c.textSecondary }]}>
              {tr('Vị trí', 'Location')}: {lot.locationName || unknown}
            </Text>
            <Text selectable style={[t.heading, styles.number, { color: c.textPrimary }]}>
              {tr('Khối lượng tồn', 'Stock mass')}: {mass(lot.quantityKg)}
            </Text>
            <Text selectable style={[t.body, styles.number, { color: c.textSecondary }]}>
              {tr('Khả dụng', 'Available')}: {mass(lot.availableKg)}
            </Text>
            <GlassButton
              opaque
              variant="glass"
              label={tr('Xem chi tiết lô', 'View lot detail')}
              accessibilityLabel={`${tr('Xem chi tiết lô', 'View lot detail')} ${lot.code}`}
              onPress={() => router.push({ pathname: '/stock/lots/[lotId]', params: { lotId: lot.id, lang: locale } })}
            />
          </GlassCard>
        )}
        ItemSeparatorComponent={() => <View style={styles.separator} />}
        ListFooterComponent={
          <View style={styles.footer}>
            {data?.paging ? (
              <View style={styles.sections}>
                <Text accessibilityLiveRegion="polite" style={[t.body, { color: c.textSecondary }]}>
                  {tr('Trang', 'Page')} {data.paging.page} · {data.paging.totalCount} {tr('lô phù hợp', 'matching lots')}
                </Text>
                <View style={styles.toolbar}>
                  <GlassButton
                    opaque
                    variant="glass"
                    label={tr('Trang trước', 'Previous page')}
                    disabled={filters.page <= 1}
                    onPress={() => changePage(filters.page - 1)}
                  />
                  <GlassButton
                    opaque
                    label={tr('Trang sau', 'Next page')}
                    disabled={!data.paging.hasMore}
                    onPress={() => changePage(filters.page + 1)}
                  />
                </View>
              </View>
            ) : data ? (
              <Text style={[t.caption, { color: c.textSecondary }]}>
                {tr(
                  'Máy chủ chưa cung cấp thông tin phân trang; có thể còn lô chưa hiển thị.',
                  'The server has not supplied paging metadata; more lots may exist.'
                )}
              </Text>
            ) : null}
          </View>
        }
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  content: { maxWidth: 800, width: '100%', alignSelf: 'center' },
  header: { paddingBottom: 16 },
  headerTitle: { flex: 1, minWidth: 140, gap: 4 },
  brand: { letterSpacing: 2, fontWeight: '700' },
  sections: { gap: 16 },
  toolbar: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: 8 },
  metrics: { flexDirection: 'row', flexWrap: 'wrap' },
  number: { fontVariant: ['tabular-nums'] },
  separator: { height: 16 },
  footer: { gap: 16, paddingVertical: 16 },
});
