import { radii, spacing } from '../../theme/tokens';
import React, { useMemo , useState } from 'react';

import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  RefreshControl,
} from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Header } from '../../components/common/Header';
import { MrlVersionsPanel } from '../../components/compliance/MrlVersionsPanel';
import { useAuthStore } from '../../store/authStore';
import { GlassCard } from '../../components/common/GlassCard';
import { GlassButton } from '../../components/common/GlassButton';
import { GlassBadge } from '../../components/common/GlassBadge';
import { GlassSegmentedControl } from '../../components/common/GlassSegmentedControl';
import { useComplianceStore } from '../../store/complianceStore';
import { useRiskStore } from '../../store/riskStore';
import { AppleGlass } from '../../theme/appleGlass';
import { useAppTheme, type AppTheme } from '../../theme';
import {
  ShieldCheck,
  AlertTriangle,
  PlusCircle,
  FileText,
  CheckCircle2,
  Lock,
  Info,
} from '../../components/ui/named-icons';

export default function ComplianceScreen() {
  const router = useRouter();
  const theme = useAppTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);
  const { samples, reports, rules, isLoading, fetchComplianceData, confirmReport } = useComplianceStore();
  const { holds } = useRiskStore();
  const activeRole = useAuthStore((state) => state.activeRole);
  const accountId = useAuthStore((state) => state.user?.id);
  const [activeTab, setActiveTab] = useState<'samples' | 'reports' | 'standards'>('samples');

  const activeHoldsCount = holds.filter((h) => h.status === 'ACTIVE_HOLD').length;

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: theme.colors.background }]}>
      <Header
        title="Kiểm định Tuân thủ MRL"
        subtitle="Quản lý chuỗi mẫu thí nghiệm & phân tích dư lượng BVTV"
      />

      <View style={styles.tabBarContainer}>
        <GlassSegmentedControl
          segments={[
            { id: 'samples', label: 'Mẫu lab', count: samples.length },
            { id: 'reports', label: 'Báo cáo', count: reports.length },
            { id: 'standards', label: 'Tiêu chuẩn' },
          ]}
          activeId={activeTab}
          onSelect={(id) => setActiveTab(id as 'samples' | 'reports' | 'standards')}
        />
      </View>

      <ScrollView keyboardShouldPersistTaps="handled" automaticallyAdjustKeyboardInsets
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={isLoading}
            onRefresh={fetchComplianceData}
            tintColor={theme.colors.accent}
            colors={[theme.colors.accent]}
          />
        }
      >
        {/* Apple Glass Hero Card - MRL Compliance Health Status */}
        <GlassCard
          tintColor={theme.colors.surface}
          borderTint={theme.colors.separator}
          borderRadius={AppleGlass.radii.xl}
          elevated
          style={styles.heroCard}
        >
          <View style={styles.heroTop}>
            <View style={styles.heroIconBox}>
              <ShieldCheck size={28} color={theme.colors.success} />
            </View>
            <View style={{ flex: 1 }}>
              <View style={styles.heroRow}>
                <Text style={styles.heroTitle}>Hồ sơ mẫu & báo cáo lab</Text>
                <GlassBadge status="IN_PROCESS" label="TỔNG HỢP HỒ SƠ" />
              </View>
              <Text style={styles.heroSubtitle}>
                Đang hiển thị {samples.length} mẫu và {reports.length} báo cáo. Kết luận của từng báo cáo được trình bày bên dưới.
              </Text>
            </View>
          </View>

          <View style={styles.heroDivider} />

          <View style={styles.statsRow}>
            <View style={styles.statItem}>
              <Text style={styles.statLabel}>Mẫu đã kiểm tra</Text>
              <Text style={styles.statValue}>{samples.length} mẫu</Text>
            </View>
            <View style={styles.statDivider} />
            <View style={styles.statItem}>
              <Text style={styles.statLabel}>Báo cáo phòng Lab</Text>
              <Text style={styles.statValue}>{reports.length} bản ghi</Text>
            </View>
            <View style={styles.statDivider} />
            <View style={styles.statItem}>
              <Text style={styles.statLabel}>Lệnh HOLD cách ly</Text>
              <Text
                style={[
                  styles.statValue,
                  { color: activeHoldsCount > 0 ? theme.colors.destructive : theme.colors.success },
                ]}
              >
                {activeHoldsCount} cảnh báo
              </Text>
            </View>
          </View>

          {/* Quick Action Buttons */}
          <View style={styles.actionButtonGroup}>
            <GlassButton
              title="Đăng ký mẫu mới"
              variant="primary"
              size="medium"
              icon={<PlusCircle size={16} color={theme.colors.surface} />}
              onPress={() => router.push('/lab-sample-form')}
              style={{ flex: 1 }}
            />
            <GlassButton
              title="Quản lý HOLD"
              variant="secondary"
              size="medium"
              icon={<AlertTriangle size={16} color={theme.colors.warning} />}
              onPress={() => router.push('/hold-management')}
              style={{ flex: 1 }}
            />
          </View>
        </GlassCard>

        {/* TAB 1: SAMPLES & SEAL CUSTODY */}
        {activeTab === 'samples' && (
          <View>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>Danh sách Mẫu Niêm chì & Bàn giao</Text>
              <Text style={styles.sectionCount}>{samples.length} mẫu</Text>
            </View>

            {samples.map((item) => (
              <GlassCard
                key={item.id}
                borderRadius={AppleGlass.radii.lg}
                style={styles.itemCard}
                interactive
              >
                <View style={styles.cardHeader}>
                  <View style={{ flex: 1 }}>
                    <View style={styles.badgeRow}>
                      <Text style={styles.sampleCode}>{item.sampleCode}</Text>
                      <GlassBadge status={item.status} />
                    </View>
                    <Text style={styles.sourceLot}>Lô nguồn: {item.sourceLotCode}</Text>
                  </View>
                </View>

                <View style={styles.sealBox}>
                  <View style={styles.sealRow}>
                    <Lock size={14} color={theme.colors.success} />
                    <Text style={styles.sealText}>Mã Niêm chì: {item.sealCode}</Text>
                  </View>
                  <Text style={styles.sealStatus}>Mã niêm chì theo hồ sơ lấy mẫu</Text>
                </View>

                <View style={styles.cardDetails}>
                  <Text style={styles.detailText}>
                    <Text style={styles.detailLabel}>Vật liệu: </Text>
                    {item.materialDescription || 'Chưa ghi nhận vật liệu'}
                  </Text>
                  <Text style={styles.detailText}>
                    <Text style={styles.detailLabel}>Địa điểm: </Text>
                    {item.collectionLocation || 'Chưa ghi nhận địa điểm'}
                  </Text>
                  <Text style={styles.detailText}>
                    <Text style={styles.detailLabel}>Thời gian: </Text>
                    {item.collectedAt}
                  </Text>
                </View>
              </GlassCard>
            ))}
          </View>
        )}

        {/* TAB 2: LAB REPORTS & MRL EVALUATION */}
        {activeTab === 'reports' && (
          <View>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>Kết quả Xét nghiệm Dư lượng Phòng Lab</Text>
              <Text style={styles.sectionCount}>{reports.length} báo cáo</Text>
            </View>

            {reports.map((report) => (
              <GlassCard
                key={report.id}
                borderRadius={AppleGlass.radii.lg}
                style={styles.itemCard}
              >
                <View style={styles.cardHeader}>
                  <View style={{ flex: 1 }}>
                    <View style={styles.badgeRow}>
                      <Text style={styles.sampleCode}>{report.reportNumber}</Text>
                      <GlassBadge
                        status={report.overallConclusion}
                        label={report.overallConclusion === 'PASS' ? 'ĐẠT CHUẨN' : 'VƯỢT NGƯỠNG'}
                      />
                    </View>
                    <Text style={styles.sourceLot}>Đơn vị kiểm nghiệm: {report.laboratoryName}</Text>
                  </View>
                </View>

                <View style={styles.standardTag}>
                  <FileText size={13} color={theme.colors.info} />
                  <Text style={styles.standardText}>Quy chuẩn: {report.statedStandard}</Text>
                </View>

                {/* Substance Analysis Table */}
                <View style={styles.substanceTable}>
                  <Text style={styles.tableHeader}>Chi tiết kiểm định dư lượng hoạt chất:</Text>

                  {report.results.map((sub, sIdx) => {
                    const ratio = sub.numericValue && sub.thresholdLimit ? (sub.numericValue / sub.thresholdLimit) * 100 : 0;
                    const isSafe = ratio <= 50;

                    return (
                      <View key={sIdx} style={styles.substanceRow}>
                        <View style={styles.substanceHeaderRow}>
                          <Text style={styles.substanceName}>{sub.testLabel}</Text>
                          <GlassBadge
                            status={sub.status}
                            label={sub.resultKind === 'NOT_DETECTED' ? 'Không phát hiện' : `${sub.numericValue} ${sub.unit}`}
                            size="small"
                          />
                        </View>

                        {/* Progress Gauge */}
                        <View style={styles.gaugeBackground}>
                          <View
                            style={[
                              styles.gaugeFill,
                              {
                                width: `${Math.min(ratio, 100)}%`,
                                backgroundColor: isSafe ? theme.colors.success : theme.colors.destructive,
                              },
                            ]}
                          />
                        </View>

                        <View style={styles.gaugeLabels}>
                          <Text style={styles.gaugeSubtext}>
                            Phát hiện: {sub.numericValue || 0} {sub.unit} (LOD: {sub.lod})
                          </Text>
                          <Text style={styles.gaugeSubtext}>Ngưỡng: {sub.thresholdLimit} {sub.unit}</Text>
                        </View>
                      </View>
                    );
                  })}
                </View>

                <View style={styles.reportFooter}>
                  <Text style={styles.footerDate}>Ngày phát hành: {report.issuedOn}</Text>
                  {!report.confirmed ? (
                    <GlassButton
                      title="Ký xác nhận báo cáo"
                      size="small"
                      variant="primary"
                      onPress={() => confirmReport(report.id)}
                    />
                  ) : (
                    <View style={styles.confirmedBadge}>
                      <CheckCircle2 size={13} color={theme.colors.success} />
                      <Text style={styles.confirmedText}>Đã đối soát & ký duyệt</Text>
                    </View>
                  )}
                </View>
              </GlassCard>
            ))}
          </View>
        )}

        {/* TAB 3: STANDARDS & MRL SAFETY MARGINS */}
        {activeTab === 'standards' && (
          <View>
            {activeRole && ['MILL_ADMIN', 'CUSTOMER_MANAGER', 'CUSTOMER_EXPORT_OFFICER'].includes(activeRole) ? <MrlVersionsPanel key={accountId ?? 'signed-out'} /> : null}
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>Ngưỡng Giới hạn Dư lượng (MRL Catalogs)</Text>
            </View>

            <GlassCard
              tintColor={theme.colors.surface}
              borderRadius={AppleGlass.radii.lg}
              style={{ marginBottom: spacing.md }}
            >
              <View style={styles.infoRow}>
                <Info size={16} color={theme.colors.info} />
                <Text style={styles.infoText}>
                  Các ngưỡng và biên an toàn được trình bày theo hồ sơ hiện có. Hãy đối chiếu phiên bản MRL áp dụng trước khi kết luận cho một lô hàng.
                </Text>
              </View>
            </GlassCard>

            {rules.map((rule) => (
              <GlassCard
                key={rule.id}
                borderRadius={AppleGlass.radii.lg}
                style={styles.itemCard}
              >
                <View style={styles.ruleTop}>
                  <View>
                    <Text style={styles.ruleName}>{rule.substanceName}</Text>
                    <Text style={styles.ruleCode}>Mã hoạt chất: {rule.substanceCode}</Text>
                  </View>
                  <View style={styles.marketBadge}>
                    <Text style={styles.marketText}>Thị trường: {rule.marketJurisdiction}</Text>
                  </View>
                </View>

                <View style={styles.ruleDivider} />

                <View style={styles.ruleStats}>
                  <View style={styles.ruleStatCol}>
                    <Text style={styles.ruleStatLabel}>Giới hạn pháp lý MRL</Text>
                    <Text style={styles.ruleStatVal}>{rule.mrlLimitMgKg} mg/kg</Text>
                  </View>
                  <View style={styles.ruleStatCol}>
                    <Text style={styles.ruleStatLabel}>Biên an toàn áp dụng</Text>
                    <Text style={[styles.ruleStatVal, { color: theme.colors.warning }]}>
                      -{rule.safetyMarginPercent}%
                    </Text>
                  </View>
                  <View style={styles.ruleStatCol}>
                    <Text style={styles.ruleStatLabel}>Ngưỡng chốt chặn</Text>
                    <Text style={[styles.ruleStatVal, { color: theme.colors.accent }]}>
                      {rule.effectiveThreshold} mg/kg
                    </Text>
                  </View>
                </View>
              </GlassCard>
            ))}
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const createStyles = (theme: AppTheme) => StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  tabBarContainer: {
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    backgroundColor: theme.colors.surface,
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    padding: spacing.lg,
    paddingBottom: spacing.huge,
  },
  heroCard: {
    marginBottom: spacing.lg,
  },
  heroTop: {
    flexDirection: 'row',
    gap: spacing.md,
    alignItems: 'flex-start',
  },
  heroIconBox: {
    width: 46,
    height: 46,
    borderRadius: AppleGlass.radii.md,
    backgroundColor: theme.colors.successMuted,
    alignItems: 'center',
    justifyContent: 'center',
  },
  heroRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.xs,
  },
  heroTitle: {
    ...theme.typography.subheadline,
    fontWeight: '800',
    color: theme.colors.label,
    flex: 1,
  },
  heroSubtitle: {
    ...theme.typography.caption,
    color: theme.colors.secondaryLabel,
    lineHeight: 17,
  },
  heroDivider: {
    height: 1,
    backgroundColor: theme.colors.accentMuted,
    marginVertical: spacing.md,
  },
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  statItem: {
    flex: 1,
    alignItems: 'center',
  },
  statDivider: {
    width: 1,
    height: 24,
    backgroundColor: theme.colors.separator,
  },
  statLabel: {
    ...theme.typography.caption,
    color: theme.colors.secondaryLabel,
    marginBottom: spacing.xxs,
    fontWeight: '500',
  },
  statValue: {
    ...theme.typography.subheadline,
    fontWeight: '800',
    color: theme.colors.label,
  },
  actionButtonGroup: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginTop: spacing.xs,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.sm,
    marginTop: spacing.xs,
  },
  sectionTitle: {
    ...theme.typography.subheadline,
    fontWeight: '800',
    color: theme.colors.label,
    letterSpacing: -0.2,
  },
  sectionCount: {
    ...theme.typography.caption,
    fontWeight: '600',
    color: theme.colors.secondaryLabel,
  },
  itemCard: {
    marginBottom: spacing.md,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  badgeRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.xs,
  },
  sampleCode: {
    ...theme.typography.callout,
    fontWeight: '800',
    color: theme.colors.label,
  },
  sourceLot: {
    ...theme.typography.caption,
    fontWeight: '600',
    color: theme.colors.secondaryLabel,
  },
  sealBox: {
    backgroundColor: theme.colors.successMuted,
    padding: spacing.sm,
    borderRadius: AppleGlass.radii.sm,
    marginTop: spacing.sm,
    borderWidth: 1,
    borderColor: theme.colors.successMuted,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  sealRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  sealText: {
    ...theme.typography.caption,
    fontWeight: '700',
    color: theme.colors.success,
  },
  sealStatus: {
    ...theme.typography.caption,
    color: theme.colors.success,
    fontWeight: '500',
  },
  cardDetails: {
    marginTop: spacing.sm,
    gap: spacing.xs,
  },
  detailText: {
    ...theme.typography.caption,
    color: theme.colors.label,
  },
  detailLabel: {
    fontWeight: '600',
    color: theme.colors.secondaryLabel,
  },
  standardTag: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    backgroundColor: theme.colors.infoMuted,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: radii.xs,
    alignSelf: 'flex-start',
    marginTop: spacing.xs,
    marginBottom: spacing.sm,
  },
  standardText: {
    ...theme.typography.caption,
    fontWeight: '600',
    color: theme.colors.info,
  },
  substanceTable: {
    backgroundColor: theme.colors.surfaceSecondary,
    borderRadius: AppleGlass.radii.md,
    padding: spacing.sm,
    gap: spacing.sm,
  },
  tableHeader: {
    ...theme.typography.caption,
    fontWeight: '700',
    color: theme.colors.secondaryLabel,
    textTransform: 'uppercase',
    letterSpacing: 0.3,
  },
  substanceRow: {
    backgroundColor: theme.colors.surface,
    padding: spacing.sm,
    borderRadius: radii.xs,
    borderWidth: 1,
    borderColor: theme.colors.separator,
  },
  substanceHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.xs,
  },
  substanceName: {
    ...theme.typography.footnote,
    fontWeight: '700',
    color: theme.colors.label,
  },
  gaugeBackground: {
    height: 6,
    backgroundColor: theme.colors.separator,
    borderRadius: radii.xs,
    overflow: 'hidden',
    marginBottom: spacing.xs,
  },
  gaugeFill: {
    height: '100%',
    borderRadius: radii.xs,
  },
  gaugeLabels: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  gaugeSubtext: {
    ...theme.typography.caption,
    color: theme.colors.secondaryLabel,
  },
  reportFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: spacing.md,
    paddingTop: spacing.sm,
    borderTopWidth: 1,
    borderTopColor: theme.colors.separator,
  },
  footerDate: {
    ...theme.typography.caption,
    color: theme.colors.secondaryLabel,
  },
  confirmedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  confirmedText: {
    ...theme.typography.caption,
    fontWeight: '600',
    color: theme.colors.success,
  },
  infoRow: {
    flexDirection: 'row',
    gap: spacing.sm,
    alignItems: 'center',
  },
  infoText: {
    ...theme.typography.caption,
    color: theme.colors.info,
    flex: 1,
    lineHeight: 16,
  },
  ruleTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  ruleName: {
    ...theme.typography.subheadline,
    fontWeight: '800',
    color: theme.colors.label,
  },
  ruleCode: {
    ...theme.typography.caption,
    color: theme.colors.secondaryLabel,
    marginTop: spacing.xxs,
  },
  marketBadge: {
    backgroundColor: theme.colors.warningMuted,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xxs,
    borderRadius: radii.xs,
  },
  marketText: {
    ...theme.typography.caption,
    fontWeight: '700',
    color: theme.colors.warning,
  },
  ruleDivider: {
    height: 1,
    backgroundColor: theme.colors.separator,
    marginVertical: spacing.sm,
  },
  ruleStats: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  ruleStatCol: {
    flex: 1,
  },
  ruleStatLabel: {
    ...theme.typography.caption,
    color: theme.colors.secondaryLabel,
    marginBottom: spacing.xxs,
  },
  ruleStatVal: {
    ...theme.typography.footnote,
    fontWeight: '700',
    color: theme.colors.label,
  },
});
