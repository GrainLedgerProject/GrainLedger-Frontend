import { useMemo, useState } from "react";
import { radii, spacing } from "../../theme/tokens";

import { useRouter } from "expo-router";
import {
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { GlassBadge } from "../../components/common/GlassBadge";
import { GlassButton } from "../../components/common/GlassButton";
import { GlassCard } from "../../components/common/GlassCard";
import { GlassSegmentedControl } from "../../components/common/GlassSegmentedControl";
import { Header } from "../../components/common/Header";
import { Phone, Search, User } from "../../components/ui/named-icons";
import { useFieldStore } from "../../store/fieldStore";
import { useAppTheme, type AppTheme } from "../../theme";
import { AppleGlass } from "../../theme/appleGlass";
import { formatMass } from "../../utils/decimalMass";

type SubTab = "receipts" | "farmers" | "plots" | "sprays";

export default function FieldScreen() {
  const Colors = usePalette();
  const styles = createStyles(Colors);
  const router = useRouter();
  const theme = useAppTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);
  const [activeTab, setActiveTab] = useState<SubTab>("receipts");
  const [searchQuery, setSearchQuery] = useState("");

  const { farmers, plots, sprays, receipts, isLoading, fetchFieldData } =
    useFieldStore();

  const filteredReceipts = receipts.filter(
    (r) =>
      r.receiptNumber.toLowerCase().includes(searchQuery.toLowerCase()) ||
      r.farmerName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      r.commodityName.toLowerCase().includes(searchQuery.toLowerCase()),
  );

  const filteredFarmers = farmers.filter(
    (f) =>
      f.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      f.code.toLowerCase().includes(searchQuery.toLowerCase()) ||
      f.contact.includes(searchQuery),
  );

  const filteredPlots = plots.filter(
    (p) =>
      p.code.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.variety.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (p.farmerName &&
        p.farmerName.toLowerCase().includes(searchQuery.toLowerCase())),
  );

  const filteredSprays = sprays.filter(
    (s) =>
      s.productName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      s.plotCode.toLowerCase().includes(searchQuery.toLowerCase()) ||
      s.substanceId.toLowerCase().includes(searchQuery.toLowerCase()),
  );

  return (
    <SafeAreaView
      style={[styles.safeArea, { backgroundColor: theme.colors.background }]}
    >
      <Header
        title="Thực địa & Thu mua"
        subtitle="Quản lý nông hộ, thửa ruộng và chuỗi thu hoạch tại ruộng"
      />

      {/* Apple Glass Segmented Control */}
      <View style={styles.tabBarContainer}>
        <GlassSegmentedControl
          segments={[
            { id: "receipts", label: "Thu mua", count: receipts.length },
            { id: "farmers", label: "Nông hộ", count: farmers.length },
            { id: "plots", label: "Thửa ruộng", count: plots.length },
            { id: "sprays", label: "BVTV", count: sprays.length },
          ]}
          activeId={activeTab}
          onSelect={(id) => setActiveTab(id as SubTab)}
        />
      </View>

      {/* Search and Action Bar */}
      <View style={styles.searchRow}>
        <GlassCard
          tintColor={theme.colors.surface}
          borderRadius={AppleGlass.radii.pill}
          contentStyle={styles.searchWrapper}
          style={{ flex: 1 }}
        >
          <Search size={16} color={theme.colors.secondaryLabel} />
          <TextInput
            style={[styles.searchInput, { color: theme.colors.label }]}
            placeholder="Tìm kiếm mã, tên, số ĐT..."
            placeholderTextColor={theme.colors.tertiaryLabel}
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
        </GlassCard>

        <GlassButton
          title="+ Tạo mới"
          variant="primary"
          size="small"
          onPress={() => {
            if (activeTab === "receipts") router.push("/procurement-form");
            else if (activeTab === "farmers") router.push("/farmer-form");
            else if (activeTab === "plots") router.push("/plot-form");
            else router.push("/spray-form");
          }}
        />
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
            onRefresh={fetchFieldData}
            tintColor={theme.colors.accent}
            colors={[theme.colors.accent]}
          />
        }
      >
        {/* RECEIPTS */}
        {activeTab === "receipts" && (
          <View>
            {filteredReceipts.map((r) => (
              <GlassCard
                key={r.id}
                borderRadius={AppleGlass.radii.lg}
                style={styles.itemCard}
                interactive
              >
                <View style={styles.cardHeader}>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.itemCode}>{r.receiptNumber}</Text>
                    <Text style={styles.itemFarmer}>{r.farmerName}</Text>
                  </View>
                  <GlassBadge status={r.status} />
                </View>

                <View style={styles.cardDivider} />

                <View style={styles.rowBetween}>
                  <View style={styles.infoCol}>
                    <Text style={styles.infoLabel}>Khối lượng</Text>
                    <Text
                      style={[
                        styles.infoVal,
                        { color: theme.colors.accent, fontWeight: "800" },
                      ]}
                    >
                      {formatMass(r.measuredGrossKg, 0)} kg
                    </Text>
                  </View>
                  <View style={styles.infoCol}>
                    <Text style={styles.infoLabel}>Độ ẩm</Text>
                    <Text style={styles.infoVal}>{r.moisturePercent}%</Text>
                  </View>
                  <View style={styles.infoCol}>
                    <Text style={styles.infoLabel}>Địa điểm</Text>
                    <Text style={styles.infoVal}>{r.collectionSite}</Text>
                  </View>
                </View>
              </GlassCard>
            ))}
          </View>
        )}

        {/* FARMERS */}
        {activeTab === "farmers" && (
          <View>
            {filteredFarmers.map((f) => (
              <GlassCard
                key={f.id}
                borderRadius={AppleGlass.radii.lg}
                style={styles.itemCard}
                interactive
              >
                <View style={styles.cardHeader}>
                  <View style={styles.avatarRow}>
                    <View style={styles.avatarBox}>
                      <User size={18} color={theme.colors.accent} />
                    </View>
                    <View>
                      <Text style={styles.farmerName}>{f.name}</Text>
                      <Text style={styles.farmerCode}>Mã: {f.code}</Text>
                    </View>
                  </View>
                  <GlassBadge status={f.syncStatus} size="small" />
                </View>

                <View style={styles.cardDivider} />

                <View style={styles.farmerFooter}>
                  <View style={styles.phoneRow}>
                    <Phone size={13} color={theme.colors.secondaryLabel} />
                    <Text style={styles.phoneText}>
                      {f.contact || "Chưa có số ĐT"}
                    </Text>
                  </View>
                  <Text style={styles.registerDate}>
                    Ngày đăng ký: {f.registeredAt}
                  </Text>
                </View>
              </GlassCard>
            ))}
          </View>
        )}

        {/* PLOTS */}
        {activeTab === "plots" && (
          <View>
            {filteredPlots.map((p) => (
              <GlassCard
                key={p.id}
                borderRadius={AppleGlass.radii.lg}
                style={styles.itemCard}
                interactive
              >
                <View style={styles.cardHeader}>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.itemCode}>{p.code}</Text>
                    <Text style={styles.itemFarmer}>
                      Nông hộ: {p.farmerName}
                    </Text>
                  </View>
                  <View style={styles.areaBadge}>
                    <Text style={styles.areaText}>{p.areaHa} ha</Text>
                  </View>
                </View>

                <View style={styles.cardDivider} />

                <View style={styles.rowBetween}>
                  <View style={styles.infoCol}>
                    <Text style={styles.infoLabel}>Giống lúa</Text>
                    <Text style={styles.infoVal}>{p.variety}</Text>
                  </View>
                  <View style={styles.infoCol}>
                    <Text style={styles.infoLabel}>Vụ mùa</Text>
                    <Text style={styles.infoVal}>{p.season}</Text>
                  </View>
                </View>
              </GlassCard>
            ))}
          </View>
        )}

        {/* SPRAYS */}
        {activeTab === "sprays" && (
          <View>
            {filteredSprays.map((s) => (
              <GlassCard
                key={s.id}
                borderRadius={AppleGlass.radii.lg}
                style={styles.itemCard}
                interactive
              >
                <View style={styles.cardHeader}>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.itemCode}>{s.productName}</Text>
                    <Text style={styles.itemFarmer}>
                      Thửa ruộng: {s.plotCode}
                    </Text>
                  </View>
                  <GlassBadge status="COMMITTED" label="HỢP LỆ" />
                </View>

                <View style={styles.cardDivider} />

                <View style={styles.rowBetween}>
                  <View style={styles.infoCol}>
                    <Text style={styles.infoLabel}>Ngày phun</Text>
                    <Text style={styles.infoVal}>{s.appliedOn}</Text>
                  </View>
                  <View style={styles.infoCol}>
                    <Text style={styles.infoLabel}>Cách ly (PHI)</Text>
                    <Text style={styles.infoVal}>{s.phiDays} ngày</Text>
                  </View>
                  <View style={styles.infoCol}>
                    <Text style={styles.infoLabel}>Thu hoạch từ</Text>
                    <Text
                      style={[styles.infoVal, { color: theme.colors.accent }]}
                    >
                      {s.harvestAllowedDate}
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

const createStyles = (theme: AppTheme) =>
  StyleSheet.create({
    safeArea: {
      flex: 1,
      backgroundColor: theme.colors.background,
    },
    tabBarContainer: {
      paddingHorizontal: spacing.lg,
      paddingVertical: spacing.sm,
      backgroundColor: theme.colors.surface,
    },
    searchRow: {
      flexDirection: "row",
      alignItems: "center",
      gap: spacing.sm,
      paddingHorizontal: spacing.lg,
      paddingVertical: spacing.sm,
      backgroundColor: theme.colors.surface,
    },
    searchWrapper: {
      flexDirection: "row",
      alignItems: "center",
      paddingHorizontal: spacing.md,
      paddingVertical: spacing.xs,
      gap: spacing.sm,
    },
    searchInput: {
      flex: 1,
      ...theme.typography.footnote,
      color: theme.colors.label,
      paddingVertical: spacing.xs,
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
    itemFarmer: {
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
      fontWeight: "600",
      color: theme.colors.label,
    },
    avatarRow: {
      flexDirection: "row",
      alignItems: "center",
      gap: spacing.sm,
    },
    avatarBox: {
      width: 48,
      height: 48,
      borderRadius: AppleGlass.radii.pill,
      backgroundColor: theme.colors.accentMuted,
      alignItems: "center",
      justifyContent: "center",
    },
    farmerName: {
      ...theme.typography.subheadline,
      fontWeight: "800",
      color: theme.colors.label,
    },
    farmerCode: {
      ...theme.typography.caption,
      color: theme.colors.secondaryLabel,
      marginTop: spacing.zero,
    },
    farmerFooter: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
    },
    phoneRow: {
      flexDirection: "row",
      alignItems: "center",
      gap: spacing.xs,
    },
    phoneText: {
      ...theme.typography.caption,
      fontWeight: "600",
      color: theme.colors.label,
    },
    registerDate: {
      ...theme.typography.caption,
      color: theme.colors.secondaryLabel,
    },
    areaBadge: {
      backgroundColor: theme.colors.successMuted,
      paddingHorizontal: spacing.sm,
      paddingVertical: spacing.xxs,
      borderRadius: radii.xs,
    },
    areaText: {
      ...theme.typography.caption,
      fontWeight: "800",
      color: theme.colors.accent,
    },
  });
