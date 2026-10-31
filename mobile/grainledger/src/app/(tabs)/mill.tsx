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
import { useMillStore } from '../../store/millStore';
import { formatMass } from '../../utils/decimalMass';
import { AppleGlass } from '../../theme/appleGlass';
import { useAppTheme } from '../../theme';
import {
  Truck,
  ArrowRight,
  Inbox,
  Warehouse,
  Sliders,
} from 'lucide-react-native';

type MillSubTab = 'receiving' | 'operations' | 'silos';

export default function MillScreen() {
  const router = useRouter();
  const theme = useAppTheme();
  const [activeTab, setActiveTab] = useState<MillSubTab>('receiving');
  const {
    receivingTasks,
    operations,
    silos,
    updateReceivingTaskStatus,
    isLoading,
    fetchMillData,
  } = useMillStore();

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: theme.colors.background }]}>
      <Header
        title="Vận hành Nhà máy"
        subtitle="Tiếp nhận xe lúa, chế biến và quản lý silo tồn kho"
      />

      {/* Apple Glass Segmented Control */}
      <View style={styles.segmentedContainer}>
        <GlassSegmentedControl
          segments={[
            { id: 'receiving', label: 'Tiếp nhận xe', count: receivingTasks.length },
            { id: 'operations', label: 'Mẻ chế biến', count: operations.length },
            { id: 'silos', label: 'Tồn kho Silo', count: silos.length },
          ]}
          activeId={activeTab}
          onSelect={(id) => setActiveTab(id as MillSubTab)}
        />
      </View>

      {/* Action Strip */}
      <View style={styles.actionBar}>
        <Text style={styles.actionPromptText}>
          {activeTab === 'receiving'
            ? 'Danh sách xe chờ cân và nhập silo'
            : activeTab === 'operations'
            ? 'Công đoạn: Sấy, Xát, Trộn, Đóng bao'
            : 'Tổng sức chứa và vị trí lưu trữ'}
        </Text>

        <View style={styles.actionButtonsRow}>
          {activeTab === 'operations' && (
            <GlassButton
              title="Hiệu chỉnh"
              icon={<Sliders size={14} color="#0F172A" />}
              size="small"
              variant="secondary"
              onPress={() => router.push('/correction-form')}
            />
          )}

          <GlassButton
            title={activeTab === 'receiving' ? '+ Cân xe' : activeTab === 'operations' ? '+ Mẻ mới' : '+ Lệnh HOLD'}
            size="small"
            variant="primary"
            onPress={() => {
              if (activeTab === 'receiving') router.push('/receiving-form');
              else if (activeTab === 'operations') router.push('/operation-form');
              else router.push('/hold-management');
            }}
          />
        </View>
      </View>

      <ScrollView
        style={styles.contentScroll}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={isLoading}
            onRefresh={fetchMillData}
            tintColor={theme.colors.accent}
            colors={[theme.colors.accent]}
          />
        }
      >
        {/* TAB 1: RECEIVING TASKS */}
        {activeTab === 'receiving' && (
          <View>
            {receivingTasks.length === 0 ? (
              <GlassCard style={{ alignItems: 'center', padding: 32 }}>
                <Inbox size={40} color="#94A3B8" />
                <Text style={{ marginTop: 12, fontSize: 14, fontWeight: '700', color: '#0F172A' }}>
                  Chưa có phiếu tiếp nhận xe nào
                </Text>
                <Text style={{ marginTop: 4, fontSize: 12, color: '#64748B', textAlign: 'center' }}>
                  Kéo xuống để tải lại từ máy chủ hoặc cân xe lúa tươi mới.
                </Text>
              </GlassCard>
            ) : null}

            {receivingTasks.map((t) => (
              <GlassCard
                key={t.id}
                borderRadius={AppleGlass.radii.lg}
                style={styles.itemCard}
                interactive
              >
                <View style={styles.cardHeader}>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.itemCode}>{t.code}</Text>
                    <Text style={styles.itemSub}>{t.supplierName}</Text>
                  </View>
                  <GlassBadge status={t.status} />
                </View>

                <View style={styles.cardDivider} />

                <View style={styles.rowBetween}>
                  <View style={styles.infoCol}>
                    <Text style={styles.infoLabel}>Xe vận chuyển</Text>
                    <View style={styles.flexRow}>
                      <Truck size={14} color="#64748B" />
                      <Text style={styles.plateText}>{t.vehiclePlate}</Text>
                    </View>
                  </View>

                  <View style={styles.infoCol}>
                    <Text style={styles.infoLabel}>Silo nhập</Text>
                    <Text style={styles.infoVal}>{t.targetSiloName}</Text>
                  </View>
                </View>

                <View style={[styles.rowBetween, { marginTop: 10 }]}>
                  <View style={styles.infoCol}>
                    <Text style={styles.infoLabel}>Khối lượng tịnh (Net)</Text>
                    <Text style={[styles.infoVal, { color: AppleGlass.colors.brandGreen, fontWeight: '800' }]}>
                      {formatMass(t.netWeightKg, 0)} kg
                    </Text>
                  </View>

                  <View style={styles.infoCol}>
                    <Text style={styles.infoLabel}>Độ ẩm đo tại cân</Text>
                    <Text style={styles.infoVal}>{t.moisturePercent}%</Text>
                  </View>
                </View>

                {/* Inline Action for Receiving Task */}
                {t.status === 'PENDING_WEIGH' && (
                  <View style={styles.taskActions}>
                    <GlassButton
                      title="Xác nhận Cân & Cho Xả Silo"
                      variant="primary"
                      size="small"
                      onPress={() => updateReceivingTaskStatus(t.id, 'UNLOADED')}
                      fullWidth
                    />
                  </View>
                )}
              </GlassCard>
            ))}
          </View>
        )}

        {/* TAB 2: OPERATIONS */}
        {activeTab === 'operations' && (
          <View>
            {operations.map((op) => (
              <GlassCard
                key={op.id}
                borderRadius={AppleGlass.radii.lg}
                style={styles.itemCard}
                interactive
              >
                <View style={styles.cardHeader}>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.itemCode}>{op.code}</Text>
                    <Text style={styles.itemSub}>Công đoạn: {op.operationType}</Text>
                  </View>
                  <GlassBadge status={op.status} />
                </View>

                <View style={styles.cardDivider} />

                <View style={styles.opFlowBox}>
                  <View style={styles.opFlowSide}>
                    <Text style={styles.opFlowLabel}>ĐẦU VÀO</Text>
                    <Text style={styles.opFlowCode}>{op.inputLotCode}</Text>
                    <Text style={styles.opFlowMass}>{formatMass(op.inputMassKg, 0)} kg</Text>
                  </View>

                  <ArrowRight size={18} color="#94A3B8" />

                  <View style={styles.opFlowSide}>
                    <Text style={styles.opFlowLabel}>ĐẦU RA</Text>
                    <Text style={styles.opFlowCode}>{op.outputLotCode}</Text>
                    <Text style={[styles.opFlowMass, { color: AppleGlass.colors.brandGreen }]}>
                      {formatMass(op.outputMassKg, 0)} kg
                    </Text>
                  </View>
                </View>

                <View style={styles.lossRow}>
                  <Text style={styles.lossText}>
                    Hao hụt ghi nhận: {op.declaredLossKg} kg ({op.lossReason})
                  </Text>
                </View>
              </GlassCard>
            ))}
          </View>
        )}

        {/* TAB 3: SILOS */}
        {activeTab === 'silos' && (
          <View>
            <View style={styles.silosGrid}>
              {silos.map((silo) => {
                const current = parseFloat(silo.currentMassKg) || 0;
                const capacity = silo.capacityKg || 50000;
                const percent = Math.min(Math.round((current / capacity) * 100), 100);
                const isHold = silo.status === 'HOLD';

                return (
                  <GlassCard
                    key={silo.id}
                    tintColor={isHold ? 'rgba(254, 242, 242, 0.9)' : 'rgba(255, 255, 255, 0.85)'}
                    borderTint={isHold ? 'rgba(239, 68, 68, 0.4)' : AppleGlass.colors.glassBorderLight}
                    borderRadius={AppleGlass.radii.lg}
                    style={styles.siloCard}
                    interactive
                  >
                    <View style={styles.siloHeader}>
                      <View style={styles.siloIcon}>
                        <Warehouse size={18} color={isHold ? '#DC2626' : AppleGlass.colors.brandGreen} />
                      </View>
                      <View style={{ flex: 1 }}>
                        <Text style={styles.siloName}>{silo.siloName}</Text>
                        <Text style={styles.siloCode}>{silo.siloCode}</Text>
                      </View>
                      <GlassBadge status={silo.status} size="small" />
                    </View>

                    {/* Silo Liquid Level Gauge */}
                    <View style={styles.gaugeContainer}>
                      <View style={styles.gaugeHeader}>
                        <Text style={styles.gaugePercent}>{percent}% dung lượng</Text>
                        <Text style={styles.gaugeDetail}>
                          {formatMass(current, 0)} / {formatMass(capacity, 0)} kg
                        </Text>
                      </View>
                      <View style={styles.gaugeTrack}>
                        <View
                          style={[
                            styles.gaugeFill,
                            {
                              width: `${percent}%`,
                              backgroundColor: isHold ? '#EF4444' : percent > 85 ? '#F59E0B' : '#10B981',
                            },
                          ]}
                        />
                      </View>
                    </View>

                    <View style={styles.siloFooter}>
                      <Text style={styles.siloCommodity}>{silo.commodityType}</Text>
                      <Text style={styles.siloMoisture}>Độ ẩm: {silo.moisturePercent}</Text>
                    </View>
                  </GlassCard>
                );
              })}
            </View>
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
  segmentedContainer: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    backgroundColor: 'rgba(255, 255, 255, 0.4)',
  },
  actionBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 8,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
  },
  actionPromptText: {
    fontSize: 12,
    color: '#64748B',
    fontWeight: '500',
    flex: 1,
  },
  actionButtonsRow: {
    flexDirection: 'row',
    gap: 8,
  },
  contentScroll: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 120,
  },
  itemCard: {
    marginBottom: 12,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  itemCode: {
    fontSize: 15,
    fontWeight: '800',
    color: '#0F172A',
  },
  itemSub: {
    fontSize: 12,
    color: '#64748B',
    marginTop: 2,
  },
  cardDivider: {
    height: 1,
    backgroundColor: 'rgba(226, 232, 240, 0.8)',
    marginVertical: 10,
  },
  rowBetween: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  infoCol: {
    flex: 1,
  },
  infoLabel: {
    fontSize: 11,
    color: '#64748B',
    marginBottom: 2,
  },
  infoVal: {
    fontSize: 13,
    fontWeight: '700',
    color: '#0F172A',
  },
  flexRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  plateText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#0F172A',
  },
  taskActions: {
    marginTop: 12,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: 'rgba(226, 232, 240, 0.8)',
  },
  opFlowBox: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: 'rgba(241, 245, 249, 0.7)',
    borderRadius: AppleGlass.radii.md,
    padding: 12,
  },
  opFlowSide: {
    flex: 1,
  },
  opFlowLabel: {
    fontSize: 10,
    fontWeight: '700',
    color: '#64748B',
    marginBottom: 2,
  },
  opFlowCode: {
    fontSize: 13,
    fontWeight: '800',
    color: '#0F172A',
  },
  opFlowMass: {
    fontSize: 12,
    fontWeight: '600',
    color: '#475569',
    marginTop: 2,
  },
  lossRow: {
    marginTop: 8,
  },
  lossText: {
    fontSize: 11,
    color: '#64748B',
    fontStyle: 'italic',
  },
  silosGrid: {
    gap: 12,
  },
  siloCard: {
    marginBottom: 8,
  },
  siloHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  siloIcon: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: 'rgba(16, 185, 129, 0.12)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  siloName: {
    fontSize: 14,
    fontWeight: '800',
    color: '#0F172A',
  },
  siloCode: {
    fontSize: 11,
    color: '#64748B',
  },
  gaugeContainer: {
    marginTop: 12,
    marginBottom: 8,
  },
  gaugeHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  gaugePercent: {
    fontSize: 12,
    fontWeight: '700',
    color: '#0F172A',
  },
  gaugeDetail: {
    fontSize: 11,
    color: '#64748B',
  },
  gaugeTrack: {
    height: 8,
    backgroundColor: '#E2E8F0',
    borderRadius: 4,
    overflow: 'hidden',
  },
  gaugeFill: {
    height: '100%',
    borderRadius: 4,
  },
  siloFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 6,
  },
  siloCommodity: {
    fontSize: 12,
    color: '#475569',
  },
  siloMoisture: {
    fontSize: 12,
    fontWeight: '600',
    color: AppleGlass.colors.brandGreen,
  },
});
