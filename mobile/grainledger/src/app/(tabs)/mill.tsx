import { useMemo, useState } from "react";
import { radii, spacing } from "../../theme/tokens";

import { useRouter } from "expo-router";
import {
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { GlassBadge } from "../../components/common/GlassBadge";
import { GlassButton } from "../../components/common/GlassButton";
import { GlassCard } from "../../components/common/GlassCard";
import { GlassSegmentedControl } from "../../components/common/GlassSegmentedControl";
import { Header } from "../../components/common/Header";
import { CorrectionsPanel } from "../../components/mill/CorrectionsPanel";
import {
  ArrowRight,
  Inbox,
  Sliders,
  Truck,
  Warehouse,
} from "../../components/ui/named-icons";
import { useMillStore } from "../../store/millStore";
import { useAppTheme, type AppTheme } from "../../theme";
import { AppleGlass } from "../../theme/appleGlass";
import { formatMass } from "../../utils/decimalMass";

type MillSubTab = "receiving" | "operations" | "silos";

export default function MillScreen() {
  const Colors = usePalette();
  const styles = createStyles(Colors);
  const router = useRouter();
  const theme = useAppTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);
  const [activeTab, setActiveTab] = useState<MillSubTab>("receiving");
  const {
    receivingTasks,
    operations,
    silos,
    updateReceivingTaskStatus,
    isLoading,
    fetchMillData,
  } = useMillStore();

  return (
    <SafeAreaView
      style={[styles.safeArea, { backgroundColor: theme.colors.background }]}
    >
      <Header
        title="Vận hành Nhà máy"
        subtitle="Tiếp nhận xe lúa, chế biến và quản lý silo tồn kho"
      />

      {/* Apple Glass Segmented Control */}
      <View style={styles.segmentedContainer}>
        <GlassSegmentedControl
          segments={[
            {
              id: "receiving",
              label: "Tiếp nhận xe",
              count: receivingTasks.length,
            },
            {
              id: "operations",
              label: "Mẻ chế biến",
              count: operations.length,
            },
            { id: "silos", label: "Tồn kho Silo", count: silos.length },
          ]}
          activeId={activeTab}
          onSelect={(id) => setActiveTab(id as MillSubTab)}
        />
      </View>

      {/* Action Strip */}
      <View style={styles.actionBar}>
        <Text style={styles.actionPromptText}>
          {activeTab === "receiving"
            ? "Danh sách xe chờ cân và nhập silo"
            : activeTab === "operations"
              ? "Công đoạn: Sấy, Xát, Trộn, Đóng bao"
              : "Tổng sức chứa và vị trí lưu trữ"}
        </Text>

        <View style={styles.actionButtonsRow}>
          {activeTab === "operations" && (
            <GlassButton
              title="Hiệu chỉnh"
              icon={<Sliders size={14} color={theme.colors.label} />}
              size="small"
              variant="secondary"
              onPress={() => router.push("/correction-form")}
            />
          )}

          <GlassButton
            title={
              activeTab === "receiving"
                ? "+ Cân xe"
                : activeTab === "operations"
                  ? "+ Mẻ mới"
                  : "+ Lệnh HOLD"
            }
            size="small"
            variant="primary"
            onPress={() => {
              if (activeTab === "receiving") router.push("/receiving-form");
              else if (activeTab === "operations")
                router.push("/operation-form");
              else router.push("/hold-management");
            }}
          />
        </View>
      </View>

      <ScrollView
        keyboardShouldPersistTaps="handled"
        automaticallyAdjustKeyboardInsets
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
        {activeTab === "receiving" && (
          <View>
            {receivingTasks.length === 0 ? (
              <GlassCard style={{ alignItems: "center", padding: spacing.xxl }}>
                <Inbox size={40} color={theme.colors.tertiaryLabel} />
                <Text
                  style={{
                    marginTop: spacing.md,
                    ...theme.typography.subheadline,
                    fontWeight: "700",
                    color: theme.colors.label,
                  }}
                >
                  Chưa có phiếu tiếp nhận xe nào
                </Text>
                <Text
                  style={{
                    marginTop: spacing.xs,
                    ...theme.typography.caption,
                    color: theme.colors.secondaryLabel,
                    textAlign: "center",
                  }}
                >
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
                      <Truck size={14} color={theme.colors.secondaryLabel} />
                      <Text style={styles.plateText}>{t.vehiclePlate}</Text>
                    </View>
                  </View>

                  <View style={styles.infoCol}>
                    <Text style={styles.infoLabel}>Silo nhập</Text>
                    <Text style={styles.infoVal}>{t.targetSiloName}</Text>
                  </View>
                </View>

                <View style={[styles.rowBetween, { marginTop: spacing.sm }]}>
                  <View style={styles.infoCol}>
                    <Text style={styles.infoLabel}>Khối lượng tịnh (Net)</Text>
                    <Text
                      style={[
                        styles.infoVal,
                        { color: theme.colors.accent, fontWeight: "800" },
                      ]}
                    >
                      {formatMass(t.netWeightKg, 0)} kg
                    </Text>
                  </View>

                  <View style={styles.infoCol}>
                    <Text style={styles.infoLabel}>Độ ẩm đo tại cân</Text>
                    <Text style={styles.infoVal}>{t.moisturePercent}%</Text>
                  </View>
                </View>

                {/* Inline Action for Receiving Task */}
                {t.status === "PENDING_WEIGH" && (
                  <View style={styles.taskActions}>
                    <GlassButton
                      title="Xác nhận Cân & Cho Xả Silo"
                      variant="primary"
                      size="small"
                      onPress={() =>
                        updateReceivingTaskStatus(t.id, "UNLOADED")
                      }
                      fullWidth
                    />
                  </View>
                )}
              </GlassCard>
            ))}
          </View>
        )}

        {/* TAB 2: OPERATIONS */}
        {activeTab === "operations" && (
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
                    <Text style={styles.itemSub}>
                      Công đoạn: {op.operationType}
                    </Text>
                  </View>
                  <GlassBadge status={op.status} />
                </View>

                <View style={styles.cardDivider} />

                <View style={styles.opFlowBox}>
                  <View style={styles.opFlowSide}>
                    <Text style={styles.opFlowLabel}>ĐẦU VÀO</Text>
                    <Text style={styles.opFlowCode}>{op.inputLotCode}</Text>
                    <Text style={styles.opFlowMass}>
                      {formatMass(op.inputMassKg, 0)} kg
                    </Text>
                  </View>

                  <ArrowRight size={18} color={theme.colors.tertiaryLabel} />

                  <View style={styles.opFlowSide}>
                    <Text style={styles.opFlowLabel}>ĐẦU RA</Text>
                    <Text style={styles.opFlowCode}>{op.outputLotCode}</Text>
                    <Text
                      style={[
                        styles.opFlowMass,
                        { color: theme.colors.accent },
                      ]}
                    >
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

        {activeTab === "operations" ? <CorrectionsPanel /> : null}

        {/* TAB 3: SILOS */}
        {activeTab === "silos" && (
          <View>
            <View style={styles.silosGrid}>
              {silos.map((silo) => {
                const current = parseFloat(silo.currentMassKg) || 0;
                const capacity = silo.capacityKg || 50000;
                const percent = Math.min(
                  Math.round((current / capacity) * 100),
                  100,
                );
                const isHold = silo.status === "HOLD";

                return (
                  <GlassCard
                    key={silo.id}
                    tintColor={
                      isHold
                        ? theme.colors.surfaceSecondary
                        : theme.colors.surface
                    }
                    borderTint={
                      isHold
                        ? theme.colors.destructiveMuted
                        : theme.colors.glassBorder
                    }
                    borderRadius={AppleGlass.radii.lg}
                    style={styles.siloCard}
                    interactive
                  >
                    <View style={styles.siloHeader}>
                      <View style={styles.siloIcon}>
                        <Warehouse
                          size={18}
                          color={
                            isHold
                              ? theme.colors.destructive
                              : theme.colors.accent
                          }
                        />
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
                        <Text style={styles.gaugePercent}>
                          {percent}% dung lượng
                        </Text>
                        <Text style={styles.gaugeDetail}>
                          {formatMass(current, 0)} / {formatMass(capacity, 0)}{" "}
                          kg
                        </Text>
                      </View>
                      <View style={styles.gaugeTrack}>
                        <View
                          style={[
                            styles.gaugeFill,
                            {
                              width: `${percent}%`,
                              backgroundColor: isHold
                                ? theme.colors.destructive
                                : percent > 85
                                  ? theme.colors.warning
                                  : theme.colors.success,
                            },
                          ]}
                        />
                      </View>
                    </View>

                    <View style={styles.siloFooter}>
                      <Text style={styles.siloCommodity}>
                        {silo.commodityType}
                      </Text>
                      <Text style={styles.siloMoisture}>
                        Độ ẩm: {silo.moisturePercent}
                      </Text>
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

const createStyles = (theme: AppTheme) =>
  StyleSheet.create({
    safeArea: {
      flex: 1,
      backgroundColor: theme.colors.background,
    },
    segmentedContainer: {
      paddingHorizontal: spacing.lg,
      paddingVertical: spacing.sm,
      backgroundColor: theme.colors.surface,
    },
    actionBar: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      paddingHorizontal: spacing.lg,
      paddingVertical: spacing.sm,
      backgroundColor: theme.colors.surface,
    },
    actionPromptText: {
      ...theme.typography.caption,
      color: theme.colors.secondaryLabel,
      fontWeight: "500",
      flex: 1,
    },
    actionButtonsRow: {
      flexDirection: "row",
      gap: spacing.sm,
    },
    contentScroll: {
      flex: 1,
    },
    scrollContent: {
      padding: spacing.lg,
      paddingBottom: spacing.huge,
    },
    itemCard: {
      marginBottom: spacing.md,
    },
    cardHeader: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
    },
    itemCode: {
      ...theme.typography.subheadline,
      fontWeight: "800",
      color: theme.colors.label,
    },
    itemSub: {
      ...theme.typography.caption,
      color: theme.colors.secondaryLabel,
      marginTop: spacing.xxs,
    },
    cardDivider: {
      height: 1,
      backgroundColor: theme.colors.separator,
      marginVertical: spacing.sm,
    },
    rowBetween: {
      flexDirection: "row",
      justifyContent: "space-between",
    },
    infoCol: {
      flex: 1,
    },
    infoLabel: {
      ...theme.typography.caption,
      color: theme.colors.secondaryLabel,
      marginBottom: spacing.xxs,
    },
    infoVal: {
      ...theme.typography.footnote,
      fontWeight: "700",
      color: theme.colors.label,
    },
    flexRow: {
      flexDirection: "row",
      alignItems: "center",
      gap: spacing.xs,
    },
    plateText: {
      ...theme.typography.footnote,
      fontWeight: "700",
      color: theme.colors.label,
    },
    taskActions: {
      marginTop: spacing.md,
      paddingTop: spacing.sm,
      borderTopWidth: 1,
      borderTopColor: theme.colors.separator,
    },
    opFlowBox: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      backgroundColor: theme.colors.surfaceSecondary,
      borderRadius: AppleGlass.radii.md,
      padding: spacing.md,
    },
    opFlowSide: {
      flex: 1,
    },
    opFlowLabel: {
      ...theme.typography.caption,
      fontWeight: "700",
      color: theme.colors.secondaryLabel,
      marginBottom: spacing.xxs,
    },
    opFlowCode: {
      ...theme.typography.footnote,
      fontWeight: "800",
      color: theme.colors.label,
    },
    opFlowMass: {
      ...theme.typography.caption,
      fontWeight: "600",
      color: theme.colors.secondaryLabel,
      marginTop: spacing.xxs,
    },
    lossRow: {
      marginTop: spacing.sm,
    },
    lossText: {
      ...theme.typography.caption,
      color: theme.colors.secondaryLabel,
      fontStyle: "italic",
    },
    silosGrid: {
      gap: spacing.md,
    },
    siloCard: {
      marginBottom: spacing.sm,
    },
    siloHeader: {
      flexDirection: "row",
      alignItems: "center",
      gap: spacing.sm,
    },
    siloIcon: {
      width: 48,
      height: 48,
      borderRadius: radii.xs,
      backgroundColor: theme.colors.accentMuted,
      alignItems: "center",
      justifyContent: "center",
    },
    siloName: {
      ...theme.typography.subheadline,
      fontWeight: "800",
      color: theme.colors.label,
    },
    siloCode: {
      ...theme.typography.caption,
      color: theme.colors.secondaryLabel,
    },
    gaugeContainer: {
      marginTop: spacing.md,
      marginBottom: spacing.sm,
    },
    gaugeHeader: {
      flexDirection: "row",
      justifyContent: "space-between",
      marginBottom: spacing.xs,
    },
    gaugePercent: {
      ...theme.typography.caption,
      fontWeight: "700",
      color: theme.colors.label,
    },
    gaugeDetail: {
      ...theme.typography.caption,
      color: theme.colors.secondaryLabel,
    },
    gaugeTrack: {
      height: 8,
      backgroundColor: theme.colors.separator,
      borderRadius: radii.xs,
      overflow: "hidden",
    },
    gaugeFill: {
      height: "100%",
      borderRadius: radii.xs,
    },
    siloFooter: {
      flexDirection: "row",
      justifyContent: "space-between",
      marginTop: spacing.xs,
    },
    siloCommodity: {
      ...theme.typography.caption,
      color: theme.colors.secondaryLabel,
    },
    siloMoisture: {
      ...theme.typography.caption,
      fontWeight: "600",
      color: theme.colors.accent,
    },
  });
