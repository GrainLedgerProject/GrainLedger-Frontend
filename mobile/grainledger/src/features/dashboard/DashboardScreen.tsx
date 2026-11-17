import { BlurTargetView } from 'expo-blur';
import { LinearGradient } from 'expo-linear-gradient';
import { useRef, useState, type ComponentRef } from 'react';
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
  const [locale, setLocale] = useState<Locale>('en');
  const tr = (vi: string, en: string) => locale === 'vi' ? vi : en;
  const target = useRef<ComponentRef<typeof View> | null>(null);
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

  return <View style={{ flex: 1, backgroundColor: c.background }}>
    <BlurTargetView ref={target} pointerEvents="none" accessible={false} style={StyleSheet.absoluteFill}>
      <LinearGradient colors={theme.gradients.ambient} style={StyleSheet.absoluteFill} />
    </BlurTargetView>
    <SafeAreaView edges={['top', 'left', 'right']} style={{ flex: 1 }}>
      <ScrollView refreshControl={<RefreshControl refreshing={fetching} onRefresh={() => { if (!fetching) void dashboard.reload(); }}
        tintColor={c.primary} colors={[c.primary]} progressBackgroundColor={c.surface} />}
        contentContainerStyle={[styles.content, { padding: s.page, gap: s.xl }]}>
        <View style={styles.header}>
          <View style={styles.headerCopy}>
            <Text style={[t.label, styles.brand, { color: c.primary }]}>GRAINLEDGER</Text>
            <Text style={[t.caption, { color: c.textSecondary }]}>{date} · {ROLE_DEFINITIONS[role][locale === 'vi' ? 'labelVi' : 'labelEn']}</Text>
          </View>
          <GlassButton label={locale === 'en' ? 'Tiếng Việt' : 'English'} variant="glass" accessibilityLabel={tr('Chuyển sang tiếng Anh', 'Switch dashboard to Vietnamese')}
            onPress={() => setLocale(locale === 'en' ? 'vi' : 'en')} />
        </View>

        <GlassCard blurTarget={target} padding="xl">
          <Text style={[t.label, { color: c.accent }]}>{text(config.focus, locale)}</Text>
          <Text style={[t.body, { color: c.textSecondary }]}>{tr('Xin chào', 'Welcome')}, {user.displayName}.</Text>
          <Text accessibilityRole="header" style={[t.title, { color: c.textPrimary }]}>{text(config.title, locale)}</Text>
          <Text style={[t.body, { color: c.textSecondary }]}>{text(config.description, locale)}</Text>
          <Text style={[t.caption, { color: c.textSecondary }]}>{user.organizationName || tr('Theo phạm vi tài khoản', 'Your account scope')}</Text>
        </GlassCard>

        <View style={styles.header}>
          <View style={styles.headerCopy}>
            <Text accessibilityRole="header" style={[t.heading, { color: c.textPrimary }]}>{tr('Tình hình hiện tại', 'At a glance')}</Text>
            <Text accessibilityLiveRegion="polite" style={[t.caption, { color: c.textSecondary }]}>{fetching
              ? tr('Đang cập nhật…', 'Refreshing…') : overview?.updatedAt
                ? `${tr('Cập nhật', 'Updated')} ${new Intl.DateTimeFormat(locale === 'vi' ? 'vi-VN' : 'en-GB', { hour: '2-digit', minute: '2-digit', timeZone: 'Asia/Ho_Chi_Minh' }).format(overview.updatedAt)}`
                : tr('Chưa cập nhật đầy đủ', 'Not fully updated')}</Text>
          </View>
          <GlassButton label={tr('Làm mới', 'Refresh')} variant="glass" loading={fetching}
            loadingLabel={tr('Đang tải…', 'Loading…')} onPress={() => { void dashboard.reload(); }} />
        </View>

        {needsFacility ? <GlassCard opaque title={tr('Cơ sở vận hành', 'Operating facility')}>
          {fetching ? <ActivityIndicator color={c.primary} accessibilityLabel={tr('Đang tải cơ sở', 'Loading facilities')} />
            : overview?.facilities.length ? <FlatList horizontal data={overview.facilities} keyExtractor={(item) => item.id}
              contentContainerStyle={{ gap: s.sm }} renderItem={({ item }) => <GlassButton label={item.name}
                variant={item.id === overview.facilityId ? 'primary' : 'glass'} style={styles.facility}
                accessibilityState={{ selected: item.id === overview.facilityId }}
                onPress={() => { if (item.id !== overview.facilityId) dashboard.setSelectedFacility(item.id); }} />} />
              : <Text accessibilityRole="alert" style={[t.body, { color: c.warning }]}>{overview?.facilityError?.message
                ?? tr('Chưa có cơ sở được phân công. Liên hệ quản trị viên để được cấp quyền.', 'No assigned facility is available. Contact an administrator for access.')}</Text>}
        </GlassCard> : null}

        {dashboard.error || errors.length ? <GlassCard opaque title={tr('Một số dữ liệu chưa sẵn sàng', 'Some data is unavailable')}>
          {dashboard.error ? <Text accessibilityRole="alert" style={[t.body, { color: c.danger }]}>{dashboard.error.message}</Text> : null}
          {errors.map((source) => <Text key={source} accessibilityRole="alert" style={[t.caption, { color: c.danger }]}>
            {text(sourceCopy[source], locale)}: {overview?.errors[source]?.message}</Text>)}
          <Text style={[t.caption, { color: c.textSecondary }]}>{tr('Làm mới để thử lại. Các số liệu tải thành công vẫn được hiển thị.', 'Refresh to retry. Other available figures remain visible.')}</Text>
        </GlassCard> : null}
        {!fetching && sources.length === 0 ? <GlassCard opaque title={tr('Chưa có quyền xem dữ liệu', 'No dashboard data access assigned')}>
          <Text style={[t.body, { color: c.textSecondary }]}>{tr('Liên hệ quản trị viên để được cấp quyền phù hợp.', 'Contact an administrator for the appropriate access.')}</Text>
        </GlassCard> : null}

        <View style={[styles.metrics, { gap: s.lg }]}>
          {metrics.map((metric) => <GlassStatCard key={metric.label[1]} blurTarget={target}
            style={{ flexBasis: width >= 440 && fontScale < 1.3 ? '46%' : '100%', flexGrow: 1, minWidth: 0 }}
            label={text(metric.label, locale)} value={metric.value} detail={metric.detail} unit={metric.unit} tone={metric.tone}
            loading={Boolean(metric.source && sources.includes(metric.source) && fetching)}
            loadingLabel={tr('Đang tải số liệu', 'Loading statistic')} unavailable={metric.source ? unavailable(metric.source) : undefined} />)}
        </View>

        <GlassCard opaque title={text(config.chartTitle, locale)}>
          <Text style={[t.caption, { color: c.textSecondary }]}>{unavailable(mainSource) ?? scopeNote(data[mainSource], locale)}
            {role === 'CUSTOMER_PROCUREMENT_OFFICER' ? tr(' · Theo ngày nhận, giờ Việt Nam', ' · By received date, Vietnam time') : ''}</Text>
          {data[mainSource]?.items.length ? <Distribution bars={getChart(role, data, locale, now)} locale={locale} />
            : <Text style={[t.body, { color: c.textSecondary }]}>{panelMessage(mainSource)}</Text>}
        </GlassCard>

        <GlassCard opaque title={tr('Cần bạn chú ý', 'Needs your attention')}>
          <Text style={[t.caption, { color: c.textSecondary }]}>{tr('Tổng hợp từ các bản ghi đã tải trong phạm vi hiện tại.', 'Based on loaded records in the current scope.')}</Text>
          {priorities.length ? <RecordList items={priorities} locale={locale} /> : <Text style={[t.body, { color: c.textSecondary }]}>{uncertain
            ? tr('Chưa đủ dữ liệu để tổng hợp. Kiểm tra quyền, cơ sở và nguồn dữ liệu.', 'More data is needed. Check access, facility and data sources.')
            : tr('Chưa có mục cần ưu tiên trong các bản ghi đã tải.', 'No priority items found in the loaded records.')}</Text>}
          {role === 'CUSTOMER_PROCUREMENT_OFFICER' ? <Text style={[t.caption, { color: c.warning }]}>{tr('Hàng đợi ngoại tuyến chưa có trên ứng dụng.', 'Offline queue figures are not available on mobile yet.')}</Text> : null}
        </GlassCard>

        <GlassCard opaque title={text(config.listTitle, locale)}>
          <Text style={[t.caption, { color: c.textSecondary }]}>{unavailable(recordsSource) ?? scopeNote(data[recordsSource], locale)}</Text>
          {list.length ? <RecordList items={list} locale={locale} /> : <Text style={[t.body, { color: c.textSecondary }]}>{panelMessage(recordsSource)}</Text>}
          {list.length ? <Text style={[t.caption, { color: c.textSecondary }]}>{tr('Tối đa 6 bản ghi từ dữ liệu đã tải.', 'Up to 6 records from loaded data.')}</Text> : null}
        </GlassCard>

        <GlassCard opaque title={tr('Bắt đầu công việc', 'Start a task')}>
          <Text style={[t.caption, { color: c.textSecondary }]}>{tr('Các khu vực tác nghiệp hiện có trên phiên bản web.', 'Task workspaces are currently available on the web.')}</Text>
          {shortcuts.map((shortcut) => <View key={shortcut.path} style={{ gap: s.xs }}>
            <GlassButton label={text(shortcut.label, locale)} variant="glass" disabled fullWidth
              accessibilityHint={tr('Khu vực này chưa có trên ứng dụng di động', 'This workspace is not available on mobile yet')} />
            <Text style={[t.caption, { color: c.textSecondary }]}>{text(shortcut.description, locale)}</Text>
          </View>)}
          {!shortcuts.length ? <Text style={[t.body, { color: c.textSecondary }]}>{tr('Chưa có quyền tác nghiệp được cấp.', 'No task access assigned.')}</Text> : null}
        </GlassCard>
        <Text style={[t.caption, { color: c.textSecondary }]}>{tr('Dữ liệu theo quyền truy cập · Khối lượng kg · Giờ Việt Nam (UTC+7)', 'Access-scoped data · Mass in kg · Vietnam time (UTC+7)')}</Text>
      </ScrollView>
    </SafeAreaView>
  </View>;
}

function Distribution({ bars, locale }: { bars: ChartBar[]; locale: Locale }) {
  const { theme } = useAppTheme();
  const max = bars.reduce((value, bar) => Decimal.max(value, new Decimal(bar.value)), new Decimal(0));
  return <View style={{ gap: theme.spacing.lg }}>{bars.map((bar, index) => {
    const ratio = max.gt(0) ? Math.max(0, Math.min(100, new Decimal(bar.value).div(max).times(100).toNumber())) : 0;
    const value = bar.mass ? `${formatMass(bar.value, 3, locale)} kg` : bar.value;
    return <View key={`${bar.label}-${index}`} accessible accessibilityLabel={`${bar.label}: ${value}`} style={{ gap: theme.spacing.sm }}>
      <View style={styles.header}>
        <Text style={[theme.typography.caption, styles.headerCopy, { color: theme.colors.textSecondary }]}>{bar.label}</Text>
        <Text style={[theme.typography.label, { color: theme.colors.textPrimary }]}>{value}</Text>
      </View>
      <View accessible={false} style={[styles.track, { backgroundColor: theme.colors.surfaceRaised }]}>
        <View style={[styles.bar, { width: `${ratio}%`, backgroundColor: theme.colors[bar.tone] }]} />
      </View>
    </View>;
  })}</View>;
}

function RecordList({ items, locale }: { items: DashboardItem[]; locale: Locale }) {
  const { theme } = useAppTheme();
  return <View style={{ gap: theme.spacing.lg }}>{items.map((item, index) => {
    const date = item.date ? new Date(item.date) : null;
    return <View key={`${item.id}-${index}`} style={[styles.record, { borderColor: theme.colors.border, gap: theme.spacing.sm }]}>
      <Text style={[theme.typography.label, { color: theme.colors.textPrimary }]}>{item.title}</Text>
      {item.detail ? <Text style={[theme.typography.caption, { color: theme.colors.textSecondary }]}>{item.detail}</Text> : null}
      {item.value ? <Text style={[theme.typography.body, { color: theme.colors.textPrimary }]}>{item.value}</Text> : null}
      {item.status ? <Text style={[theme.typography.caption, { color: theme.colors[item.tone] }]}>{statusLabel(item.status, locale)}</Text> : null}
      {date && Number.isFinite(date.getTime()) ? <Text style={[theme.typography.caption, { color: theme.colors.textSecondary }]}>{new Intl.DateTimeFormat(locale === 'vi' ? 'vi-VN' : 'en-GB', {
        day: '2-digit', month: '2-digit', year: 'numeric', timeZone: 'Asia/Ho_Chi_Minh',
      }).format(date)}</Text> : null}
    </View>;
  })}</View>;
}

const styles = StyleSheet.create({ content: { width: '100%', maxWidth: 800, alignSelf: 'center', paddingBottom: 32 },
  header: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', gap: 12 },
  headerCopy: { flexGrow: 1, flexShrink: 1, minWidth: 0, gap: 6 }, brand: { letterSpacing: 2 },
  metrics: { flexDirection: 'row', flexWrap: 'wrap' }, facility: { maxWidth: 240 },
  track: { height: 8, borderRadius: 4, overflow: 'hidden' }, bar: { height: 8, borderRadius: 4 },
  record: { borderTopWidth: StyleSheet.hairlineWidth, paddingTop: 16 } });
