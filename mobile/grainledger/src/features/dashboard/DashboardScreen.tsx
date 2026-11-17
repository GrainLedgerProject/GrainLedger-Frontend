import { router } from 'expo-router';
import { useState } from 'react';
import { ActivityIndicator, FlatList, RefreshControl, ScrollView, StyleSheet, Text, View, useWindowDimensions } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { GlassButton } from '@/components/glass/GlassButton';
import { GlassCard } from '@/components/glass/GlassCard';
import { GlassStatCard } from '@/components/glass/GlassStatCard';
import { useAppTheme } from '@/theme/ThemeProvider';
import { text, sourceCopy, type Locale, type Source } from './model/dashboardConfig';
import { chartSource, getChart, getList, getMetrics, getPriorities, listSource, scopeNote, statusLabel,
  type ChartBar, type DashboardItem } from './model/dashboardData';
import { Decimal, formatMass } from './model/mass';
import { ROLE_DEFINITIONS } from './model/roles';
import { useDashboard } from './model/useDashboard';

export function DashboardScreen() {
  const dashboard = useDashboard();
  const { theme } = useAppTheme();
  const { colors: c, typography: t, spacing: s } = theme;
  const [locale, setLocale] = useState<Locale>('vi');
  const tr = (vi: string, en: string) => (locale === 'vi' ? vi : en);
  const { width, fontScale } = useWindowDimensions();
  const { user, role, config, overview, fetching, sources, needsFacility, shortcuts } = dashboard;
  if (!user) return null;
  const data = overview?.data ?? {};
  const now = new Date();
  const metrics = getMetrics(role, data, locale, null, now);
  const mainSource = chartSource(role);
  const recordsSource = listSource(role);
  const priorities = getPriorities(role, data, locale, null, now);
  const list = getList(role, data, locale);
  const errors = sources.filter((source) => overview?.errors[source]);
  const missingFacility = needsFacility && !overview?.facilityId;
  const uncertain = fetching || missingFacility || Boolean(dashboard.error) || errors.length > 0 ||
    sources.length < config.sources.length || role === 'CUSTOMER_PROCUREMENT_OFFICER';
  const date = new Intl.DateTimeFormat(locale === 'vi' ? 'vi-VN' : 'en-GB', {
    day: 'numeric', month: 'long', timeZone: 'Asia/Ho_Chi_Minh',
  }).format(now);
  const unavailable = (source: Source) => !sources.includes(source)
    ? tr('Chưa có quyền xem dữ liệu này', 'Access has not been granted')
    : dashboard.error ? dashboard.error.message
      : missingFacility ? tr('Cần cơ sở được phân công để xem dữ liệu', 'An assigned facility is required')
        : overview?.errors[source] ? tr('Nguồn dữ liệu chưa tải được', 'This data source is unavailable') : undefined;
  const panelMessage = (source: Source) => fetching ? tr('Đang tổng hợp dữ liệu…', 'Loading your overview…')
    : unavailable(source) ?? (data[source] ? tr('Chưa có bản ghi trong phạm vi này', 'No records in this scope yet')
      : tr('Chưa có dữ liệu để hiển thị', 'No data available'));

  return (
    <View style={{ flex: 1, backgroundColor: c.backgroundGrouped }}>
      <SafeAreaView edges={['top', 'left', 'right']} style={{ flex: 1 }}>
        <ScrollView
          refreshControl={
            <RefreshControl
              refreshing={fetching}
              onRefresh={() => {
                if (!fetching) void dashboard.reload();
              }}
              tintColor={c.primary}
              colors={[c.primary]}
              progressBackgroundColor={c.surface}
            />
          }
          contentContainerStyle={[styles.content, { padding: s.page, gap: s.lg }]}
        >
          {/* Header Bar */}
          <View style={styles.header}>
            <View style={styles.headerCopy}>
              <Text style={[t.caption, styles.brand, { color: c.primary }]}>GRAINLEDGER</Text>
              <Text style={[t.caption, { color: c.textSecondary }]}>
                {date} · {ROLE_DEFINITIONS[role][locale === 'vi' ? 'labelVi' : 'labelEn']}
              </Text>
            </View>
            <GlassButton
              label={locale === 'en' ? 'Tiếng Việt' : 'English'}
              variant="glass"
              accessibilityLabel={tr('Chuyển sang tiếng Anh', 'Switch dashboard to Vietnamese')}
              onPress={() => setLocale(locale === 'en' ? 'vi' : 'en')}
            />
          </View>

          {/* Welcome Card */}
          <GlassCard opaque padding="lg">
            <Text style={[t.caption, { color: c.primary, textTransform: 'uppercase', letterSpacing: 0.5, fontWeight: '600' }]}>
              {text(config.focus, locale)}
            </Text>
            <Text style={[t.body, { color: c.textSecondary }]}>
              {tr('Xin chào', 'Welcome')}, {user.displayName}.
            </Text>
            <Text accessibilityRole="header" style={[t.title, { color: c.textPrimary }]}>
              {text(config.title, locale)}
            </Text>
            <Text style={[t.body, { color: c.textSecondary }]}>{text(config.description, locale)}</Text>
            <Text style={[t.caption, { color: c.textSecondary }]}>
              {user.organizationName || tr('Theo phạm vi tài khoản', 'Your account scope')}
            </Text>
          </GlassCard>

          {/* Section: At a glance */}
          <View style={styles.header}>
            <View style={styles.headerCopy}>
              <Text accessibilityRole="header" style={[t.heading, { color: c.textPrimary }]}>
                {tr('Tình hình hiện tại', 'At a glance')}
              </Text>
              <Text accessibilityLiveRegion="polite" style={[t.caption, { color: c.textSecondary }]}>
                {fetching
                  ? tr('Đang cập nhật…', 'Refreshing…')
                  : overview?.updatedAt
                  ? `${tr('Cập nhật', 'Updated')} ${new Intl.DateTimeFormat(locale === 'vi' ? 'vi-VN' : 'en-GB', {
                      hour: '2-digit',
                      minute: '2-digit',
                      timeZone: 'Asia/Ho_Chi_Minh',
                    }).format(overview.updatedAt)}`
                  : tr('Chưa cập nhật đầy đủ', 'Not fully updated')}
              </Text>
            </View>
            <GlassButton
              label={tr('Làm mới', 'Refresh')}
              variant="glass"
              loading={fetching}
              loadingLabel={tr('Đang tải…', 'Loading…')}
              onPress={() => {
                void dashboard.reload();
              }}
            />
          </View>

          {/* Operating Facility Selector */}
          {needsFacility ? (
            <GlassCard opaque title={tr('Cơ sở vận hành', 'Operating facility')}>
              {fetching ? (
                <ActivityIndicator color={c.primary} accessibilityLabel={tr('Đang tải cơ sở', 'Loading facilities')} />
              ) : overview?.facilities.length ? (
                <FlatList
                  horizontal
                  data={overview.facilities}
                  keyExtractor={(item) => item.id}
                  contentContainerStyle={{ gap: s.sm }}
                  renderItem={({ item }) => (
                    <GlassButton
                      label={item.name}
                      variant={item.id === overview.facilityId ? 'primary' : 'glass'}
                      style={styles.facility}
                      accessibilityState={{ selected: item.id === overview.facilityId }}
                      onPress={() => {
                        if (item.id !== overview.facilityId) dashboard.setSelectedFacility(item.id);
                      }}
                    />
                  )}
                />
              ) : (
                <Text accessibilityRole="alert" style={[t.body, { color: c.warning }]}>
                  {overview?.facilityError?.message ??
                    tr(
                      'Chưa có cơ sở được phân công. Liên hệ quản trị viên để được cấp quyền.',
                      'No assigned facility is available. Contact an administrator for access.'
                    )}
                </Text>
              )}
            </GlassCard>
          ) : null}

          {dashboard.error || errors.length ? (
            <GlassCard opaque title={tr('Một số dữ liệu chưa sẵn sàng', 'Some data is unavailable')}>
              {dashboard.error ? (
                <Text accessibilityRole="alert" style={[t.body, { color: c.danger }]}>
                  {dashboard.error.message}
                </Text>
              ) : null}
              {errors.map((source) => (
                <Text key={source} accessibilityRole="alert" style={[t.caption, { color: c.danger }]}>
                  {text(sourceCopy[source], locale)}: {overview?.errors[source]?.message}
                </Text>
              ))}
              <Text style={[t.caption, { color: c.textSecondary }]}>
                {tr(
                  'Làm mới để thử lại. Các số liệu tải thành công vẫn được hiển thị.',
                  'Refresh to retry. Other available figures remain visible.'
                )}
              </Text>
            </GlassCard>
          ) : null}
          {!fetching && sources.length === 0 ? (
            <GlassCard opaque title={tr('Chưa có quyền xem dữ liệu', 'No dashboard data access assigned')}>
              <Text style={[t.body, { color: c.textSecondary }]}>
                {tr('Liên hệ quản trị viên để được cấp quyền phù hợp.', 'Contact an administrator for the appropriate access.')}
              </Text>
            </GlassCard>
          ) : null}

          {/* Metric Cards Grid */}
          <View style={[styles.metrics, { gap: s.md }]}>
            {metrics.map((metric) => (
              <GlassStatCard
                key={metric.label[1]}
                opaque
                style={{
                  flexBasis: width >= 440 && fontScale < 1.3 ? '46%' : '100%',
                  flexGrow: 1,
                  minWidth: 0,
                }}
                label={text(metric.label, locale)}
                value={metric.value}
                detail={metric.detail}
                unit={metric.unit}
                tone={metric.tone}
                loading={Boolean(metric.source && sources.includes(metric.source) && fetching)}
                loadingLabel={tr('Đang tải số liệu', 'Loading statistic')}
                unavailable={metric.source ? unavailable(metric.source) : undefined}
              />
            ))}
          </View>

          {/* Chart Section */}
          <GlassCard opaque title={text(config.chartTitle, locale)}>
            <Text style={[t.caption, { color: c.textSecondary }]}>
              {unavailable(mainSource) ?? scopeNote(data[mainSource], locale)}
              {role === 'CUSTOMER_PROCUREMENT_OFFICER'
                ? tr(' · Theo ngày nhận, giờ Việt Nam', ' · By received date, Vietnam time')
                : ''}
            </Text>
            {data[mainSource]?.items.length ? (
              <Distribution bars={getChart(role, data, locale, now)} locale={locale} />
            ) : (
              <Text style={[t.body, { color: c.textSecondary }]}>{panelMessage(mainSource)}</Text>
            )}
          </GlassCard>

          {/* Attention Section */}
          <GlassCard opaque title={tr('Cần bạn chú ý', 'Needs your attention')}>
            <Text style={[t.caption, { color: c.textSecondary }]}>
              {tr('Tổng hợp từ các bản ghi đã tải trong phạm vi hiện tại.', 'Based on loaded records in the current scope.')}
            </Text>
            {priorities.length ? (
              <RecordList items={priorities} locale={locale} />
            ) : (
              <Text style={[t.body, { color: c.textSecondary }]}>
                {uncertain
                  ? tr('Chưa đủ dữ liệu để tổng hợp. Kiểm tra quyền, cơ sở và nguồn dữ liệu.', 'More data is needed. Check access, facility and data sources.')
                  : tr('Chưa có mục cần ưu tiên trong các bản ghi đã tải.', 'No priority items found in the loaded records.')}
              </Text>
            )}
            {role === 'CUSTOMER_PROCUREMENT_OFFICER' ? (
              <Text style={[t.caption, { color: c.warning }]}>
                {tr('Hàng đợi ngoại tuyến chưa có trên ứng dụng.', 'Offline queue figures are not available on mobile yet.')}
              </Text>
            ) : null}
          </GlassCard>

          {/* Records List Section */}
          <GlassCard opaque title={text(config.listTitle, locale)}>
            <Text style={[t.caption, { color: c.textSecondary }]}>
              {unavailable(recordsSource) ?? scopeNote(data[recordsSource], locale)}
            </Text>
            {list.length ? (
              <RecordList items={list} locale={locale} />
            ) : (
              <Text style={[t.body, { color: c.textSecondary }]}>{panelMessage(recordsSource)}</Text>
            )}
            {list.length ? (
              <Text style={[t.caption, { color: c.textSecondary }]}>
                {tr('Tối đa 6 bản ghi từ dữ liệu đã tải.', 'Up to 6 records from loaded data.')}
              </Text>
            ) : null}
          </GlassCard>

          {/* Start a Task Shortcuts */}
          <GlassCard opaque title={tr('Bắt đầu công việc', 'Start a task')}>
            {role === 'CUSTOMER_MANAGER' ? <GlassButton variant="glass" label={tr('Mẫu lab', 'Lab samples')}
              onPress={() => router.push('/compliance/lab-samples')} /> : null}
            {role === 'CUSTOMER_MANAGER' ? <GlassButton variant="glass" label={tr('Kết quả lab & MRL', 'Lab results & MRL')}
              onPress={() => router.push('/compliance/lab-results')} /> : null}
            {role === 'CUSTOMER_MANAGER' || role === 'MILL_ADMIN' ? <GlassButton variant="glass" label={tr('Chính sách biên MRL', 'MRL margin policy')}
              onPress={() => router.push('/compliance/safety-margin')} /> : null}
            <GlassButton variant="glass" label={tr('Hồ sơ & bằng chứng dư lượng', 'Residue profiles & evidence')} onPress={() => router.push('/compliance/residue-profiles')} />
            <GlassButton variant="glass" label={tr('Lịch sử sự kiện', 'Event history')} onPress={() => router.push('/events')} />
            {role === 'MILL_MANAGER' || role === 'CUSTOMER_MANAGER' || role === 'CUSTOMER_EXPORT_OFFICER' || role === 'MILL_ADMIN' ? <GlassButton variant="glass" label={tr('Lệnh HOLD', 'HOLD orders')} onPress={() => router.push('/risk/holds')} /> : null}
            {role === 'CUSTOMER_MANAGER' || role === 'CUSTOMER_EXPORT_OFFICER' || role === 'MILL_ADMIN' ? <GlassButton variant="glass" label={tr('Duyệt phương án phối trộn', 'Review blend plans')} onPress={() => router.push('/export/plans/pending')} /> : null}
            {role === 'MILL_ADMIN' ? <GlassButton variant="glass" label={tr('Quản lý nông hộ', 'Manage farmers')}
              onPress={() => router.push('/field/farmers/new')} /> : null}
            <Text style={[t.caption, { color: c.textSecondary }]}>
              {tr('Các khu vực tác nghiệp hiện có trên ứng dụng và phiên bản web.', 'Task workspaces available on mobile and web.')}
            </Text>
            {shortcuts.filter((shortcut) => !['/compliance/lab-results', '/export/plans/pending', '/risk/holds', '/events', '/compliance/residue-profiles'].includes(shortcut.path)).map((shortcut) => {
              const isReceiving = shortcut.path === '/mill/receiving';
              const isFarmers = shortcut.path === '/field/farmers/new' && (role === 'CUSTOMER_PROCUREMENT_OFFICER' || role === 'MILL_ADMIN');
              const destination = isReceiving ? '/mill/receiving' : isFarmers ? '/field/farmers/new' : null;
              return (
                <View key={shortcut.path} style={{ gap: s.xs }}>
                  <GlassButton
                    label={text(shortcut.label, locale)}
                    variant={isReceiving ? 'primary' : 'glass'}
                    disabled={destination === null}
                    onPress={destination ? () => router.push(destination) : undefined}
                    accessibilityHint={
                      destination
                        ? tr('Mở khu vực tác nghiệp', 'Open workspace')
                        : tr('Khu vực này chưa có trên ứng dụng di động', 'This workspace is not available on mobile yet')
                    }
                  />
                  <Text style={[t.caption, { color: c.textSecondary }]}>{text(shortcut.description, locale)}</Text>
                </View>
              );
            })}
          </GlassCard>

          <Text style={[t.caption, { color: c.textSecondary }]}>
            {tr('Dữ liệu theo quyền truy cập · Khối lượng kg · Giờ Việt Nam (UTC+7)', 'Access-scoped data · Mass in kg · Vietnam time (UTC+7)')}
          </Text>
        </ScrollView>
      </SafeAreaView>
    </View>
  );
}

function Distribution({ bars, locale }: { bars: ChartBar[]; locale: Locale }) {
  const { theme } = useAppTheme();
  const max = bars.reduce((value, bar) => Decimal.max(value, new Decimal(bar.value)), new Decimal(0));
  return (
    <View style={{ gap: theme.spacing.md }}>
      {bars.map((bar, index) => {
        const ratio = max.gt(0) ? Math.max(0, Math.min(100, new Decimal(bar.value).div(max).times(100).toNumber())) : 0;
        const value = bar.mass ? `${formatMass(bar.value, 3, locale)} kg` : bar.value;
        return (
          <View key={`${bar.label}-${index}`} accessible accessibilityLabel={`${bar.label}: ${value}`} style={{ gap: 6 }}>
            <View style={styles.header}>
              <Text style={[theme.typography.caption, styles.headerCopy, { color: theme.colors.textSecondary }]}>{bar.label}</Text>
              <Text style={[theme.typography.label, { color: theme.colors.textPrimary, fontVariant: ['tabular-nums'] }]}>{value}</Text>
            </View>
            <View accessible={false} style={[styles.track, { backgroundColor: theme.colors.surfaceRaised }]}>
              <View style={[styles.bar, { width: `${ratio}%`, backgroundColor: theme.colors[bar.tone] }]} />
            </View>
          </View>
        );
      })}
    </View>
  );
}

function RecordList({ items, locale }: { items: DashboardItem[]; locale: Locale }) {
  const { theme } = useAppTheme();
  return (
    <View style={{ gap: theme.spacing.md }}>
      {items.map((item, index) => {
        const date = item.date ? new Date(item.date) : null;
        return (
          <View key={`${item.id}-${index}`} style={[styles.record, { borderColor: theme.colors.border, gap: 4 }]}>
            <Text style={[theme.typography.label, { color: theme.colors.textPrimary }]}>{item.title}</Text>
            {item.detail ? <Text style={[theme.typography.caption, { color: theme.colors.textSecondary }]}>{item.detail}</Text> : null}
            {item.value ? <Text style={[theme.typography.body, { color: theme.colors.textPrimary, fontVariant: ['tabular-nums'] }]}>{item.value}</Text> : null}
            {item.status ? <Text style={[theme.typography.caption, { color: theme.colors[item.tone], fontWeight: '600' }]}>{statusLabel(item.status, locale)}</Text> : null}
            {date && Number.isFinite(date.getTime()) ? (
              <Text style={[theme.typography.caption, { color: theme.colors.textSecondary }]}>
                {new Intl.DateTimeFormat(locale === 'vi' ? 'vi-VN' : 'en-GB', {
                  day: '2-digit',
                  month: '2-digit',
                  year: 'numeric',
                  timeZone: 'Asia/Ho_Chi_Minh',
                }).format(date)}
              </Text>
            ) : null}
          </View>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  content: {
    width: '100%',
    maxWidth: 800,
    alignSelf: 'center',
    paddingBottom: 40,
  },
  header: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
  },
  headerCopy: {
    flexGrow: 1,
    flexShrink: 1,
    minWidth: 0,
    gap: 4,
  },
  brand: {
    letterSpacing: 2,
    fontWeight: '700',
  },
  metrics: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  facility: {
    maxWidth: 240,
  },
  track: {
    height: 8,
    borderRadius: 4,
    overflow: 'hidden',
  },
  bar: {
    height: 8,
    borderRadius: 4,
  },
  record: {
    borderTopWidth: StyleSheet.hairlineWidth,
    paddingTop: 12,
  },
});
