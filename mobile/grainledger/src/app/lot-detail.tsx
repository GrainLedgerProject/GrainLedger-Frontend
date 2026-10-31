import { radii, spacing } from '../theme/tokens';
import { SafeAreaView } from 'react-native-safe-area-context';
import React, { useMemo } from 'react';
import { useAppTheme, type AppTheme } from '../theme';

import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { Card } from '../components/common/Card';
import { StatusBadge } from '../components/common/StatusBadge';
import { useMillStore } from '../store/millStore';
import { formatMass } from '../utils/decimalMass';
import {
  ArrowLeft,
  ShieldCheck,
  CheckCircle2,
  Share2,
} from '../components/ui/named-icons';

export default function LotDetailScreen() {
  const theme = useAppTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);
  const router = useRouter();
  const params = useLocalSearchParams<{ code?: string }>();
  const { traceLots, getLotByCode } = useMillStore();

  const lot = (params.code ? getLotByCode(params.code) : null) || traceLots[0];

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.header}>
        <TouchableOpacity accessibilityRole="button" accessibilityLabel="Quay lại" style={styles.backBtn} onPress={() => router.back()}>
          <ArrowLeft size={20} color={theme.colors.label} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Chi Tiết Lô Hàng & Truy Xuất</Text>
        <TouchableOpacity style={styles.backBtn} onPress={() => {}}>
          <Share2 size={18} color={theme.colors.label} />
        </TouchableOpacity>
      </View>

      <ScrollView keyboardShouldPersistTaps="handled" automaticallyAdjustKeyboardInsets
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Hero Card */}
        <Card style={styles.heroCard}>
          <View style={styles.heroTop}>
            <View style={{ flex: 1 }}>
              <Text style={styles.heroCode}>{lot.lotCode}</Text>
              <Text style={styles.heroTitle}>{lot.productType}</Text>
            </View>
            <StatusBadge status={lot.status} size="medium" />
          </View>

          <View style={styles.divider} />

          <View style={styles.statsRow}>
            <View style={styles.statCol}>
              <Text style={styles.statLabel}>Khối lượng hiện tại</Text>
              <Text style={styles.statVal}>{formatMass(lot.currentMassKg, 0)} kg</Text>
            </View>
            <View style={styles.statCol}>
              <Text style={styles.statLabel}>Độ thuần hạt</Text>
              <Text style={[styles.statVal, { color: theme.colors.accent }]}>{lot.purityScore}%</Text>
            </View>
            <View style={styles.statCol}>
              <Text style={styles.statLabel}>Cơ sở chế biến</Text>
              <Text style={styles.statVal}>{lot.facilityName}</Text>
            </View>
          </View>
        </Card>

        {/* MRL Compliance Status */}
        <Card style={styles.mrlCard}>
          <View style={styles.mrlHeader}>
            <ShieldCheck size={22} color={theme.colors.success} />
            <Text style={styles.mrlTitle}>Đạt tiêu chuẩn dư lượng MRL Xuất Khẩu</Text>
          </View>
          <Text style={styles.mrlDesc}>
            Phân tích bởi Phòng Thí Nghiệm Quatest 3. Không phát hiện dư lượng hoạt chất
            Tricyclazole, Azoxystrobin nằm dưới ngưỡng an toàn theo quy chuẩn EU 396/2005.
          </Text>
        </Card>

        {/* Farmer Origins */}
        <View style={styles.sectionHeaderRow}>
          <Text style={styles.sectionTitle}>Tỷ lệ đóng góp nguồn gốc</Text>
        </View>

        {lot.farmerOrigins.map((origin, idx) => (
          <Card key={idx} style={styles.originCard}>
            <View style={styles.originHeader}>
              <View>
                <Text style={styles.originName}>{origin.farmerName}</Text>
                <Text style={styles.originCode}>
                  Mã nông hộ: {origin.farmerCode} • Thửa: {origin.plotCode}
                </Text>
              </View>
              <View style={styles.percentBadge}>
                <Text style={styles.percentText}>{origin.percentage}%</Text>
              </View>
            </View>
            <Text style={styles.originSub}>
              Giống: {origin.variety} • Thu hoạch: {origin.harvestDate}
            </Text>
          </Card>
        ))}

        {/* Full Timeline */}
        <View style={styles.sectionHeaderRow}>
          <Text style={styles.sectionTitle}>Nhật ký hành trình chế biến</Text>
        </View>

        <Card style={styles.timelineCard}>
          {lot.history.map((h, i) => (
            <View key={i} style={styles.timelineRow}>
              <View style={styles.dot}>
                <CheckCircle2 size={12} color={theme.colors.surface} />
              </View>
              <View style={{ flex: 1 }}>
                <View style={styles.timelineHeader}>
                  <Text style={styles.timelineStage}>{h.stage}</Text>
                  <Text style={styles.timelineTime}>{h.timestamp}</Text>
                </View>
                <Text style={styles.timelineOperator}>{h.operator}</Text>
                <Text style={styles.timelineDetail}>{h.detail}</Text>
              </View>
            </View>
          ))}
        </Card>
      </ScrollView>
    </SafeAreaView>
  );
}

const createStyles = (theme: AppTheme) => StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    backgroundColor: theme.colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.separator,
  },
  backBtn: {
    width: 48,
    height: 48,
    borderRadius: radii.md,
    backgroundColor: theme.colors.surfaceSecondary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    ...theme.typography.callout,
    fontWeight: '800',
    color: theme.colors.label,
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    padding: spacing.lg,
    paddingBottom: spacing.xxl,
  },
  heroCard: {
    marginBottom: spacing.md,
  },
  heroTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  heroCode: {
    ...theme.typography.callout,
    fontWeight: '800',
    color: theme.colors.label,
  },
  heroTitle: {
    ...theme.typography.footnote,
    color: theme.colors.secondaryLabel,
    marginTop: spacing.xxs,
  },
  divider: {
    height: 1,
    backgroundColor: theme.colors.separator,
    marginVertical: spacing.md,
  },
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  statCol: {
    flex: 1,
  },
  statLabel: {
    ...theme.typography.caption,
    color: theme.colors.tertiaryLabel,
    marginBottom: spacing.xxs,
  },
  statVal: {
    ...theme.typography.footnote,
    fontWeight: '700',
    color: theme.colors.label,
  },
  mrlCard: {
    backgroundColor: theme.colors.successMuted,
    borderColor: theme.colors.successMuted,
    marginBottom: spacing.lg,
  },
  mrlHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginBottom: spacing.xs,
  },
  mrlTitle: {
    ...theme.typography.subheadline,
    fontWeight: '800',
    color: theme.colors.success,
  },
  mrlDesc: {
    ...theme.typography.caption,
    color: theme.colors.success,
    lineHeight: 16,
  },
  sectionHeaderRow: {
    marginBottom: spacing.sm,
    marginTop: spacing.xs,
  },
  sectionTitle: {
    ...theme.typography.subheadline,
    fontWeight: '800',
    color: theme.colors.label,
  },
  originCard: {
    marginBottom: spacing.sm,
  },
  originHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  originName: {
    ...theme.typography.subheadline,
    fontWeight: '700',
    color: theme.colors.label,
  },
  originCode: {
    ...theme.typography.caption,
    color: theme.colors.secondaryLabel,
    marginTop: spacing.xxs,
  },
  percentBadge: {
    backgroundColor: theme.colors.accentMuted,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: radii.xs,
  },
  percentText: {
    ...theme.typography.footnote,
    fontWeight: '800',
    color: theme.colors.accent,
  },
  originSub: {
    ...theme.typography.caption,
    color: theme.colors.tertiaryLabel,
    marginTop: spacing.xs,
  },
  timelineCard: {
    padding: spacing.lg,
  },
  timelineRow: {
    flexDirection: 'row',
    gap: spacing.md,
    marginBottom: spacing.md,
  },
  dot: {
    width: 18,
    height: 18,
    borderRadius: radii.xs,
    backgroundColor: theme.colors.accent,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: spacing.xxs,
  },
  timelineHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  timelineStage: {
    ...theme.typography.footnote,
    fontWeight: '700',
    color: theme.colors.label,
  },
  timelineTime: {
    ...theme.typography.caption,
    color: theme.colors.tertiaryLabel,
  },
  timelineOperator: {
    ...theme.typography.caption,
    color: theme.colors.accent,
    fontWeight: '600',
    marginTop: spacing.zero,
  },
  timelineDetail: {
    ...theme.typography.caption,
    color: theme.colors.secondaryLabel,
    marginTop: spacing.xxs,
    lineHeight: 16,
  },
});
