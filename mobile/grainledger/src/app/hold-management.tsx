import { spacing } from '../theme/tokens';
import { SafeAreaView } from 'react-native-safe-area-context';
import React, { useMemo , useState } from 'react';
import { useAppTheme, type AppTheme } from '../theme';

import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
} from 'react-native';
import { GlassHeader } from '../components/common/GlassHeader';
import { GlassCard } from '../components/common/GlassCard';
import { GlassInput } from '../components/common/GlassInput';
import { GlassButton } from '../components/common/GlassButton';
import { GlassBadge } from '../components/common/GlassBadge';
import { GlassSegmentedControl } from '../components/common/GlassSegmentedControl';
import { useRiskStore } from '../store/riskStore';
import { useMillStore } from '../store/millStore';
import { AppleGlass } from '../theme/appleGlass';
import {
  AlertOctagon,
  CheckCircle,
  FileText,
} from '../components/ui/named-icons';

type HoldReasonCategory =
  | 'MRL_EXCEEDANCE'
  | 'MOISTURE_DEVIATION'
  | 'PHYSICAL_DEFECT'
  | 'AUDIT_SUSPICION';

const HOLD_REASONS: { id: HoldReasonCategory; label: string; defaultDesc: string }[] = [
  { id: 'MRL_EXCEEDANCE', label: 'Dư lượng MRL vượt ngưỡng', defaultDesc: 'Hoạt chất bảo vệ thực vật vượt mức giới hạn cho phép của thị trường nhập khẩu.' },
  { id: 'MOISTURE_DEVIATION', label: 'Sai lệch Độ ẩm', defaultDesc: 'Độ ẩm đo được sai lệch so với ngưỡng tiếp nhận quy định của nhà máy.' },
  { id: 'PHYSICAL_DEFECT', label: 'Hạt hư hỏng / Tạp chất cao', defaultDesc: 'Tỷ lệ tấm, hạt bạc phấn hoặc hạt vàng vượt quá chỉ tiêu hợp đồng.' },
  { id: 'AUDIT_SUSPICION', label: 'Nghi ngờ gian lận sổ cái', defaultDesc: 'Không chứng minh được chuỗi cung ứng hoặc số liệu cân xe không khớp.' },
];

export default function HoldManagementScreen() {
  const theme = useAppTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);
  const { holds, issueHold, respondToHold } = useRiskStore();
  const { traceLots } = useMillStore();

  const [activeTab, setActiveTab] = useState<'active' | 'history' | 'create'>('active');

  // Create HOLD form state
  const [targetLotId, setTargetLotId] = useState(traceLots[0]?.id || 'lot-raw-01');
  const [reasonCategory, setReasonCategory] = useState(HOLD_REASONS[0].id);
  const [customReason, setCustomReason] = useState(HOLD_REASONS[0].defaultDesc);
  const [evidenceRef, setEvidenceRef] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Selected lot object
  const selectedLot = traceLots.find((l) => l.id === targetLotId) || traceLots[0];

  const activeHolds = holds.filter((h) => h.status === 'ACTIVE_HOLD');
  const resolvedHolds = holds.filter((h) => h.status !== 'ACTIVE_HOLD');

  const handleIssueHold = async () => {
    if (!customReason.trim()) {
      Alert.alert('Thiếu thông tin', 'Vui lòng nhập lý do ban hành lệnh cách ly.');
      return;
    }

    setIsSubmitting(true);
    try {
      await issueHold({
        targetType: 'LOT',
        targetId: targetLotId,
        targetCode: selectedLot?.lotCode || 'RAW-LOT-01',
        reason: customReason.trim(),
        reasonCategory,
        evidenceReference: evidenceRef.trim() || undefined,
        issuedBy: 'Nguyễn Văn Quản Lý (Giám đốc Tuân thủ)',
      });

      Alert.alert('Thành công', `Đã ban hành lệnh cách ly HOLD cho lô ${selectedLot?.lotCode}.`, [
        { text: 'Đóng', onPress: () => setActiveTab('active') },
      ]);
    } catch {
      Alert.alert('Thông báo', 'Đã lưu lệnh HOLD ngoại tuyến.');
      setActiveTab('active');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleResolveHold = (holdId: string, lotCode: string) => {
    Alert.alert(
      'Xử lý Lệnh HOLD',
      `Chọn hướng xử lý cho ${lotCode}:`,
      [
        {
          text: 'Giải phóng (Release)',
          onPress: async () => {
            await respondToHold(holdId, 'RELEASE', 'Đã tái kiểm nghiệm đạt chuẩn quy định.');
            Alert.alert('Đã giải phóng', `Lô hàng ${lotCode} đã trở về trạng thái Khả dụng.`);
          },
        },
        {
          text: 'Hạ cấp / Chuyển mục đích',
          onPress: async () => {
            await respondToHold(holdId, 'CONDITIONAL_RELEASE', 'Chuyển làm thức ăn chăn nuôi / chế biến phụ.');
            Alert.alert('Đã xử lý', 'Đã chuyển trạng thái có điều kiện.');
          },
        },
        {
          text: 'Huỷ bỏ (Destroy)',
          style: 'destructive',
          onPress: async () => {
            await respondToHold(holdId, 'DESTROY', 'Tiêu huỷ lô hàng do không đạt chuẩn vệ sinh an toàn.');
            Alert.alert('Đã huỷ', 'Đã ghi nhận tiêu huỷ vào sổ cái.');
          },
        },
        { text: 'Đóng', style: 'cancel' },
      ]
    );
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <GlassHeader
        title="Quản trị Rủi ro & HOLD"
        subtitle="Quản lý cách ly lô hàng & ngăn ngừa rủi ro nhiễm bẩn"
        showBack
      />

      <View style={styles.tabBarContainer}>
        <GlassSegmentedControl
          segments={[
            { id: 'active', label: 'Đang Cách ly', count: activeHolds.length },
            { id: 'history', label: 'Lịch sử Xử lý', count: resolvedHolds.length },
            { id: 'create', label: '+ Tạo Lệnh' },
          ]}
          activeId={activeTab}
          onSelect={(id) => setActiveTab(id as 'active' | 'history' | 'create')}
        />
      </View>

      <ScrollView keyboardShouldPersistTaps="handled" automaticallyAdjustKeyboardInsets
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* TAB 1: ACTIVE HOLDS */}
        {activeTab === 'active' && (
          <View>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>Lô hàng Đang bị Khóa Cách ly (HOLD)</Text>
              <Text style={styles.sectionCount}>{activeHolds.length} lệnh</Text>
            </View>

            {activeHolds.length === 0 ? (
              <GlassCard style={styles.emptyCard}>
                <CheckCircle size={36} color={theme.colors.success} />
                <Text style={styles.emptyTitle}>Không có Lô hàng Bị Cách ly</Text>
                <Text style={styles.emptySub}>
                  Tất cả các lô hàng tại nhà máy đều đạt tiêu chuẩn an toàn thực phẩm.
                </Text>
              </GlassCard>
            ) : (
              activeHolds.map((hold) => (
                <GlassCard
                  key={hold.id}
                  tintColor={theme.colors.surface}
                  borderTint={theme.colors.separator}
                  borderRadius={AppleGlass.radii.lg}
                  elevated
                  style={styles.itemCard}
                >
                  <View style={styles.cardHeader}>
                    <View style={styles.headerLeft}>
                      <AlertOctagon size={22} color={theme.colors.destructive} />
                      <View>
                        <Text style={styles.targetCode}>{hold.targetCode}</Text>
                        <Text style={styles.categoryText}>
                          {HOLD_REASONS.find((r) => r.id === hold.reasonCategory)?.label || hold.reasonCategory}
                        </Text>
                      </View>
                    </View>
                    <GlassBadge status="HOLD" label="ĐANG CÁCH LY" />
                  </View>

                  <View style={styles.reasonBox}>
                    <Text style={styles.reasonText}>{hold.reason}</Text>
                  </View>

                  <View style={styles.metaRow}>
                    <View style={styles.metaCol}>
                      <Text style={styles.metaLabel}>Người ban hành:</Text>
                      <Text style={styles.metaVal}>{hold.issuedBy}</Text>
                    </View>
                    <View style={styles.metaCol}>
                      <Text style={styles.metaLabel}>Thời gian:</Text>
                      <Text style={styles.metaVal}>{hold.issuedAt}</Text>
                    </View>
                  </View>

                  {hold.evidenceReference ? (
                    <View style={styles.evidenceRow}>
                      <FileText size={12} color={theme.colors.secondaryLabel} />
                      <Text style={styles.evidenceText}>Bằng chứng: {hold.evidenceReference}</Text>
                    </View>
                  ) : null}

                  <View style={styles.cardActions}>
                    <GlassButton
                      title="Quyết định Xử lý / Giải phóng"
                      variant="primary"
                      size="medium"
                      onPress={() => handleResolveHold(hold.id, hold.targetCode)}
                      fullWidth
                    />
                  </View>
                </GlassCard>
              ))
            )}
          </View>
        )}

        {/* TAB 2: RESOLVED / HISTORY */}
        {activeTab === 'history' && (
          <View>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>Lịch sử Giải phóng & Xử lý HOLD</Text>
              <Text style={styles.sectionCount}>{resolvedHolds.length} bản ghi</Text>
            </View>

            {resolvedHolds.map((hold) => (
              <GlassCard
                key={hold.id}
                tintColor={theme.colors.surface}
                borderTint={theme.colors.separator}
                borderRadius={AppleGlass.radii.lg}
                style={styles.itemCard}
              >
                <View style={styles.cardHeader}>
                  <View style={styles.headerLeft}>
                    <CheckCircle size={20} color={theme.colors.success} />
                    <View>
                      <Text style={styles.targetCode}>{hold.targetCode}</Text>
                      <Text style={styles.categoryText}>{hold.reasonCategory}</Text>
                    </View>
                  </View>
                  <GlassBadge status="COMMITTED" label="ĐÃ GIẢI PHÓNG" />
                </View>

                <View style={styles.resolvedBox}>
                  <Text style={styles.resolvedLabel}>Kết luận xử lý:</Text>
                  <Text style={styles.resolvedNotes}>{hold.resolutionNotes || 'Đã giải quyết theo quy trình kiểm định lại.'}</Text>
                </View>

                <View style={styles.metaRow}>
                  <Text style={styles.metaVal}>Duyệt bởi: {hold.resolvedBy || 'Quản đốc'}</Text>
                  <Text style={styles.metaVal}>{hold.resolvedAt}</Text>
                </View>
              </GlassCard>
            ))}
          </View>
        )}

        {/* TAB 3: CREATE NEW HOLD COMMAND */}
        {activeTab === 'create' && (
          <View>
            <GlassCard
              tintColor={theme.colors.surface}
              borderRadius={AppleGlass.radii.lg}
              style={styles.formCard}
            >
              <Text style={styles.sectionHeading}>1. Chọn Lô Hàng / Silo Cần Khóa Cách Ly</Text>

              <View style={styles.lotList}>
                {traceLots.map((lot) => {
                  const isSelected = lot.id === targetLotId;
                  return (
                    <TouchableOpacity
                      key={lot.id}
                      style={[styles.lotOption, isSelected && styles.lotOptionSelected]}
                      onPress={() => setTargetLotId(lot.id)}
                    >
                      <View style={{ flex: 1 }}>
                        <Text style={[styles.lotCode, isSelected && styles.lotCodeSelected]}>
                          {lot.lotCode}
                        </Text>
                        <Text style={styles.lotDesc}>{lot.productType} ({lot.currentMassKg} kg)</Text>
                      </View>
                      <GlassBadge status={lot.status} size="small" />
                    </TouchableOpacity>
                  );
                })}
              </View>

              <View style={styles.divider} />

              <Text style={styles.sectionHeading}>2. Phân loại Lý do Cách ly</Text>
              <View style={styles.reasonList}>
                {HOLD_REASONS.map((r) => {
                  const isSelected = r.id === reasonCategory;
                  return (
                    <TouchableOpacity
                      key={r.id}
                      style={[styles.reasonOption, isSelected && styles.reasonOptionSelected]}
                      onPress={() => {
                        setReasonCategory(r.id);
                        setCustomReason(r.defaultDesc);
                      }}
                    >
                      <Text style={[styles.reasonTitle, isSelected && styles.reasonTitleSelected]}>
                        {r.label}
                      </Text>
                      <Text style={styles.reasonSub}>{r.defaultDesc}</Text>
                    </TouchableOpacity>
                  );
                })}
              </View>

              <View style={styles.divider} />

              <Text style={styles.sectionHeading}>3. Chi tiết & Bằng chứng Hồ sơ</Text>

              <GlassInput
                label="Lý do chi tiết ban hành lệnh *"
                value={customReason}
                onChangeText={setCustomReason}
                multiline
                numberOfLines={3}
                style={{ height: 70, textAlignVertical: 'top' }}
              />

              <GlassInput
                label="Mã số Bằng chứng / Phiếu kiểm nghiệm"
                value={evidenceRef}
                onChangeText={setEvidenceRef}
                placeholder="VD: LAB-REP-26019 hoặc PHIEU-CAN-88"
                leftIcon={<FileText size={18} color={theme.colors.secondaryLabel} />}
              />

              <GlassButton
                title="Ban hành Lệnh HOLD Cách ly"
                variant="danger"
                size="large"
                loading={isSubmitting}
                onPress={handleIssueHold}
                fullWidth
                style={{ marginTop: spacing.md }}
              />
            </GlassCard>
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
    paddingBottom: spacing.xxl,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  sectionTitle: {
    ...theme.typography.subheadline,
    fontWeight: '800',
    color: theme.colors.label,
  },
  sectionCount: {
    ...theme.typography.caption,
    fontWeight: '600',
    color: theme.colors.secondaryLabel,
  },
  emptyCard: {
    padding: spacing.xxl,
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    marginTop: spacing.lg,
  },
  emptyTitle: {
    ...theme.typography.callout,
    fontWeight: '800',
    color: theme.colors.label,
  },
  emptySub: {
    ...theme.typography.footnote,
    color: theme.colors.secondaryLabel,
    textAlign: 'center',
    lineHeight: 18,
  },
  itemCard: {
    marginBottom: spacing.md,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    flex: 1,
  },
  targetCode: {
    ...theme.typography.callout,
    fontWeight: '800',
    color: theme.colors.label,
  },
  categoryText: {
    ...theme.typography.caption,
    color: theme.colors.secondaryLabel,
    marginTop: spacing.zero,
  },
  reasonBox: {
    backgroundColor: theme.colors.surfaceSecondary,
    padding: spacing.sm,
    borderRadius: AppleGlass.radii.sm,
    marginTop: spacing.sm,
    borderLeftWidth: 3,
    borderLeftColor: theme.colors.destructive,
  },
  reasonText: {
    ...theme.typography.footnote,
    color: theme.colors.destructive,
    lineHeight: 18,
    fontWeight: '500',
  },
  resolvedBox: {
    backgroundColor: theme.colors.successMuted,
    padding: spacing.sm,
    borderRadius: AppleGlass.radii.sm,
    marginTop: spacing.sm,
  },
  resolvedLabel: {
    ...theme.typography.caption,
    fontWeight: '700',
    color: theme.colors.success,
    marginBottom: spacing.xxs,
  },
  resolvedNotes: {
    ...theme.typography.caption,
    color: theme.colors.success,
  },
  metaRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: spacing.sm,
    gap: spacing.sm,
  },
  metaCol: {
    flex: 1,
  },
  metaLabel: {
    ...theme.typography.caption,
    color: theme.colors.secondaryLabel,
  },
  metaVal: {
    ...theme.typography.caption,
    fontWeight: '600',
    color: theme.colors.label,
  },
  evidenceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    marginTop: spacing.sm,
  },
  evidenceText: {
    ...theme.typography.caption,
    color: theme.colors.secondaryLabel,
  },
  cardActions: {
    marginTop: spacing.md,
    paddingTop: spacing.sm,
    borderTopWidth: 1,
    borderTopColor: theme.colors.separator,
  },
  formCard: {
    marginBottom: spacing.lg,
  },
  sectionHeading: {
    ...theme.typography.subheadline,
    fontWeight: '800',
    color: theme.colors.label,
    marginBottom: spacing.sm,
  },
  lotList: {
    gap: spacing.sm,
  },
  lotOption: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing.md,
    borderRadius: AppleGlass.radii.md,
    backgroundColor: theme.colors.surfaceSecondary,
    borderWidth: 1,
    borderColor: 'transparent',
  },
  lotOptionSelected: {
    backgroundColor: theme.colors.destructiveMuted,
    borderColor: theme.colors.destructive,
  },
  lotCode: {
    ...theme.typography.subheadline,
    fontWeight: '700',
    color: theme.colors.label,
  },
  lotCodeSelected: {
    color: theme.colors.destructive,
  },
  lotDesc: {
    ...theme.typography.caption,
    color: theme.colors.secondaryLabel,
    marginTop: spacing.xxs,
  },
  divider: {
    height: 1,
    backgroundColor: theme.colors.separator,
    marginVertical: spacing.md,
  },
  reasonList: {
    gap: spacing.sm,
  },
  reasonOption: {
    padding: spacing.sm,
    borderRadius: AppleGlass.radii.md,
    backgroundColor: theme.colors.surfaceSecondary,
    borderWidth: 1,
    borderColor: 'transparent',
  },
  reasonOptionSelected: {
    backgroundColor: theme.colors.destructiveMuted,
    borderColor: theme.colors.destructive,
  },
  reasonTitle: {
    ...theme.typography.footnote,
    fontWeight: '700',
    color: theme.colors.label,
  },
  reasonTitleSelected: {
    color: theme.colors.destructive,
  },
  reasonSub: {
    ...theme.typography.caption,
    color: theme.colors.secondaryLabel,
    marginTop: spacing.xxs,
  },
});
