import React, { useState } from 'react';
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
import { GlassCard } from '../../components/common/GlassCard';
import { GlassButton } from '../../components/common/GlassButton';
import { GlassBadge } from '../../components/common/GlassBadge';
import { GlassSegmentedControl } from '../../components/common/GlassSegmentedControl';
import { useComplianceStore } from '../../store/complianceStore';
import { useRiskStore } from '../../store/riskStore';
import { AppleGlass } from '../../theme/appleGlass';
import { useAppTheme } from '../../theme';
import {
  ShieldCheck,
  AlertTriangle,
  PlusCircle,
  FileText,
  CheckCircle2,
  Lock,
  Info,
} from 'lucide-react-native';

export default function ComplianceScreen() {
  const router = useRouter();
  const theme = useAppTheme();
  const { samples, reports, rules, isLoading, fetchComplianceData, confirmReport } = useComplianceStore();
  const { holds } = useRiskStore();
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
            { id: 'samples', label: 'Mẫu Lab & Niêm chì', count: samples.length },
            { id: 'reports', label: 'Báo cáo MRL', count: reports.length },
            { id: 'standards', label: 'Chuẩn Xuất khẩu' },
          ]}
          activeId={activeTab}
          onSelect={(id) => setActiveTab(id as 'samples' | 'reports' | 'standards')}
        />
      </View>

      <ScrollView
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
          tintColor="rgba(240, 253, 244, 0.88)"
          borderTint="rgba(52, 199, 89, 0.35)"
          borderRadius={AppleGlass.radii.xl}
          elevated
          style={styles.heroCard}
        >
          <View style={styles.heroTop}>
            <View style={styles.heroIconBox}>
              <ShieldCheck size={28} color="#166534" />
            </View>
            <View style={{ flex: 1 }}>
              <View style={styles.heroRow}>
                <Text style={styles.heroTitle}>Trạng thái Tuân thủ Toàn diện</Text>
                <GlassBadge status="PASS" label="ĐẠT CHUẨN EU/US" />
              </View>
              <Text style={styles.heroSubtitle}>
                Tất cả 12 lô hàng xuất khẩu mục tiêu đều đạt ngưỡng an toàn dư lượng theo Quy định EU 396/2005.
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
                  { color: activeHoldsCount > 0 ? AppleGlass.colors.systemRed : AppleGlass.colors.systemGreen },
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
              icon={<PlusCircle size={16} color="#FFFFFF" />}
              onPress={() => router.push('/lab-sample-form')}
              style={{ flex: 1 }}
            />
            <GlassButton
              title="Quản lý HOLD"
              variant="secondary"
              size="medium"
              icon={<AlertTriangle size={16} color={AppleGlass.colors.systemOrange} />}
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
                    <Lock size={14} color="#047857" />
                    <Text style={styles.sealText}>Mã Niêm chì: {item.sealCode}</Text>
                  </View>
                  <Text style={styles.sealStatus}>Niêm phong nguyên vẹn (Intact)</Text>
                </View>

                <View style={styles.cardDetails}>
                  <Text style={styles.detailText}>
                    <Text style={styles.detailLabel}>Vật liệu: </Text>
                    {item.materialDescription || 'Lúa tươi thu mua'}
                  </Text>
                  <Text style={styles.detailText}>
                    <Text style={styles.detailLabel}>Địa điểm: </Text>
                    {item.collectionLocation || 'Trạm thu mua Cái Bè'}
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
                  <FileText size={13} color="#2563EB" />
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
                                backgroundColor: isSafe ? '#10B981' : '#EF4444',
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
                      <CheckCircle2 size={13} color="#059669" />
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
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>Ngưỡng Giới hạn Dư lượng (MRL Catalogs)</Text>
            </View>

            <GlassCard
              tintColor="rgba(248, 250, 252, 0.85)"
              borderRadius={AppleGlass.radii.lg}
              style={{ marginBottom: 12 }}
            >
              <View style={styles.infoRow}>
                <Info size={16} color="#0284C7" />
                <Text style={styles.infoText}>
                  Hệ thống tự động áp dụng Biên an toàn 10% - 15% để bảo đảm hàng hoá không bị từ chối tại cảng biển quốc tế.
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
                    <Text style={[styles.ruleStatVal, { color: AppleGlass.colors.systemOrange }]}>
                      -{rule.safetyMarginPercent}%
                    </Text>
                  </View>
                  <View style={styles.ruleStatCol}>
                    <Text style={styles.ruleStatLabel}>Ngưỡng chốt chặn</Text>
                    <Text style={[styles.ruleStatVal, { color: AppleGlass.colors.brandGreen }]}>
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

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: AppleGlass.colors.systemBackground,
  },
  tabBarContainer: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    backgroundColor: 'rgba(255, 255, 255, 0.4)',
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 120,
  },
  heroCard: {
    marginBottom: 16,
  },
  heroTop: {
    flexDirection: 'row',
    gap: 12,
    alignItems: 'flex-start',
  },
  heroIconBox: {
    width: 46,
    height: 46,
    borderRadius: AppleGlass.radii.md,
    backgroundColor: '#DCFCE7',
    alignItems: 'center',
    justifyContent: 'center',
  },
  heroRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  heroTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: '#0F172A',
    flex: 1,
  },
  heroSubtitle: {
    fontSize: 12,
    color: '#475569',
    lineHeight: 17,
  },
  heroDivider: {
    height: 1,
    backgroundColor: 'rgba(52, 199, 89, 0.2)',
    marginVertical: 12,
  },
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 14,
  },
  statItem: {
    flex: 1,
    alignItems: 'center',
  },
  statDivider: {
    width: 1,
    height: 24,
    backgroundColor: 'rgba(226, 232, 240, 0.8)',
  },
  statLabel: {
    fontSize: 11,
    color: '#64748B',
    marginBottom: 2,
    fontWeight: '500',
  },
  statValue: {
    fontSize: 14,
    fontWeight: '800',
    color: '#0F172A',
  },
  actionButtonGroup: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 4,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
    marginTop: 4,
  },
  sectionTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: '#0F172A',
    letterSpacing: -0.2,
  },
  sectionCount: {
    fontSize: 12,
    fontWeight: '600',
    color: '#64748B',
  },
  itemCard: {
    marginBottom: 12,
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
    marginBottom: 4,
  },
  sampleCode: {
    fontSize: 16,
    fontWeight: '800',
    color: '#0F172A',
  },
  sourceLot: {
    fontSize: 12,
    fontWeight: '600',
    color: '#475569',
  },
  sealBox: {
    backgroundColor: '#ECFDF5',
    padding: 10,
    borderRadius: AppleGlass.radii.sm,
    marginTop: 10,
    borderWidth: 1,
    borderColor: '#A7F3D0',
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  sealRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  sealText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#065F46',
  },
  sealStatus: {
    fontSize: 11,
    color: '#047857',
    fontWeight: '500',
  },
  cardDetails: {
    marginTop: 10,
    gap: 4,
  },
  detailText: {
    fontSize: 12,
    color: '#334155',
  },
  detailLabel: {
    fontWeight: '600',
    color: '#64748B',
  },
  standardTag: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#EFF6FF',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    alignSelf: 'flex-start',
    marginTop: 6,
    marginBottom: 10,
  },
  standardText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#1D4ED8',
  },
  substanceTable: {
    backgroundColor: 'rgba(241, 245, 249, 0.6)',
    borderRadius: AppleGlass.radii.md,
    padding: 10,
    gap: 8,
  },
  tableHeader: {
    fontSize: 11,
    fontWeight: '700',
    color: '#475569',
    textTransform: 'uppercase',
    letterSpacing: 0.3,
  },
  substanceRow: {
    backgroundColor: '#FFFFFF',
    padding: 8,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: 'rgba(226, 232, 240, 0.7)',
  },
  substanceHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  substanceName: {
    fontSize: 13,
    fontWeight: '700',
    color: '#0F172A',
  },
  gaugeBackground: {
    height: 6,
    backgroundColor: '#E2E8F0',
    borderRadius: 3,
    overflow: 'hidden',
    marginBottom: 4,
  },
  gaugeFill: {
    height: '100%',
    borderRadius: 3,
  },
  gaugeLabels: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  gaugeSubtext: {
    fontSize: 10,
    color: '#64748B',
  },
  reportFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 12,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: 'rgba(226, 232, 240, 0.7)',
  },
  footerDate: {
    fontSize: 11,
    color: '#64748B',
  },
  confirmedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  confirmedText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#059669',
  },
  infoRow: {
    flexDirection: 'row',
    gap: 8,
    alignItems: 'center',
  },
  infoText: {
    fontSize: 12,
    color: '#0369A1',
    flex: 1,
    lineHeight: 16,
  },
  ruleTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  ruleName: {
    fontSize: 15,
    fontWeight: '800',
    color: '#0F172A',
  },
  ruleCode: {
    fontSize: 12,
    color: '#64748B',
    marginTop: 2,
  },
  marketBadge: {
    backgroundColor: '#FEF3C7',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  marketText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#B45309',
  },
  ruleDivider: {
    height: 1,
    backgroundColor: 'rgba(226, 232, 240, 0.8)',
    marginVertical: 10,
  },
  ruleStats: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  ruleStatCol: {
    flex: 1,
  },
  ruleStatLabel: {
    fontSize: 10,
    color: '#64748B',
    marginBottom: 2,
  },
  ruleStatVal: {
    fontSize: 13,
    fontWeight: '700',
    color: '#0F172A',
  },
});
