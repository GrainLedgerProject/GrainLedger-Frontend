import { router, useLocalSearchParams } from 'expo-router';
import { useCallback, useMemo, useState } from 'react';
import { SectionList, StyleSheet, Text, View, useWindowDimensions } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { GlassButton } from '@/components/glass/GlassButton';
import { GlassCard } from '@/components/glass/GlassCard';
import { GlassStatCard } from '@/components/glass/GlassStatCard';
import { useAuth } from '@/features/auth/AuthProvider';
import { useApiResource } from '@/hooks/use-api-resource';
import { useAppTheme } from '@/theme/ThemeProvider';
import { formatMass } from './stock-api';
import { createStockDetailService, readLotId, type StockComposition, type StockPosition } from './stock-detail-api';

type DetailRow =
  | { kind: 'position'; value: StockPosition }
  | { kind: 'composition'; value: StockComposition }
  | { kind: 'restriction' | 'note'; value: string };

export function StockLotDetailScreen() {
  const { client, user } = useAuth();
  const params = useLocalSearchParams<{ lotId?: string | string[]; lang?: string | string[] }>();
  const lotId = readLotId(params.lotId);
  const scope = client.getRequestScope();
  if (!user || scope === null) return null;
  return <LotDetail key={`${scope}:${lotId}`} lotId={lotId} initialLocale={params.lang === 'en' ? 'en' : 'vi'} />;
}

function LotDetail({ lotId, initialLocale }: { lotId: string | null; initialLocale: 'vi' | 'en' }) {
  const { client } = useAuth();
  const { theme } = useAppTheme();
  const { colors: c, typography: t, spacing: s } = theme;
  const { width, fontScale } = useWindowDimensions();
  const [locale, setLocale] = useState(initialLocale);
  const tr = (vi: string, en: string) => (locale === 'vi' ? vi : en);
  const service = useMemo(() => createStockDetailService(client.api), [client]);
  const load = useCallback((signal: AbortSignal) => service.getDetail(lotId, signal), [service, lotId]);
  const state = useApiResource(load);
  const data = state.status === 'success' ? state.data : null;
  const loading = state.status === 'idle' || state.isLoading;
  const unknown = tr('Chưa được cung cấp', 'Not provided');
  const mass = (value: string) => `${formatMass(value, 6, locale)} kg`;
  const percentage = (value: number) =>
    `${value.toLocaleString(locale === 'vi' ? 'vi-VN' : 'en-US', { maximumFractionDigits: 6 })}%`;
  const back = () => router.dismissTo('/stock');
  const sections: { title: string; data: DetailRow[] }[] = data
    ? [
        {
          title: tr('Số dư theo vị trí', 'Balances by position'),
          data: data.positions?.length
            ? data.positions.map((value) => ({ kind: 'position' as const, value }))
            : [
                {
                  kind: 'note' as const,
                  value:
                    data.positions == null
                      ? tr('API chưa cung cấp số dư theo vị trí.', 'Position balances were not provided.')
                      : tr('Không có số dư vị trí được trả về.', 'No position balances were returned.'),
                },
              ],
        },
        {
          title: tr('Nguồn gốc lô', 'Lot origin'),
          data: data.composition?.length
            ? data.composition.map((value) => ({ kind: 'composition' as const, value }))
            : [
                {
                  kind: 'note' as const,
                  value:
                    data.composition == null
                      ? tr('API chưa cung cấp thông tin nguồn gốc.', 'Origin information was not provided.')
                      : tr('Không có thành phần nguồn gốc được trả về.', 'No origin contributions were returned.'),
                },
              ],
        },
        {
          title: tr('Hạn chế trên lô', 'Lot restrictions'),
          data: data.restrictions?.length
            ? data.restrictions.map((value) => ({ kind: 'restriction' as const, value }))
            : [
                {
                  kind: 'note' as const,
                  value:
                    data.restrictions == null
                      ? tr('API chưa cung cấp danh sách hạn chế.', 'Restrictions were not provided.')
                      : tr('Danh sách hạn chế trả về đang trống.', 'The returned restrictions list is empty.'),
                },
              ],
        },
      ]
    : [];
  const metrics = [
    { key: 'quantityKg', label: tr('Khối lượng tồn', 'Stock mass'), tone: 'primary' },
    { key: 'availableKg', label: tr('Khả dụng', 'Available'), tone: 'info' },
    { key: 'reservedKg', label: tr('Đang bảo lưu', 'Reserved'), tone: 'warning' },
    { key: 'quarantinedKg', label: tr('Cách ly (HOLD)', 'Quarantined (HOLD)'), tone: 'danger' },
  ] as const;
  const notFound = (state.status === 'success' && data === null) || state.error?.status === 404;
  const errorText =
    lotId === null
      ? tr('Mã lô trong đường dẫn không hợp lệ.', 'The lot identifier in this link is invalid.')
      : state.error?.status === 403
      ? tr('Bạn không có quyền xem lô này.', 'You do not have access to this lot.')
      : state.error?.code === 'configuration'
      ? tr('Chưa cấu hình dịch vụ tồn kho.', 'The stock service is not configured.')
      : state.error?.code === 'contract'
      ? tr('Dữ liệu chi tiết lô không đúng định dạng.', 'Unsupported lot detail data.')
      : tr('Không thể tải chi tiết lô. Kiểm tra kết nối và thử lại.', 'Unable to load lot detail. Check your connection and retry.');

  return (
    <SafeAreaView edges={['top', 'left', 'right']} style={[styles.screen, { backgroundColor: c.backgroundGrouped }]}>
      <SectionList<DetailRow, { title: string }>
        sections={sections}
        stickySectionHeadersEnabled={false}
        keyExtractor={(item, index) => `${item.kind}:${index}`}
        contentContainerStyle={[styles.content, { padding: s.page }]}
        refreshing={state.isLoading && lotId !== null}
        onRefresh={
          lotId === null
            ? undefined
            : () => {
                void state.reload();
              }
        }
        ListHeaderComponent={
          <View style={styles.header}>
            <View style={styles.toolbar}>
              <GlassButton opaque variant="glass" label={tr('Về danh sách', 'Back to stock')} onPress={back} />
              <GlassButton
                opaque
                variant="glass"
                label={locale === 'vi' ? 'English' : 'Tiếng Việt'}
                onPress={() => setLocale(locale === 'vi' ? 'en' : 'vi')}
              />
            </View>

            <View style={styles.headerTitle}>
              <Text style={[t.caption, styles.brand, { color: c.primary }]}>GRAINLEDGER</Text>
              <Text accessibilityRole="header" style={[t.display, { color: c.textPrimary }]}>
                {tr('Chi tiết lô', 'Lot detail')}
              </Text>
            </View>

            {lotId !== null ? (
              <GlassButton
                opaque
                label={tr('Tải lại chi tiết', 'Refresh detail')}
                loading={loading}
                loadingLabel={tr('Đang tải…', 'Loading…')}
                onPress={() => {
                  void state.reload();
                }}
              />
            ) : null}

            {loading && lotId !== null ? (
              <GlassCard opaque title={tr('Đang tải chi tiết lô…', 'Loading lot detail…')}>
                <Text accessibilityLiveRegion="polite" style={[t.body, { color: c.textSecondary }]}>
                  {tr('Đang truy vấn dữ liệu lô.', 'Retrieving lot data.')}
                </Text>
              </GlassCard>
            ) : null}

            {notFound ? (
              <GlassCard opaque title={tr('Không tìm thấy lô', 'Lot not found')}>
                <Text accessibilityLiveRegion="polite" style={[t.body, { color: c.textSecondary }]}>
                  {tr('Không có dữ liệu lô trong phản hồi hiện tại.', 'No lot data is available in this response.')}
                </Text>
              </GlassCard>
            ) : state.status === 'error' || lotId === null ? (
              <GlassCard opaque title={tr('Không thể mở chi tiết lô', 'Lot detail unavailable')}>
                <Text accessibilityRole="alert" style={[t.body, { color: c.danger }]}>
                  {errorText}
                </Text>
                {lotId !== null ? (
                  <GlassButton
                    opaque
                    label={tr('Thử lại', 'Retry')}
                    onPress={() => {
                      void state.reload();
                    }}
                  />
                ) : null}
              </GlassCard>
            ) : null}

            {data ? (
              <>
                <GlassCard opaque title={data.code}>
                  <Text selectable style={[t.body, { color: c.textSecondary }]}>
                    {tr('Mã định danh', 'Identifier')}: {data.id}
                  </Text>
                  <Text style={[t.body, { color: c.textPrimary }]}>
                    {tr('Phân đoạn', 'Stage')}: {data.stage}
                  </Text>
                  <Text
                    style={[
                      t.body,
                      {
                        color: data.status === 'HOLD' ? c.danger : c.textPrimary,
                        fontWeight: data.status === 'HOLD' ? '700' : '400',
                      },
                    ]}
                  >
                    {tr('Trạng thái', 'Status')}:{' '}
                    {data.status === 'HOLD' ? tr('Lệnh HOLD', 'HOLD') : data.status ?? unknown}
                  </Text>
                  <Text style={[t.body, { color: c.textSecondary }]}>
                    {tr('Chủ hàng', 'Owner')}: {data.ownerName || unknown}
                  </Text>
                  <Text style={[t.body, { color: c.textSecondary }]}>
                    {tr('Hàng hóa', 'Commodity')}: {data.commodityName || unknown}
                  </Text>
                  <Text style={[t.body, { color: c.textSecondary }]}>
                    {tr('Cơ sở', 'Facility')}: {data.facilityName || unknown}
                  </Text>
                  <Text style={[t.body, { color: c.textSecondary }]}>
                    {tr('Vị trí tổng quan', 'Summary location')}: {data.locationName || unknown}
                  </Text>
                  <Text style={[t.body, { color: c.textSecondary }]}>
                    {tr('Độ ẩm', 'Moisture')}: {data.moisturePercent == null ? unknown : percentage(data.moisturePercent)}
                  </Text>
                </GlassCard>

                <View style={[styles.metrics, { gap: s.md }]}>
                  {metrics.map(({ key, label, tone }) => {
                    const value = data[key];
                    return (
                      <GlassStatCard
                        key={key}
                        opaque
                        label={label}
                        tone={tone}
                        unit="kg"
                        value={value == null ? null : formatMass(value, 6, locale)}
                        detail={tr('Số dư tổng quan do máy chủ trả về.', 'Summary balance returned by the server.')}
                        unavailable={value == null ? unknown : undefined}
                        style={{ width: width >= 600 && fontScale < 1.4 ? '48%' : '100%' }}
                      />
                    );
                  })}
                </View>
              </>
            ) : null}
          </View>
        }
        renderSectionHeader={({ section }) => (
          <Text accessibilityRole="header" style={[t.heading, styles.sectionTitle, { color: c.textPrimary }]}>
            {section.title}
          </Text>
        )}
        renderItem={({ item }) => (
          <GlassCard opaque shadow="none" style={styles.row}>
            {item.kind === 'position' ? (
              <>
                <Text selectable style={[t.label, { color: c.textPrimary }]}>
                  {tr('Mã vị trí', 'Location ID')}: {item.value.locationId || unknown}
                </Text>
                <Text selectable style={[t.body, { color: c.textSecondary }]}>
                  {tr('Mã cơ sở', 'Facility ID')}: {item.value.facilityId}
                </Text>
                <Text selectable style={[t.body, styles.number, { color: c.textPrimary }]}>
                  {tr('Khối lượng tồn', 'Stock mass')}: {mass(item.value.quantityKg)}
                </Text>
                <Text selectable style={[t.body, styles.number, { color: c.textSecondary }]}>
                  {tr('Khả dụng', 'Available')}: {mass(item.value.availableKg)}
                </Text>
              </>
            ) : item.kind === 'composition' ? (
              <>
                <Text style={[t.label, { color: c.textPrimary }]}>
                  {tr('Nông hộ', 'Farmer')}: {item.value.farmerName || unknown}
                </Text>
                <Text selectable style={[t.body, { color: c.textSecondary }]}>
                  {tr('Mã thửa ruộng', 'Plot code')}: {item.value.plotCode || unknown}
                </Text>
                <Text style={[t.body, styles.number, { color: c.textPrimary }]}>
                  {tr('Tỷ lệ đóng góp', 'Contribution')}: {percentage(item.value.percentage)}
                </Text>
                <Text selectable style={[t.body, styles.number, { color: c.textPrimary }]}>
                  {tr('Khối lượng đóng góp', 'Contribution mass')}: {mass(item.value.massKg)}
                </Text>
              </>
            ) : (
              <Text style={[t.body, { color: item.kind === 'restriction' ? c.danger : c.textSecondary }]}>
                {item.value}
              </Text>
            )}
          </GlassCard>
        )}
        ListFooterComponent={
          data ? (
            <Text style={[t.caption, styles.footer, { color: c.textSecondary }]}>
              {tr(
                'Chỉ hiển thị số dư và nguồn gốc máy chủ cung cấp. Dữ liệu này không tự xác nhận đủ điều kiện xuất hàng hoặc chứng nhận tuân thủ.',
                'Balances and origin reflect the server response. They do not establish shipment eligibility or certify compliance.'
              )}
            </Text>
          ) : undefined
        }
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  content: { maxWidth: 800, width: '100%', alignSelf: 'center' },
  header: { gap: 16, paddingBottom: 8 },
  headerTitle: { gap: 4 },
  brand: { letterSpacing: 2, fontWeight: '700' },
  toolbar: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  metrics: { flexDirection: 'row', flexWrap: 'wrap' },
  sectionTitle: { paddingVertical: 14 },
  row: { marginBottom: 12 },
  number: { fontVariant: ['tabular-nums'] },
  footer: { paddingVertical: 16 },
});
