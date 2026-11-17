import { router, useLocalSearchParams } from 'expo-router';
import { useCallback, useMemo, useState } from 'react';
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { GlassButton } from '@/components/glass/GlassButton';
import { GlassCard } from '@/components/glass/GlassCard';
import { useAuth } from '@/features/auth/AuthProvider';
import { useApiResource } from '@/hooks/use-api-resource';
import { useAppTheme } from '@/theme/ThemeProvider';
import { ApiError } from '@/services/api/errors';
import { canRecordMeasurement } from './receiving-measurement';
import { ReceivingMeasurementForm } from './ReceivingMeasurementForm';
import {
  calculateReceivingVariance,
  canAccessReceiving,
  createReceivingService,
  formatMass,
  formatReceivingStatus,
  isManager,
  isOperator,
} from './receiving-api';
import { readReceivingId } from '@/navigation/mill-route';

export function ReceivingTaskDetailScreen() {
  const { client, user } = useAuth();
  const params = useLocalSearchParams<{ id?: string | string[]; lang?: string | string[] }>();
  const id = readReceivingId(params.id);
  const scope = client.getRequestScope();
  if (!user || scope === null) return null;
  return <TaskDetailView key={`${scope}:${id}`} taskId={id} initialLocale={params.lang === 'en' ? 'en' : 'vi'} />;
}

function TaskDetailView({ taskId, initialLocale }: { taskId: string | null; initialLocale: 'vi' | 'en' }) {
  const { client, user } = useAuth();
  const { theme } = useAppTheme();
  const { colors: c, typography: t, spacing: s, radius: r } = theme;

  const [locale, setLocale] = useState<'vi' | 'en'>(initialLocale);
  const [measureOpen, setMeasureOpen] = useState(false);
  const [measurementSavedVersion, setMeasurementSavedVersion] = useState<number | null>(null);
  const tr = (vi: string, en: string) => (locale === 'vi' ? vi : en);

  const role = user?.normalizedRole ?? null;
  const hasAccess = canAccessReceiving(role);
  const operatorRole = isOperator(role);
  const managerRole = isManager(role);

  const service = useMemo(() => createReceivingService(client.api), [client]);
  const load = useCallback((signal: AbortSignal) => hasAccess
    ? service.getDetail(taskId, signal)
    : Promise.reject(new ApiError('Receiving access denied.', 403, 'http')), [service, taskId, hasAccess]);
  const state = useApiResource(load);
  const detail = state.status === 'success' ? state.data : null;
  const loading = state.status === 'idle' || state.isLoading;

  const back = () => {
    if (router.canGoBack()) {
      router.back();
    } else {
      router.replace('/mill/receiving' as any);
    }
  };

  if (!hasAccess) {
    return (
      <View style={[styles.root, { backgroundColor: c.backgroundGrouped }]}>
        <SafeAreaView style={styles.safe}>
          <View style={[styles.header, { borderBottomColor: c.border }]}>
            <GlassButton label={tr('Quay lại', 'Back')} variant="glass" onPress={back} />
            <Text style={[t.heading, { color: c.textPrimary }]}>{tr('Chi tiết chuyến xe', 'Task Details')}</Text>
          </View>
          <View style={{ padding: s.page }}>
            <GlassCard opaque style={{ borderColor: c.danger, borderWidth: 1 }}>
              <Text style={[t.heading, { color: c.danger, marginBottom: s.xs }]}>
                {tr('Quyền truy cập bị từ chối', 'Access Denied')}
              </Text>
              <Text style={[t.body, { color: c.textSecondary, marginBottom: s.md }]}>
                {tr(
                  'Khu vực này chỉ dành cho Nhân viên vận hành, Quản lý nhà máy và Quản trị viên.',
                  'This workspace is only accessible to Mill Operators, Mill Managers, and Mill Administrators.'
                )}
              </Text>
              <GlassButton label={tr('Quay lại danh sách', 'Back to Tasks')} variant="glass" onPress={back} />
            </GlassCard>
          </View>
        </SafeAreaView>
      </View>
    );
  }

  if (!taskId) {
    return (
      <View style={[styles.root, { backgroundColor: c.backgroundGrouped }]}>
        <SafeAreaView style={styles.safe}>
          <View style={[styles.header, { borderBottomColor: c.border }]}>
            <GlassButton label={tr('Quay lại', 'Back')} variant="glass" onPress={back} />
            <Text style={[t.heading, { color: c.textPrimary }]}>{tr('Chi tiết chuyến xe', 'Task Details')}</Text>
          </View>
          <View style={{ padding: s.page }}>
            <GlassCard opaque style={{ borderColor: c.danger, borderWidth: 1 }}>
              <Text style={[t.heading, { color: c.danger, marginBottom: s.xs }]}>
                {tr('Mã chuyến xe không hợp lệ', 'Invalid Task Identifier')}
              </Text>
              <Text style={[t.body, { color: c.textSecondary, marginBottom: s.md }]}>
                {tr(
                  'Đường dẫn không chứa định danh hợp lệ cho chuyến xe tiếp nhận.',
                  'The link does not contain a valid identifier for a receiving task.'
                )}
              </Text>
              <GlassButton label={tr('Quay lại danh sách', 'Back to Tasks')} variant="glass" onPress={back} />
            </GlassCard>
          </View>
        </SafeAreaView>
      </View>
    );
  }

  const variance = detail ? calculateReceivingVariance(detail.expectedTotalKg, detail.actualTotalKg) : null;
  const statusInfo = detail ? formatReceivingStatus(detail.status, locale) : null;

  return (
    <View style={[styles.root, { backgroundColor: c.backgroundGrouped }]}>
      <SafeAreaView edges={['top', 'left', 'right']} style={styles.safe}>
        {/* Header */}
        <View style={[styles.header, { borderBottomColor: c.border }]}>
          <GlassButton label={tr('Danh sách', 'Tasks')} variant="glass" onPress={back} />
          <View style={{ flex: 1, paddingHorizontal: s.sm, gap: 2 }}>
            <Text style={[t.caption, { color: c.primary, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.5 }]}>
              {tr('Chi tiết chuyến xe tiếp nhận', 'Receiving Task Detail')}
            </Text>
            <Text style={[t.heading, { color: c.textPrimary }]} numberOfLines={1}>
              {detail ? detail.code : taskId}
            </Text>
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

        <ScrollView contentContainerStyle={{ padding: s.page, gap: s.md, paddingBottom: s.xxl, maxWidth: 800, width: '100%', alignSelf: 'center' }}>
          {measurementSavedVersion !== null ? <GlassCard title={tr('Đã ghi nhận số đo', 'Measurement recorded')}>
            <Text accessibilityLiveRegion="polite" style={[t.body, { color: c.textPrimary }]}>{tr('Số đo đã được gửi thành công. Kiểm tra chi tiết mới; việc xét duyệt tiếp nhận là bước riêng.', 'The measurement was submitted successfully. Check the refreshed detail; receiving review is a separate step.')}</Text>
          </GlassCard> : null}
          {loading ? (
            <GlassCard opaque>
              <Text style={[t.body, { color: c.textSecondary, textAlign: 'center', paddingVertical: s.lg }]}>
                {tr('Đang tải dữ liệu chuyến xe...', 'Loading receiving task details...')}
              </Text>
            </GlassCard>
          ) : state.error ? (
            <GlassCard opaque style={{ borderColor: c.danger, borderWidth: 1 }}>
              <Text style={[t.heading, { color: c.danger, marginBottom: s.xs }]}>
                {tr('Không thể tải chi tiết chuyến xe', 'Unable to Load Task Details')}
              </Text>
              <Text style={[t.body, { color: c.textSecondary, marginBottom: s.md }]}>
                {state.error.message}
              </Text>
              <GlassButton label={tr('Thử lại', 'Retry')} variant="glass" onPress={() => void state.reload()} />
            </GlassCard>
          ) : detail ? (
            <>
              {measurementSavedVersion !== detail.receivingVersion && canRecordMeasurement(user, detail) ? <GlassButton label={tr('Ghi số đo tiếp nhận', 'Record arrival measurement')}
                onPress={() => { setMeasurementSavedVersion(null); setMeasureOpen(true); }} /> : null}
              {/* Status & Overview Card */}
              <GlassCard opaque>
                <View style={styles.rowBetween}>
                  <View style={{ gap: 2 }}>
                    <Text style={[t.caption, { color: c.textSecondary }]}>{tr('Mã chuyến xe / Lô nguồn', 'Task Code')}</Text>
                    <Text style={[t.title, { color: c.textPrimary, fontWeight: '700' }]}>{detail.code}</Text>
                  </View>
                  {statusInfo ? (
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
                          t.label,
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
                            fontWeight: '700',
                          },
                        ]}
                      >
                        {statusInfo.label}
                      </Text>
                    </View>
                  ) : null}
                </View>

                <View style={[styles.infoGrid, { marginTop: s.md, borderTopColor: c.border, borderTopWidth: StyleSheet.hairlineWidth, paddingTop: s.sm }]}>
                  {detail.ownerCompanyName ? (
                    <View style={styles.infoCol}>
                      <Text style={[t.caption, { color: c.textSecondary }]}>{tr('Đơn vị xuất / Nông hộ', 'Origin entity')}</Text>
                      <Text style={[t.body, { color: c.textPrimary, fontWeight: '600' }]}>{detail.ownerCompanyName}</Text>
                    </View>
                  ) : null}

                  {detail.facilityName ? (
                    <View style={styles.infoCol}>
                      <Text style={[t.caption, { color: c.textSecondary }]}>{tr('Cơ sở tiếp nhận', 'Facility')}</Text>
                      <Text style={[t.body, { color: c.textPrimary, fontWeight: '600' }]}>{detail.facilityName}</Text>
                    </View>
                  ) : null}

                  {detail.receivingLocationName ? (
                    <View style={styles.infoCol}>
                      <Text style={[t.caption, { color: c.textSecondary }]}>{tr('Điểm bến cân', 'Receiving location')}</Text>
                      <Text style={[t.body, { color: c.textPrimary, fontWeight: '600' }]}>{detail.receivingLocationName}</Text>
                    </View>
                  ) : null}

                  <View style={styles.infoCol}>
                    <Text style={[t.caption, { color: c.textSecondary }]}>{tr('Phiên bản tiếp nhận', 'Receiving version')}</Text>
                    <Text style={[t.body, { color: c.textPrimary, fontWeight: '600' }]}>v{detail.receivingVersion}</Text>
                  </View>
                </View>
              </GlassCard>

              {/* Mass Comparison & Tolerance Card */}
              <GlassCard opaque title={tr('Đối soát khối lượng & Dung sai', 'Mass Comparison & Tolerance')}>
                <View style={[styles.massComparisonContainer, { backgroundColor: c.surfaceRaised, borderRadius: r.control, padding: s.md }]}>
                  <View style={styles.massRow}>
                    <Text style={[t.body, { color: c.textSecondary }]}>{tr('Cân xuất phát (Gốc):', 'Origin mass (Recorded):')}</Text>
                    <Text style={[t.heading, styles.number, { color: c.textPrimary, fontWeight: '700' }]}>
                      {formatMass(detail.expectedTotalKg, 3, locale)} kg
                    </Text>
                  </View>

                  <View style={styles.massRow}>
                    <Text style={[t.body, { color: c.textSecondary }]}>{tr('Cân thực tế cập bến:', 'Actual arrival mass:')}</Text>
                    {detail.actualTotalKg ? (
                      <Text style={[t.heading, styles.number, { color: c.textPrimary, fontWeight: '700' }]}>
                        {formatMass(detail.actualTotalKg, 3, locale)} kg
                      </Text>
                    ) : (
                      <Text style={[t.body, { color: c.textSecondary, fontStyle: 'italic' }]}>
                        {tr('Chưa ghi nhận số cân', 'Not measured yet')}
                      </Text>
                    )}
                  </View>

                  {variance ? (
                    <View style={[styles.massRow, { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: c.border, paddingTop: s.xs, marginTop: s.xs }]}>
                      <Text style={[t.label, { color: c.textPrimary, fontWeight: '600' }]}>{tr('Chênh lệch (Độ lệch):', 'Variance:')}</Text>
                      <Text
                        style={[
                          t.heading,
                          styles.number,
                          {
                            color: variance.isWithinTolerance ? c.success : c.danger,
                            fontWeight: '700',
                          },
                        ]}
                      >
                        {variance.isPositive ? `+${variance.diffKg}` : variance.diffKg} kg ({variance.isPositive ? `+${variance.diffPercent}` : variance.diffPercent}%)
                      </Text>
                    </View>
                  ) : null}
                </View>

                <View style={[styles.toleranceNote, { backgroundColor: variance?.isWithinTolerance ? c.selectedSurface : c.warningSurface, borderRadius: r.control, marginTop: s.xs }]}>
                  <Text style={[t.caption, { color: variance?.isWithinTolerance ? c.primary : c.warning, fontWeight: '600', lineHeight: 18 }]}>
                    {tr(
                      'Tiêu chuẩn ISO 22095: Ngưỡng dung sai hao hụt vận chuyển cho phép là ±0,5%. Khi khối lượng thực tế nằm trong dung sai, quản lý có thể phê duyệt nhập kho trực tiếp.',
                      'ISO 22095 Standard: Transport loss tolerance is ±0.5%. When arrival mass is within tolerance, management can approve warehouse entry directly.'
                    )}
                  </Text>
                </View>
              </GlassCard>

              {/* Items Breakdown */}
              <GlassCard opaque title={tr('Chi tiết dòng hàng', 'Procurement Line Items')}>
                {detail.items.length === 0 ? (
                  <Text style={[t.caption, { color: c.textSecondary }]}>
                    {tr('Không có dòng hàng chi tiết được trả về.', 'No line items returned.')}
                  </Text>
                ) : (
                  detail.items.map((it) => (
                    <View key={it.id} style={[styles.lineItem, { borderBottomColor: c.border }]}>
                      <View style={styles.rowBetween}>
                        <Text style={[t.label, { color: c.textPrimary, fontWeight: '600' }]}>
                          #{it.lineNo} {it.riceVariety || tr('Lúa tươi', 'Fresh paddy')}
                        </Text>
                        {it.lotCode ? (
                          <Text style={[t.caption, { color: c.primary, fontWeight: '600' }]}>{it.lotCode}</Text>
                        ) : null}
                      </View>
                      <View style={[styles.rowBetween, { marginTop: 4 }]}>
                        <Text style={[t.caption, styles.number, { color: c.textSecondary }]}>
                          {tr('Dự kiến: ', 'Expected: ')}
                          {it.expectedKg ? formatMass(it.expectedKg, 3, locale) : it.expectedValue} {it.expectedUnit || 'KG'}
                        </Text>
                        <Text style={[t.caption, styles.number, { color: it.actualKg ? c.textPrimary : c.textSecondary, fontWeight: it.actualKg ? '600' : '400' }]}>
                          {tr('Thực tế: ', 'Actual: ')}
                          {it.actualKg ? `${formatMass(it.actualKg, 3, locale)} ${it.actualUnit || 'KG'}` : tr('Chưa đo', 'Unmeasured')}
                        </Text>
                      </View>
                    </View>
                  ))
                )}
              </GlassCard>

              {/* Measurement History */}
              <GlassCard opaque title={tr('Lịch sử đo lường cân xe', 'Measurement History')}>
                {detail.measurementSets.length === 0 ? (
                  <Text style={[t.caption, { color: c.textSecondary }]}>
                    {tr('Chưa có lượt cân thực tế nào được ghi nhận cho chuyến xe này.', 'No measurement sets recorded yet.')}
                  </Text>
                ) : (
                  detail.measurementSets.map((ms, idx) => (
                    <View key={ms.id} style={[styles.historyItem, { borderBottomColor: c.border }]}>
                      <View style={styles.rowBetween}>
                        <Text style={[t.label, { color: c.textPrimary, fontWeight: '600' }]}>
                          {tr('Lượt đo #', 'Measurement #')}
                          {idx + 1}
                        </Text>
                        {ms.capturedAt ? (
                          <Text style={[t.caption, { color: c.textSecondary }]}>
                            {new Date(ms.capturedAt).toLocaleString(locale === 'vi' ? 'vi-VN' : 'en-US')}
                          </Text>
                        ) : null}
                      </View>
                      {ms.observations ? (
                        <Text style={[t.caption, { color: c.textSecondary, marginTop: 2 }]}>
                          {tr('Ghi chú: ', 'Observations: ')}
                          {ms.observations}
                        </Text>
                      ) : null}
                    </View>
                  ))
                )}
              </GlassCard>

              {/* Review History */}
              <GlassCard opaque title={tr('Lịch sử duyệt đối soát', 'Reconciliation Reviews')}>
                {detail.reviews.length === 0 ? (
                  <Text style={[t.caption, { color: c.textSecondary }]}>
                    {tr('Chưa có lượt đối soát nào được thực hiện.', 'No reconciliation reviews performed yet.')}
                  </Text>
                ) : (
                  detail.reviews.map((rv) => (
                    <View key={rv.id} style={[styles.historyItem, { borderBottomColor: c.border }]}>
                      <View style={styles.rowBetween}>
                        <Text style={[t.label, { color: c.primary, fontWeight: '600' }]}>{rv.action}</Text>
                        {rv.recordedAt ? (
                          <Text style={[t.caption, { color: c.textSecondary }]}>
                            {new Date(rv.recordedAt).toLocaleString(locale === 'vi' ? 'vi-VN' : 'en-US')}
                          </Text>
                        ) : null}
                      </View>
                      <Text style={[t.caption, { color: c.textSecondary, marginTop: 2 }]}>
                        {tr('Lý do / Căn cứ: ', 'Reason: ')}
                        {rv.reason}
                      </Text>
                    </View>
                  ))
                )}
              </GlassCard>

              {/* Next Workflow Steps Guidance */}
              <GlassCard opaque style={{ borderColor: c.border, borderWidth: 1 }}>
                <Text style={[t.label, { color: c.primary, fontWeight: '700', marginBottom: s.xs }]}>
                  {tr('Quy trình tiếp nhận theo ISO 22095', 'ISO 22095 Receiving Workflow')}
                </Text>
                <Text style={[t.body, { color: c.textSecondary, lineHeight: 20 }]}>
                  {detail.status === 'PENDING_ARRIVAL'
                    ? operatorRole
                      ? tr(
                          'Chuyến xe đang chờ cân bến. Bước tiếp theo: Nhân viên vận hành ghi nhận số cân thực tế và độ ẩm.',
                          'Vehicle awaiting arrival weighing. Next step: Operator records actual mass and moisture.'
                        )
                      : tr(
                          'Chuyến xe đang chờ Nhân viên vận hành ghi nhận số đo tại trạm cân bến.',
                          'Vehicle awaiting Operator measurement recording at weighing scale.'
                        )
                    : detail.status === 'AWAITING_MANAGER_REVIEW'
                    ? managerRole
                      ? tr(
                          'Chuyến xe đã ghi nhận số đo và đang chờ Quản lý duyệt đối soát lệch cân để hoàn tất nhập kho.',
                          'Vehicle measured and awaiting Manager review of mass discrepancy to finalize inventory receipt.'
                        )
                      : tr(
                          'Chuyến xe đang chờ Quản lý nhà máy phê duyệt đối soát.',
                          'Vehicle awaiting Mill Manager reconciliation approval.'
                        )
                    : tr(
                        'Chuyến xe đã hoàn tất tiếp nhận và đối soát nhập kho.',
                        'Vehicle receiving and reconciliation workflow has completed.'
                      )}
                </Text>
              </GlassCard>
            </>
          ) : null}
        </ScrollView>
        {measureOpen && detail && canRecordMeasurement(user, detail) ? <ReceivingMeasurementForm
          key={`${client.getRequestScope()}:${detail.id}:${detail.receivingVersion}`} detail={detail} locale={locale}
          onClose={() => setMeasureOpen(false)}
          onReload={() => { setMeasureOpen(false); void state.reload(); }}
          onSaved={() => { setMeasureOpen(false); setMeasurementSavedVersion(detail.receivingVersion); void state.reload(); }} /> : null}
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
  rowBetween: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  badge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  infoGrid: {
    gap: 8,
  },
  infoCol: {
    marginBottom: 4,
  },
  massComparisonContainer: {
    gap: 8,
  },
  massRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  number: {
    fontVariant: ['tabular-nums'],
  },
  toleranceNote: {
    padding: 12,
  },
  lineItem: {
    paddingVertical: 10,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  historyItem: {
    paddingVertical: 10,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
});
