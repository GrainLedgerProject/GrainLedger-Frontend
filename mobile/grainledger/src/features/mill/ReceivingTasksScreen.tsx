import { useCallback, useMemo, useState } from 'react';
import { router, useLocalSearchParams } from 'expo-router';
import { FlatList, RefreshControl, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { GlassButton } from '@/components/glass/GlassButton';
import { GlassCard } from '@/components/glass/GlassCard';
import { GlassInput } from '@/components/glass/GlassInput';
import { GlassStatCard } from '@/components/glass/GlassStatCard';
import { useAuth } from '@/features/auth/AuthProvider';
import { useApiResource } from '@/hooks/use-api-resource';
import { useAppTheme } from '@/theme/ThemeProvider';
import {
  calculateReceivingVariance,
  canAccessReceiving,
  createReceivingService,
  formatMass,
  formatReceivingStatus,
  isManager,
  isOperator,
  type ReceivingTaskItem,
} from './receiving-api';

export function ReceivingTasksScreen() {
  const { client, user } = useAuth();
  const scope = client.getRequestScope();
  if (!user || scope === null) return null;
  return <ReceivingTasksView key={scope} />;
}

function ReceivingTasksView() {
  const { client, user } = useAuth();
  const { theme } = useAppTheme();
  const { colors: c, typography: t, spacing: s, radius: r } = theme;

  const [locale, setLocale] = useState<'vi' | 'en'>('vi');
  const tr = (vi: string, en: string) => (locale === 'vi' ? vi : en);

  const params = useLocalSearchParams<{ search?: string | string[] }>();
  const initialSearch = typeof params.search === 'string' ? params.search : '';

  const service = useMemo(() => createReceivingService(client.api), [client]);

  // Check role authorization
  const role = user?.normalizedRole ?? null;
  const hasAccess = canAccessReceiving(role);
  const operatorRole = isOperator(role);
  const managerRole = isManager(role);

  // Facility lookup resource
  const loadFacilities = useCallback((signal: AbortSignal) => service.getFacilities(signal), [service]);
  const facilitiesState = useApiResource(loadFacilities);
  const facilities = useMemo(() => (facilitiesState.status === 'success' ? facilitiesState.data : []), [facilitiesState.data, facilitiesState.status]);

  const [selectedFacilityId, setSelectedFacilityId] = useState<string>('');
  const activeFacilityId = selectedFacilityId || facilities[0]?.id || '';

  // Task filtering state
  const [searchInput, setSearchInput] = useState(initialSearch);
  const [filters, setFilters] = useState<{ search: string; status: string; page: number }>({
    search: initialSearch,
    status: '',
    page: 1,
  });

  const loadTasks = useCallback(
    (signal: AbortSignal) => {
      if (!activeFacilityId) {
        return Promise.resolve({ items: [], paging: null });
      }
      return service.listTasks(
        {
          facilityId: activeFacilityId,
          search: filters.search,
          status: filters.status,
          page: filters.page,
          pageSize: 25,
        },
        signal
      );
    },
    [service, activeFacilityId, filters]
  );

  const tasksState = useApiResource(loadTasks);
  const tasksData = tasksState.status === 'success' ? tasksState.data : null;
  const tasks = useMemo(() => tasksData?.items ?? [], [tasksData]);

  const isInitialLoading =
    (facilitiesState.isLoading && !facilities.length) || (tasksState.isLoading && !tasks.length && Boolean(activeFacilityId));

  // Quick statistics
  const stats = useMemo(() => {
    const total = tasks.length;
    const pendingMeasure = tasks.filter((task) => task.status === 'PENDING_ARRIVAL').length;
    const awaitingReview = tasks.filter((task) => task.status === 'AWAITING_MANAGER_REVIEW').length;
    const matched = tasks.filter(
      (task) =>
        task.status === 'RECEIVED_MATCHED' ||
        task.status === 'RECEIVED_WITHIN_TOLERANCE' ||
        task.status === 'RECEIVED_SHORTAGE_APPROVED'
    ).length;
    return { total, pendingMeasure, awaitingReview, matched };
  }, [tasks]);

  const onSearchSubmit = () => {
    setFilters((prev) => ({ ...prev, search: searchInput.trim(), page: 1 }));
  };

  const onSelectStatus = (status: string) => {
    setFilters((prev) => ({ ...prev, status, page: 1 }));
  };

  const statusOptions = [
    { key: '', label: tr('Tất cả', 'All') },
    { key: 'PENDING_ARRIVAL', label: tr('Chờ cân', 'Pending arrival') },
    { key: 'AWAITING_MANAGER_REVIEW', label: tr('Chờ duyệt', 'Awaiting review') },
    { key: 'RECEIVED_MATCHED', label: tr('Khớp', 'Matched') },
    { key: 'RECEIVED_SHORTAGE_APPROVED', label: tr('Duyệt lệch', 'Shortage approved') },
    { key: 'BLOCKED_UNRESOLVED', label: tr('Bị chặn', 'Blocked') },
  ];

  if (!hasAccess) {
    return (
      <View style={[styles.root, { backgroundColor: c.backgroundGrouped }]}>
        <SafeAreaView style={styles.safe}>
          <View style={styles.header}>
            <GlassButton label={tr('Quay lại', 'Back')} variant="glass" onPress={() => router.dismissTo('/home')} />
            <Text style={[t.heading, { color: c.textPrimary }]}>{tr('Tiếp nhận nguyên liệu', 'Receiving Tasks')}</Text>
          </View>
          <View style={{ padding: s.page }}>
            <GlassCard opaque style={{ borderColor: c.danger, borderWidth: 1 }}>
              <Text style={[t.heading, { color: c.danger, marginBottom: s.xs }]}>
                {tr('Quyền truy cập bị từ chối', 'Access Denied')}
              </Text>
              <Text style={[t.body, { color: c.textSecondary, marginBottom: s.md }]}>
                {tr(
                  'Khu vực này chỉ dành cho Nhân viên vận hành (Mill Operator), Quản lý nhà máy (Mill Manager) và Quản trị viên (Mill Admin).',
                  'This workspace is only accessible to Mill Operators, Mill Managers, and Mill Administrators.'
                )}
              </Text>
              <GlassButton label={tr('Về Trang chủ', 'Go to Home')} variant="glass" onPress={() => router.dismissTo('/home')} />
            </GlassCard>
          </View>
        </SafeAreaView>
      </View>
    );
  }

  const renderTaskItem = ({ item }: { item: ReceivingTaskItem }) => {
    const variance = calculateReceivingVariance(item.expectedTotalKg, item.actualTotalKg);
    const statusInfo = formatReceivingStatus(item.status, locale);

    const isPendingMeasure = item.status === 'PENDING_ARRIVAL';
    const isPendingReview = item.status === 'AWAITING_MANAGER_REVIEW';

    return (
      <GlassCard opaque shadow="none" style={{ marginBottom: s.sm }}>
        <View style={styles.cardHeader}>
          <View style={{ gap: 2 }}>
            <Text style={[t.heading, { color: c.textPrimary, fontWeight: '700' }]}>{item.code}</Text>
            {item.receivedAt ? (
              <Text style={[t.caption, { color: c.textSecondary }]}>
                {new Date(item.receivedAt).toLocaleDateString(locale === 'vi' ? 'vi-VN' : 'en-US')}
              </Text>
            ) : null}
          </View>
          <View
            style={[
              styles.badge,
              {
                backgroundColor:
                  statusInfo.tone === 'success'
                    ? c.successSurface
                    : statusInfo.tone === 'info'
                    ? c.infoSurface
                    : statusInfo.tone === 'warning'
                    ? c.warningSurface
                    : statusInfo.tone === 'danger'
                    ? c.dangerSurface
                    : c.surfaceRaised,
              },
            ]}
          >
            <Text
              style={[
                t.caption,
                {
                  color:
                    statusInfo.tone === 'success'
                      ? c.success
                      : statusInfo.tone === 'info'
                      ? c.info
                      : statusInfo.tone === 'warning'
                      ? c.warning
                      : statusInfo.tone === 'danger'
                      ? c.danger
                      : c.textSecondary,
                  fontWeight: '600',
                },
              ]}
            >
              {statusInfo.label}
            </Text>
          </View>
        </View>

        {item.ownerCompanyName ? (
          <Text style={[t.body, { color: c.textPrimary, marginVertical: s.xs }]}>
            {tr('Nguồn / Nông hộ: ', 'Source: ')}
            <Text style={{ fontWeight: '600' }}>{item.ownerCompanyName}</Text>
          </Text>
        ) : null}

        {/* Mass Comparison Grid */}
        <View style={[styles.massGrid, { backgroundColor: c.backgroundGrouped, borderRadius: r.control, padding: s.sm }]}>
          <View style={styles.massCol}>
            <Text style={[t.caption, { color: c.textSecondary }]}>{tr('Cân xuất phát', 'Origin weight')}</Text>
            <Text style={[t.body, styles.number, { color: c.textPrimary, fontWeight: '600' }]}>
              {formatMass(item.expectedTotalKg, 3, locale)} kg
            </Text>
            {item.originMoisturePercent ? (
              <Text style={[t.caption, { color: c.textSecondary }]}>
                {tr('Ẩm: ', 'Moisture: ')}
                {item.originMoisturePercent}%
              </Text>
            ) : null}
          </View>

          <View style={styles.massCol}>
            <Text style={[t.caption, { color: c.textSecondary }]}>{tr('Cân cập bến', 'Arrival weight')}</Text>
            {item.actualTotalKg ? (
              <>
                <Text style={[t.body, styles.number, { color: c.textPrimary, fontWeight: '600' }]}>
                  {formatMass(item.actualTotalKg, 3, locale)} kg
                </Text>
                {item.arrivalMoisturePercent ? (
                  <Text style={[t.caption, { color: c.textSecondary }]}>
                    {tr('Ẩm: ', 'Moisture: ')}
                    {item.arrivalMoisturePercent}%
                  </Text>
                ) : null}
              </>
            ) : (
              <Text style={[t.caption, { color: c.textSecondary, fontStyle: 'italic' }]}>
                {tr('Chưa cân xe', 'Not measured')}
              </Text>
            )}
          </View>

          <View style={styles.massCol}>
            <Text style={[t.caption, { color: c.textSecondary }]}>{tr('Độ lệch', 'Variance')}</Text>
            {variance ? (
              <>
                <Text
                  style={[
                    t.body,
                    styles.number,
                    {
                      color: variance.isWithinTolerance ? c.success : c.danger,
                      fontWeight: '700',
                    },
                  ]}
                >
                  {variance.isPositive ? `+${variance.diffKg}` : variance.diffKg} kg
                </Text>
                <Text
                  style={[
                    t.caption,
                    styles.number,
                    {
                      color: variance.isWithinTolerance ? c.success : c.danger,
                    },
                  ]}
                >
                  ({variance.isPositive ? `+${variance.diffPercent}` : variance.diffPercent}%)
                </Text>
              </>
            ) : (
              <Text style={[t.caption, { color: c.textSecondary }]}>-</Text>
            )}
          </View>
        </View>

        {/* Role action hints */}
        {isPendingMeasure ? (
          <View style={[styles.roleHint, { backgroundColor: c.warningSurface, borderRadius: r.control, marginTop: s.xs }]}>
            <Text style={[t.caption, { color: c.warning, fontWeight: '600' }]}>
              {operatorRole
                ? tr('Cần cân xe: Ghi nhận số cân cập bến thực tế', 'Action needed: Operator record arrival measurement')
                : tr('Đang chờ nhân viên vận hành cân xe', 'Awaiting operator measurement')}
            </Text>
          </View>
        ) : null}

        {isPendingReview ? (
          <View style={[styles.roleHint, { backgroundColor: c.infoSurface, borderRadius: r.control, marginTop: s.xs }]}>
            <Text style={[t.caption, { color: c.info, fontWeight: '600' }]}>
              {managerRole
                ? tr('Cần đối soát: Xác nhận phê duyệt dung sai', 'Action needed: Manager review reconciliation')
                : tr('Đang chờ Quản lý nhà máy duyệt đối soát', 'Awaiting manager reconciliation review')}
            </Text>
          </View>
        ) : null}

        <View style={{ marginTop: s.sm, alignItems: 'flex-end' }}>
          <GlassButton
            opaque
            label={tr('Chi tiết chuyến xe', 'View Task Details')}
            variant="glass"
            onPress={() => router.push({ pathname: '/mill/receiving/[id]', params: { id: item.id } } as any)}
          />
        </View>
      </GlassCard>
    );
  };

  return (
    <View style={[styles.root, { backgroundColor: c.backgroundGrouped }]}>
      <SafeAreaView edges={['top', 'left', 'right']} style={styles.safe}>
        {/* Header */}
        <View style={[styles.header, { borderBottomColor: c.border }]}>
          <GlassButton label={tr('Trang chủ', 'Home')} variant="glass" onPress={() => router.dismissTo('/home')} />
          <View style={{ flex: 1, paddingHorizontal: s.sm, gap: 2 }}>
            <Text style={[t.caption, { color: c.primary, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.5 }]}>
              {tr('Nhà máy · Tiếp nhận', 'Mill · Receiving')}
            </Text>
            <Text style={[t.heading, { color: c.textPrimary }]}>{tr('Tiếp nhận nguyên liệu', 'Material Receiving')}</Text>
          </View>
          <TouchableOpacity
            onPress={() => setLocale((l) => (l === 'vi' ? 'en' : 'vi'))}
            style={[styles.langToggle, { borderColor: c.border, backgroundColor: c.surface }]}
          >
            <Text style={[t.caption, { color: c.textPrimary, fontWeight: '700' }]}>
              {locale === 'vi' ? 'EN' : 'VI'}
            </Text>
          </TouchableOpacity>
        </View>

        {/* Facility Context Picker */}
        {facilities.length > 0 ? (
          <View style={[styles.facilityBar, { borderBottomColor: c.border, backgroundColor: c.surface }]}>
            <Text style={[t.caption, { color: c.textSecondary, marginBottom: 4 }]}>
              {tr('Cơ sở đang chọn:', 'Active Facility:')}
            </Text>
            <View style={styles.facilityPillList}>
              {facilities.map((fac) => {
                const isSelected = fac.id === activeFacilityId;
                return (
                  <TouchableOpacity
                    key={fac.id}
                    onPress={() => setSelectedFacilityId(fac.id)}
                    style={[
                      styles.facilityPill,
                      {
                        backgroundColor: isSelected ? c.primary : c.surfaceRaised,
                        borderColor: isSelected ? c.primary : c.border,
                      },
                    ]}
                  >
                    <Text
                      style={[
                        t.caption,
                        {
                          color: isSelected ? c.onPrimary : c.textPrimary,
                          fontWeight: isSelected ? '700' : '500',
                        },
                      ]}
                    >
                      {fac.name}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>
        ) : null}

        <FlatList
          data={tasks}
          keyExtractor={(item) => item.id}
          renderItem={renderTaskItem}
          contentContainerStyle={{ padding: s.page, paddingBottom: s.xl, maxWidth: 800, width: '100%', alignSelf: 'center' }}
          refreshControl={
            <RefreshControl
              refreshing={tasksState.isLoading}
              onRefresh={() => {
                void tasksState.reload();
              }}
              tintColor={c.primary}
            />
          }
          ListHeaderComponent={
            <View style={{ gap: s.md, marginBottom: s.md }}>
              {/* Quick KPI Stats */}
              <View style={styles.kpiRow}>
                <View style={styles.kpiCol}>
                  <GlassStatCard
                    opaque
                    label={tr('Tổng chuyến', 'Total tasks')}
                    value={stats.total.toString()}
                    detail={tr('Các chuyến tiếp nhận trong kỳ', 'Arrival tasks in active period')}
                    tone="primary"
                  />
                </View>
                <View style={styles.kpiCol}>
                  <GlassStatCard
                    opaque
                    label={tr('Chờ cân xe', 'Pending measure')}
                    value={stats.pendingMeasure.toString()}
                    detail={tr('Chờ nhân viên vận hành cân', 'Awaiting operator weighing')}
                    tone="warning"
                  />
                </View>
              </View>

              <View style={styles.kpiRow}>
                <View style={styles.kpiCol}>
                  <GlassStatCard
                    opaque
                    label={tr('Chờ duyệt', 'Awaiting review')}
                    value={stats.awaitingReview.toString()}
                    detail={tr('Chờ quản lý duyệt đối soát', 'Awaiting manager reconciliation')}
                    tone="info"
                  />
                </View>
                <View style={styles.kpiCol}>
                  <GlassStatCard
                    opaque
                    label={tr('Đã nhập kho', 'Matched')}
                    value={stats.matched.toString()}
                    detail={tr('Đã đối soát thành công', 'Successfully received and matched')}
                    tone="primary"
                  />
                </View>
              </View>

              {/* Search & Status Filter */}
              <GlassCard opaque title={tr('Tìm kiếm & Lọc trạng thái', 'Search & Filters')}>
                <GlassInput
                  opaque
                  label={tr('Tìm kiếm chuyến xe', 'Search tasks')}
                  value={searchInput}
                  onChangeText={setSearchInput}
                  onSubmitEditing={onSearchSubmit}
                  placeholder={tr('Tìm mã lô, nông hộ, mã xe...', 'Search lot code, farmer, truck...')}
                  returnKeyType="search"
                />
                <View style={styles.filterRow}>
                  {statusOptions.map((opt) => {
                    const isSelected = filters.status === opt.key;
                    return (
                      <TouchableOpacity
                        key={opt.key}
                        onPress={() => onSelectStatus(opt.key)}
                        style={[
                          styles.filterChip,
                          {
                            backgroundColor: isSelected ? c.primary : c.surfaceRaised,
                            borderColor: isSelected ? c.primary : c.border,
                          },
                        ]}
                      >
                        <Text
                          style={[
                            t.caption,
                            {
                              color: isSelected ? c.onPrimary : c.textSecondary,
                              fontWeight: isSelected ? '700' : '500',
                            },
                          ]}
                        >
                          {opt.label}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>
              </GlassCard>

              {tasksState.error ? (
                <GlassCard opaque style={{ borderColor: c.danger, borderWidth: 1 }}>
                  <Text style={[t.body, { color: c.danger, marginBottom: s.xs }]}>
                    {tasksState.error.message || tr('Không thể tải danh sách tiếp nhận.', 'Unable to load receiving tasks.')}
                  </Text>
                  <GlassButton label={tr('Thử lại', 'Retry')} variant="glass" onPress={() => void tasksState.reload()} />
                </GlassCard>
              ) : null}
            </View>
          }
          ListEmptyComponent={
            isInitialLoading ? (
              <View style={styles.emptyContainer}>
                <Text style={[t.body, { color: c.textSecondary }]}>
                  {tr('Đang tải danh sách chuyến xe tiếp nhận...', 'Loading receiving tasks...')}
                </Text>
              </View>
            ) : !activeFacilityId ? (
              <GlassCard opaque>
                <Text style={[t.heading, { color: c.textPrimary, marginBottom: s.xs }]}>
                  {tr('Chưa chọn cơ sở', 'No facility selected')}
                </Text>
                <Text style={[t.body, { color: c.textSecondary }]}>
                  {tr(
                    'Vui lòng chọn cơ sở chế biến được phân công để xem các chuyến xe tiếp nhận.',
                    'Please select an assigned processing facility to view receiving tasks.'
                  )}
                </Text>
              </GlassCard>
            ) : (
              <GlassCard opaque>
                <Text style={[t.heading, { color: c.textPrimary, marginBottom: s.xs }]}>
                  {tr('Không có chuyến xe nào', 'No receiving tasks found')}
                </Text>
                <Text style={[t.body, { color: c.textSecondary }]}>
                  {tr(
                    'Hiện không có chuyến xe tiếp nhận nào phù hợp với bộ lọc tại cơ sở này.',
                    'There are currently no receiving tasks matching the filters at this facility.'
                  )}
                </Text>
              </GlassCard>
            )
          }
        />
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
  safe: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  langToggle: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    borderWidth: 1,
    minHeight: 44,
    justifyContent: 'center',
  },
  facilityBar: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  facilityPillList: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  facilityPill: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 16,
    borderWidth: 1,
    minHeight: 44,
    justifyContent: 'center',
  },
  kpiRow: {
    flexDirection: 'row',
    gap: 12,
  },
  kpiCol: {
    flex: 1,
  },
  filterRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginTop: 8,
  },
  filterChip: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 14,
    borderWidth: 1,
    minHeight: 40,
    justifyContent: 'center',
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  badge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  massGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 8,
  },
  massCol: {
    flex: 1,
  },
  number: {
    fontVariant: ['tabular-nums'],
  },
  roleHint: {
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 40,
    paddingHorizontal: 20,
  },
});
