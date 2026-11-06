import { useMemo, useState } from "react";
import { radii, spacing } from "../../theme/tokens";

import {
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { GlassBadge } from "../../components/common/GlassBadge";
import { GlassCard } from "../../components/common/GlassCard";
import { Header } from "../../components/common/Header";
import {
  Check,
  CheckCircle2,
  QrCode,
  Search,
  ShieldCheck,
  Sparkles,
} from "../../components/ui/named-icons";
import { useMillStore } from "../../store/millStore";
import { useAppTheme, type AppTheme } from "../../theme";
import { AppleGlass } from "../../theme/appleGlass";
import { formatMass } from "../../utils/decimalMass";

export default function TraceScreen() {
  const theme = useAppTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);
  const { traceLots, getLotByCode, isLoading, fetchMillData } = useMillStore();
  const [searchInput, setSearchInput] = useState("");
  const [selectedLotId, setSelectedLotId] = useState<string | null>(null);

  const currentLot =
    (selectedLotId
      ? traceLots.find((l) => l.id === selectedLotId)
      : undefined) ?? traceLots[0];

  const handleSearch = () => {
    const found = getLotByCode(searchInput);
    if (found) {
      setSelectedLotId(found.id);
    }
  };

  return (
    <SafeAreaView
      style={[styles.safeArea, { backgroundColor: theme.colors.background }]}
    >
      <Header
        title="Truy xuất Nguồn gốc"
        subtitle="Tra cứu chuỗi hành trình & kiểm định MRL bất biến"
      />

      {/* Apple Glass Search and Scan Bar */}
      <View style={styles.searchContainer}>
        <GlassCard
          tintColor={theme.colors.surface}
          borderRadius={AppleGlass.radii.pill}
          contentStyle={styles.searchBarInner}
        >
          <Search size={18} color={theme.colors.secondaryLabel} />
          <TextInput
            style={[styles.input, { color: theme.colors.label }]}
            placeholder="Nhập mã lô hàng (VD: RAW-...)"
            placeholderTextColor={theme.colors.tertiaryLabel}
            value={searchInput}
            onChangeText={setSearchInput}
            onSubmitEditing={handleSearch}
          />
          <TouchableOpacity
            style={styles.scanBtn}
            onPress={handleSearch}
            activeOpacity={0.7}
          >
            <QrCode size={18} color={theme.colors.accent} />
          </TouchableOpacity>
        </GlassCard>

        {/* Suggestion Chips */}
        {traceLots.length > 0 ? (
          <View style={styles.suggestionRow}>
            <Text style={styles.suggestLabel}>Lô khả dụng:</Text>
            {traceLots.slice(0, 3).map((lot) => (
              <TouchableOpacity
                key={lot.id}
                style={[
                  styles.chip,
                  currentLot?.id === lot.id && styles.chipActive,
                ]}
                onPress={() => {
                  setSearchInput(lot.lotCode);
                  setSelectedLotId(lot.id);
                }}
              >
                <Text
                  style={[
                    styles.chipText,
                    currentLot?.id === lot.id && styles.chipTextActive,
                  ]}
                >
                  {lot.lotCode}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        ) : null}
      </View>

      <ScrollView
        keyboardShouldPersistTaps="handled"
        automaticallyAdjustKeyboardInsets
        style={styles.scroll}
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
        {currentLot ? (
          <View>
            {/* Lot Summary Glass Hero Card */}
            <GlassCard
              tintColor={theme.colors.surface}
              borderRadius={AppleGlass.radii.xl}
              elevated
              style={styles.lotHeroCard}
            >
              <View style={styles.heroTop}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.heroCode}>{currentLot.lotCode}</Text>
                  <Text style={styles.heroProduct}>
                    {currentLot.productType}
                  </Text>
                </View>
                <GlassBadge status={currentLot.status} size="medium" />
              </View>

              <View style={styles.heroDivider} />

              <View style={styles.heroStatsRow}>
                <View style={styles.heroStatItem}>
                  <Text style={styles.heroStatLabel}>Khối lượng hiện tại</Text>
                  <Text style={styles.heroStatVal}>
                    {formatMass(currentLot.currentMassKg, 0)} kg
                  </Text>
                </View>

                <View style={styles.heroStatItem}>
                  <Text style={styles.heroStatLabel}>Độ thuần chủng</Text>
                  <View
                    style={{
                      flexDirection: "row",
                      alignItems: "center",
                      gap: spacing.xs,
                    }}
                  >
                    <Sparkles size={14} color={theme.colors.warning} />
                    <Text
                      style={[
                        styles.heroStatVal,
                        { color: theme.colors.warning },
                      ]}
                    >
                      {currentLot.purityScore}%
                    </Text>
                  </View>
                </View>

                <View style={styles.heroStatItem}>
                  <Text style={styles.heroStatLabel}>Ngày đóng gói</Text>
                  <Text style={styles.heroStatVal}>
                    {currentLot.createdDate}
                  </Text>
                </View>
              </View>
            </GlassCard>

            {/* MRL Compliance Banner */}
            <GlassCard
              tintColor={theme.colors.surface}
              borderTint={theme.colors.separator}
              borderRadius={AppleGlass.radii.lg}
              style={styles.mrlCard}
            >
              <View style={styles.mrlHeader}>
                <View style={styles.mrlIconBox}>
                  <ShieldCheck size={24} color={theme.colors.success} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.mrlTitle}>
                    Chứng nhận Dư lượng MRL Đạt chuẩn
                  </Text>
                  <Text style={styles.mrlSub}>
                    Phù hợp quy chuẩn xuất khẩu thị trường EU, US và Nhật Bản.
                  </Text>
                </View>
              </View>

              <View style={styles.mrlDivider} />

              <View style={styles.mrlChecklist}>
                <View style={styles.mrlItem}>
                  <Check size={14} color={theme.colors.success} />
                  <Text style={styles.mrlItemText}>
                    Azoxystrobin: 0.02 mg/kg (Ngưỡng 2.0)
                  </Text>
                </View>
                <View style={styles.mrlItem}>
                  <Check size={14} color={theme.colors.success} />
                  <Text style={styles.mrlItemText}>
                    Tricyclazole: Không phát hiện (LOD &lt; 0.01)
                  </Text>
                </View>
                <View style={styles.mrlItem}>
                  <Check size={14} color={theme.colors.success} />
                  <Text style={styles.mrlItemText}>
                    Kim loại nặng (Cadmium, Chì): Đạt an toàn
                  </Text>
                </View>
              </View>
            </GlassCard>

            {/* Farmer Origin Composition */}
            <View style={styles.sectionHeaderRow}>
              <Text style={styles.sectionTitle}>
                Nguồn gốc Nông hộ & Thửa ruộng
              </Text>
            </View>

            {currentLot.farmerOrigins.map((origin, index) => (
              <GlassCard
                key={index}
                borderRadius={AppleGlass.radii.lg}
                style={styles.originCard}
                interactive
              >
                <View style={styles.originTop}>
                  <View>
                    <Text style={styles.originFarmer}>{origin.farmerName}</Text>
                    <Text style={styles.originPlot}>
                      Mã: {origin.farmerCode} • Thửa {origin.plotCode} (
                      {origin.province})
                    </Text>
                  </View>
                  <View style={styles.originPercentBadge}>
                    <Text style={styles.originPercentText}>
                      {origin.percentage}%
                    </Text>
                  </View>
                </View>

                <View style={styles.originDivider} />

                <View style={styles.originFooter}>
                  <Text style={styles.originVariety}>
                    Giống: {origin.variety}
                  </Text>
                  <Text style={styles.originHarvest}>
                    Thu hoạch: {origin.harvestDate}
                  </Text>
                </View>
              </GlassCard>
            ))}

            {/* Supply Chain Timeline with Apple Glass */}
            <View style={styles.sectionHeaderRow}>
              <Text style={styles.sectionTitle}>Hành trình Chuỗi Cung ứng</Text>
            </View>

            <GlassCard
              borderRadius={AppleGlass.radii.lg}
              style={styles.timelineCard}
            >
              {currentLot.history.map((step, idx) => (
                <View key={idx} style={styles.timelineStep}>
                  <View style={styles.timelineLeft}>
                    <View style={styles.timelineDot}>
                      <CheckCircle2 size={12} color={theme.colors.surface} />
                    </View>
                    {idx < currentLot.history.length - 1 && (
                      <View style={styles.timelineLine} />
                    )}
                  </View>

                  <View style={styles.timelineRight}>
                    <View style={styles.stepHeader}>
                      <Text style={styles.stepTitle}>{step.stage}</Text>
                      <Text style={styles.stepTime}>{step.timestamp}</Text>
                    </View>
                    <Text style={styles.stepOperator}>
                      Thực hiện: {step.operator}
                    </Text>
                    <Text style={styles.stepDetail}>{step.detail}</Text>
                  </View>
                </View>
              ))}
            </GlassCard>
          </View>
        ) : (
          <GlassCard style={styles.emptyContainer}>
            <Text style={styles.emptyText}>
              Không tìm thấy mã lô tương ứng.
            </Text>
          </GlassCard>
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
    searchContainer: {
      backgroundColor: theme.colors.surface,
      padding: spacing.lg,
      borderBottomWidth: 1,
      borderBottomColor: theme.colors.separator,
    },
    searchBarInner: {
      flexDirection: "row",
      alignItems: "center",
      paddingHorizontal: spacing.md,
      paddingVertical: spacing.xs,
      gap: spacing.sm,
    },
    input: {
      flex: 1,
      ...theme.typography.subheadline,
      color: theme.colors.label,
      paddingVertical: spacing.sm,
    },
    scanBtn: {
      padding: spacing.xs,
      borderRadius: radii.xs,
      backgroundColor: theme.colors.accentMuted,
    },
    suggestionRow: {
      flexDirection: "row",
      alignItems: "center",
      marginTop: spacing.sm,
      gap: spacing.sm,
    },
    suggestLabel: {
      ...theme.typography.caption,
      color: theme.colors.secondaryLabel,
    },
    chip: {
      backgroundColor: theme.colors.surface,
      paddingHorizontal: spacing.sm,
      paddingVertical: spacing.xs,
      borderRadius: AppleGlass.radii.pill,
      borderWidth: 1,
      borderColor: theme.colors.separator,
    },
    chipActive: {
      backgroundColor: theme.colors.successMuted,
      borderColor: theme.colors.success,
    },
    chipText: {
      ...theme.typography.caption,
      fontWeight: "600",
      color: theme.colors.secondaryLabel,
    },
    chipTextActive: {
      color: theme.colors.accent,
      fontWeight: "700",
    },
    scroll: {
      flex: 1,
    },
    scrollContent: {
      padding: spacing.lg,
      paddingBottom: spacing.huge,
    },
    lotHeroCard: {
      marginBottom: spacing.md,
    },
    heroTop: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "flex-start",
    },
    heroCode: {
      ...theme.typography.body,
      fontWeight: "800",
      color: theme.colors.label,
    },
    heroProduct: {
      ...theme.typography.footnote,
      color: theme.colors.secondaryLabel,
      marginTop: spacing.xxs,
    },
    heroDivider: {
      height: 1,
      backgroundColor: theme.colors.separator,
      marginVertical: spacing.md,
    },
    heroStatsRow: {
      flexDirection: "row",
      justifyContent: "space-between",
    },
    heroStatItem: {
      flex: 1,
    },
    heroStatLabel: {
      ...theme.typography.caption,
      color: theme.colors.secondaryLabel,
      marginBottom: spacing.xxs,
    },
    heroStatVal: {
      ...theme.typography.subheadline,
      fontWeight: "700",
      color: theme.colors.label,
    },
    mrlCard: {
      marginBottom: spacing.lg,
    },
    mrlHeader: {
      flexDirection: "row",
      gap: spacing.md,
      alignItems: "center",
    },
    mrlIconBox: {
      width: 40,
      height: 40,
      borderRadius: radii.sm,
      backgroundColor: theme.colors.successMuted,
      alignItems: "center",
      justifyContent: "center",
    },
    mrlTitle: {
      ...theme.typography.subheadline,
      fontWeight: "800",
      color: theme.colors.success,
    },
    mrlSub: {
      ...theme.typography.caption,
      color: theme.colors.success,
      marginTop: spacing.xxs,
    },
    mrlDivider: {
      height: 1,
      backgroundColor: theme.colors.accentMuted,
      marginVertical: spacing.sm,
    },
    mrlChecklist: {
      gap: spacing.xs,
    },
    mrlItem: {
      flexDirection: "row",
      alignItems: "center",
      gap: spacing.xs,
    },
    mrlItemText: {
      ...theme.typography.caption,
      fontWeight: "600",
      color: theme.colors.success,
    },
    sectionHeaderRow: {
      marginTop: spacing.sm,
      marginBottom: spacing.sm,
    },
    sectionTitle: {
      ...theme.typography.subheadline,
      fontWeight: "800",
      color: theme.colors.label,
    },
    originCard: {
      marginBottom: spacing.sm,
    },
    originTop: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
    },
    originFarmer: {
      ...theme.typography.subheadline,
      fontWeight: "800",
      color: theme.colors.label,
    },
    originPlot: {
      ...theme.typography.caption,
      color: theme.colors.secondaryLabel,
      marginTop: spacing.xxs,
    },
    originPercentBadge: {
      backgroundColor: theme.colors.successMuted,
      paddingHorizontal: spacing.sm,
      paddingVertical: spacing.xs,
      borderRadius: radii.xs,
      borderWidth: 1,
      borderColor: theme.colors.successMuted,
    },
    originPercentText: {
      ...theme.typography.footnote,
      fontWeight: "800",
      color: theme.colors.accent,
    },
    originDivider: {
      height: 1,
      backgroundColor: theme.colors.separator,
      marginVertical: spacing.sm,
    },
    originFooter: {
      flexDirection: "row",
      justifyContent: "space-between",
    },
    originVariety: {
      ...theme.typography.caption,
      color: theme.colors.secondaryLabel,
    },
    originHarvest: {
      ...theme.typography.caption,
      color: theme.colors.secondaryLabel,
    },
    timelineCard: {
      padding: spacing.lg,
      marginBottom: spacing.lg,
    },
    timelineStep: {
      flexDirection: "row",
      gap: spacing.md,
      marginBottom: spacing.lg,
    },
    timelineLeft: {
      alignItems: "center",
      width: 20,
    },
    timelineDot: {
      width: 20,
      height: 20,
      borderRadius: radii.xs,
      backgroundColor: theme.colors.accent,
      alignItems: "center",
      justifyContent: "center",
      zIndex: 2,
    },
    timelineLine: {
      width: 2,
      flex: 1,
      backgroundColor: theme.colors.separator,
      marginTop: spacing.xs,
      marginBottom: -spacing.lg,
    },
    timelineRight: {
      flex: 1,
    },
    stepHeader: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
    },
    stepTitle: {
      ...theme.typography.subheadline,
      fontWeight: "700",
      color: theme.colors.label,
    },
    stepTime: {
      ...theme.typography.caption,
      color: theme.colors.secondaryLabel,
    },
    stepOperator: {
      ...theme.typography.caption,
      color: theme.colors.accent,
      fontWeight: "600",
      marginTop: spacing.xxs,
    },
    stepDetail: {
      ...theme.typography.caption,
      color: theme.colors.secondaryLabel,
      marginTop: spacing.xxs,
      lineHeight: 16,
    },
    emptyContainer: {
      padding: spacing.xxl,
      alignItems: "center",
    },
    emptyText: {
      ...theme.typography.subheadline,
      color: theme.colors.secondaryLabel,
    },
  });
