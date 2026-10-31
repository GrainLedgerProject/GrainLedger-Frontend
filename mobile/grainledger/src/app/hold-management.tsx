import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  SafeAreaView,
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
} from 'lucide-react-native';

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

      <ScrollView
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
                <CheckCircle size={36} color="#059669" />
                <Text style={styles.emptyTitle}>Không có Lô hàng Bị Cách ly</Text>
                <Text style={styles.emptySub}>
                  Tất cả các lô hàng tại nhà máy đều đạt tiêu chuẩn an toàn thực phẩm.
                </Text>
              </GlassCard>
            ) : (
              activeHolds.map((hold) => (
                <GlassCard
                  key={hold.id}
                  tintColor="rgba(254, 242, 242, 0.9)"
                  borderTint="rgba(239, 68, 68, 0.4)"
                  borderRadius={AppleGlass.radii.lg}
                  elevated
                  style={styles.itemCard}
                >
                  <View style={styles.cardHeader}>
                    <View style={styles.headerLeft}>
                      <AlertOctagon size={22} color="#DC2626" />
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
                      <FileText size={12} color="#475569" />
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
                tintColor="rgba(240, 253, 244, 0.85)"
                borderTint="rgba(52, 199, 89, 0.3)"
                borderRadius={AppleGlass.radii.lg}
                style={styles.itemCard}
              >
                <View style={styles.cardHeader}>
                  <View style={styles.headerLeft}>
                    <CheckCircle size={20} color="#059669" />
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
              tintColor="rgba(255, 255, 255, 0.9)"
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
                leftIcon={<FileText size={18} color="#64748B" />}
              />

              <GlassButton
                title="Ban hành Lệnh HOLD Cách ly"
                variant="danger"
                size="large"
                loading={isSubmitting}
                onPress={handleIssueHold}
                fullWidth
                style={{ marginTop: 12 }}
              />
            </GlassCard>
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#F2F4F8',
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
    paddingBottom: 40,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: '#0F172A',
  },
  sectionCount: {
    fontSize: 12,
    fontWeight: '600',
    color: '#64748B',
  },
  emptyCard: {
    padding: 30,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    marginTop: 20,
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: '#0F172A',
  },
  emptySub: {
    fontSize: 13,
    color: '#64748B',
    textAlign: 'center',
    lineHeight: 18,
  },
  itemCard: {
    marginBottom: 14,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    flex: 1,
  },
  targetCode: {
    fontSize: 16,
    fontWeight: '800',
    color: '#0F172A',
  },
  categoryText: {
    fontSize: 12,
    color: '#64748B',
    marginTop: 1,
  },
  reasonBox: {
    backgroundColor: 'rgba(254, 226, 226, 0.6)',
    padding: 10,
    borderRadius: AppleGlass.radii.sm,
    marginTop: 10,
    borderLeftWidth: 3,
    borderLeftColor: '#DC2626',
  },
  reasonText: {
    fontSize: 13,
    color: '#991B1B',
    lineHeight: 18,
    fontWeight: '500',
  },
  resolvedBox: {
    backgroundColor: '#ECFDF5',
    padding: 10,
    borderRadius: AppleGlass.radii.sm,
    marginTop: 10,
  },
  resolvedLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: '#047857',
    marginBottom: 2,
  },
  resolvedNotes: {
    fontSize: 12,
    color: '#065F46',
  },
  metaRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 10,
    gap: 8,
  },
  metaCol: {
    flex: 1,
  },
  metaLabel: {
    fontSize: 10,
    color: '#64748B',
  },
  metaVal: {
    fontSize: 12,
    fontWeight: '600',
    color: '#334155',
  },
  evidenceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 8,
  },
  evidenceText: {
    fontSize: 11,
    color: '#475569',
  },
  cardActions: {
    marginTop: 12,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: 'rgba(226, 232, 240, 0.8)',
  },
  formCard: {
    marginBottom: 20,
  },
  sectionHeading: {
    fontSize: 14,
    fontWeight: '800',
    color: '#0F172A',
    marginBottom: 10,
  },
  lotList: {
    gap: 8,
  },
  lotOption: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: AppleGlass.radii.md,
    backgroundColor: 'rgba(241, 245, 249, 0.7)',
    borderWidth: 1,
    borderColor: 'transparent',
  },
  lotOptionSelected: {
    backgroundColor: '#FEF2F2',
    borderColor: '#F87171',
  },
  lotCode: {
    fontSize: 14,
    fontWeight: '700',
    color: '#0F172A',
  },
  lotCodeSelected: {
    color: '#DC2626',
  },
  lotDesc: {
    fontSize: 12,
    color: '#64748B',
    marginTop: 2,
  },
  divider: {
    height: 1,
    backgroundColor: 'rgba(226, 232, 240, 0.8)',
    marginVertical: 14,
  },
  reasonList: {
    gap: 8,
  },
  reasonOption: {
    padding: 10,
    borderRadius: AppleGlass.radii.md,
    backgroundColor: 'rgba(241, 245, 249, 0.7)',
    borderWidth: 1,
    borderColor: 'transparent',
  },
  reasonOptionSelected: {
    backgroundColor: '#FEF2F2',
    borderColor: '#F87171',
  },
  reasonTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: '#0F172A',
  },
  reasonTitleSelected: {
    color: '#DC2626',
  },
  reasonSub: {
    fontSize: 11,
    color: '#64748B',
    marginTop: 2,
  },
});
