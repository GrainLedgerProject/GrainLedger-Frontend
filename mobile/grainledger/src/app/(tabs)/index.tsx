import { useRouter } from "expo-router";
import {
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  View,
} from "react-native";
import {
  SafeAreaView,
  useSafeAreaInsets,
} from "react-native-safe-area-context";
import { spacing } from "../../theme/tokens";

import { Button } from "../../components/common/Button";
import { Card } from "../../components/common/Card";
import { GlassBadge } from "../../components/common/GlassBadge";
import { Header } from "../../components/common/Header";
import { MetricCard } from "../../components/common/MetricCard";
import { AppIcon, type AppIconName } from "../../components/ui/AppIcon";
import { AppText } from "../../components/ui/AppText";
import { useAuthStore } from "../../store/authStore";
import { useComplianceStore } from "../../store/complianceStore";
import { useFieldStore } from "../../store/fieldStore";
import { useMillStore } from "../../store/millStore";
import { useOfflineStore } from "../../store/offlineStore";
import { useRiskStore } from "../../store/riskStore";
import { useAppTheme, type ThemeColors } from "../../theme";
import { formatMass } from "../../utils/decimalMass";

type QuickAction = {
  title: string;
  subtitle: string;
  route:
    | "/procurement-form"
    | "/receiving-form"
    | "/(tabs)/compliance"
    | "/hold-management";
  icon: AppIconName;
  foreground: keyof ThemeColors;
  background: keyof ThemeColors;
};

const QUICK_ACTIONS: QuickAction[] = [
  {
    title: "Phiếu thu mua",
    subtitle: "Lập biên nhận lúa",
    route: "/procurement-form",
    icon: "field",
    foreground: "success",
    background: "successMuted",
  },
  {
    title: "Cân xe tiếp nhận",
    subtitle: "Tiếp nhận tại cổng",
    route: "/receiving-form",
    icon: "mill",
    foreground: "warning",
    background: "warningMuted",
  },
  {
    title: "Kiểm định MRL",
    subtitle: "Mẫu Lab và niêm chì",
    route: "/(tabs)/compliance",
    icon: "compliance",
    foreground: "info",
    background: "infoMuted",
  },
  {
    title: "Lệnh HOLD",
    subtitle: "Quản trị rủi ro",
    route: "/hold-management",
    icon: "warning",
    foreground: "destructive",
    background: "destructiveMuted",
  },
];

export default function HomeScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const theme = useAppTheme();
  const { user } = useAuthStore();
  const { receipts, fetchFieldData, isLoading: fieldLoading } = useFieldStore();
  const {
    receivingTasks,
    silos,
    fetchMillData,
    isLoading: millLoading,
  } = useMillStore();
  const { samples, reports, fetchComplianceData } = useComplianceStore();
  const { holds, fetchHolds } = useRiskStore();
  const { getPendingCount } = useOfflineStore();

  const isRefreshing = fieldLoading || millLoading;
  const pendingOffline = getPendingCount();

  const onRefresh = async () => {
    await Promise.all([
      fetchFieldData(),
      fetchMillData(),
      fetchComplianceData(),
      fetchHolds(),
    ]);
  };

  const totalProcuredToday = receipts.reduce(
    (acc, receipt) => acc + (parseFloat(receipt.measuredGrossKg) || 0),
    0,
  );
  const pendingWeighCount = receivingTasks.filter(
    (task) => task.status === "PENDING_WEIGH",
  ).length;
  const activeHoldsCount = holds.filter(
    (hold) => hold.status === "ACTIVE_HOLD",
  ).length;

  return (
    <SafeAreaView
      edges={["top", "left", "right"]}
      style={[styles.safeArea, { backgroundColor: theme.colors.background }]}
    >
      <Header />
      <ScrollView
        keyboardShouldPersistTaps="handled"
        automaticallyAdjustKeyboardInsets
        contentContainerStyle={[
          styles.content,
          { paddingBottom: theme.layout.tabBarHeight + 32 + insets.bottom },
        ]}
        refreshControl={
          <RefreshControl
            refreshing={isRefreshing}
            onRefresh={() => void onRefresh()}
            tintColor={theme.colors.accent}
            colors={[theme.colors.accent]}
          />
        }
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.welcome}>
          <AppText
            variant="captionStrong"
            color="secondaryLabel"
            style={styles.eyebrow}
          >
            KHÔNG GIAN VẬN HÀNH
          </AppText>
          <AppText variant="largeTitle" maxFontSizeMultiplier={1.3}>
            Tổng quan
          </AppText>
          <AppText variant="title3" style={styles.userName}>
            {user?.displayName || "Cán bộ Vận hành Chuỗi"}
          </AppText>
          <AppText
            variant="footnote"
            color="accent"
            style={styles.organization}
          >
            {user?.organizationName || "Tập đoàn Lương thực GrainLedger"}
          </AppText>
        </View>

        {pendingOffline > 0 ? (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={`${pendingOffline} giao dịch đang chờ đồng bộ`}
            onPress={() => router.push("/offline-queue")}
            style={({ pressed }) => [
              styles.bannerPressable,
              pressed && styles.pressed,
            ]}
          >
            <Card
              style={[
                styles.offlineBanner,
                {
                  backgroundColor: theme.colors.warningMuted,
                  borderColor: theme.colors.warning,
                },
              ]}
            >
              <AppIcon name="offline" size={21} color={theme.colors.warning} />
              <View style={styles.flex}>
                <AppText
                  variant="subheadline"
                  style={{ color: theme.colors.warning }}
                >
                  {pendingOffline} giao dịch chờ gửi
                </AppText>
                <AppText
                  variant="caption"
                  style={{ color: theme.colors.warning }}
                >
                  Chạm để mở hàng đợi đồng bộ
                </AppText>
              </View>
              <AppIcon name="forward" size={16} color={theme.colors.warning} />
            </Card>
          </Pressable>
        ) : null}

        <SectionHeading title="Hoạt động hôm nay" trailing="Hôm nay" />
        <View style={styles.metricGrid}>
          <MetricCard
            label="Thu mua lúa tươi"
            value={formatMass(totalProcuredToday, 0)}
            unit="kg"
            subtext={`${receipts.length} chuyến hàng`}
            icon={
              <AppIcon name="field" size={17} color={theme.colors.success} />
            }
            variant="primary"
          />
          <MetricCard
            label="Xe chờ cân"
            value={pendingWeighCount}
            unit="xe"
            subtext="Tại cổng nhà máy"
            icon={
              <AppIcon name="mill" size={17} color={theme.colors.warning} />
            }
            variant="amber"
          />
        </View>
        <View style={styles.metricGrid}>
          <MetricCard
            label="Kiểm định MRL"
            value={reports.length}
            unit="báo cáo"
            subtext={`${samples.length} mẫu niêm chì`}
            icon={
              <AppIcon
                name="compliance"
                size={17}
                color={theme.colors.success}
              />
            }
            variant="emerald"
          />
          <MetricCard
            label="Silo hoạt động"
            value={silos.length}
            unit="silo"
            subtext={
              activeHoldsCount > 0
                ? `${activeHoldsCount} silo cách ly`
                : "100% đạt chuẩn"
            }
            icon={
              <AppIcon
                name={activeHoldsCount > 0 ? "warning" : "mill"}
                size={17}
                color={
                  activeHoldsCount > 0
                    ? theme.colors.destructive
                    : theme.colors.info
                }
              />
            }
            variant={activeHoldsCount > 0 ? "red" : "blue"}
          />
        </View>

        <SectionHeading title="Thao tác nhanh" />
        <View style={styles.quickGrid}>
          {QUICK_ACTIONS.map((action) => (
            <Pressable
              key={action.route}
              accessibilityRole="button"
              accessibilityLabel={`${action.title}. ${action.subtitle}`}
              onPress={() => router.push(action.route)}
              style={({ pressed }) => [
                styles.quickItem,
                pressed && styles.pressed,
              ]}
            >
              <Card style={styles.quickCard}>
                <View
                  style={[
                    styles.quickIcon,
                    {
                      backgroundColor: theme.colors[action.background],
                      borderRadius: theme.radii.md,
                    },
                  ]}
                >
                  <AppIcon
                    name={action.icon}
                    size={21}
                    color={theme.colors[action.foreground]}
                  />
                </View>
                <AppText variant="subheadline" style={styles.quickTitle}>
                  {action.title}
                </AppText>
                <AppText variant="footnote" color="secondaryLabel">
                  {action.subtitle}
                </AppText>
              </Card>
            </Pressable>
          ))}
        </View>

        <SectionHeading
          title="Thu mua gần đây"
          actionLabel="Xem tất cả"
          onAction={() => router.push("/(tabs)/field")}
        />
        {receipts.length === 0 ? (
          <Card style={styles.emptyCard}>
            <View
              style={[
                styles.emptyIcon,
                {
                  backgroundColor: theme.colors.surfaceSecondary,
                  borderRadius: theme.radii.lg,
                },
              ]}
            >
              <AppIcon
                name="field"
                size={28}
                color={theme.colors.secondaryLabel}
              />
            </View>
            <AppText variant="headline" align="center">
              Sẵn sàng cho chuyến hàng đầu tiên
            </AppText>
            <AppText
              variant="subheadline"
              color="secondaryLabel"
              align="center"
            >
              Các phiếu thu mua mới sẽ xuất hiện tại đây.
            </AppText>
            <Button
              title="Lập phiếu thu mua"
              variant="secondary"
              onPress={() => router.push("/procurement-form")}
            />
          </Card>
        ) : null}

        {receipts.slice(0, 2).map((receipt) => (
          <Card key={receipt.id} style={styles.receiptCard}>
            <View style={styles.receiptHeader}>
              <View style={styles.flex}>
                <AppText variant="subheadline" style={styles.receiptNumber}>
                  {receipt.receiptNumber}
                </AppText>
                <AppText variant="footnote" color="secondaryLabel">
                  {receipt.farmerName}
                </AppText>
              </View>
              <GlassBadge status={receipt.status} />
            </View>
            <View
              style={[
                styles.separator,
                { backgroundColor: theme.colors.separator },
              ]}
            />
            <View style={styles.details}>
              <Detail label="Loại hàng" value={receipt.commodityName} />
              <Detail
                label="Khối lượng"
                value={`${formatMass(receipt.measuredGrossKg, 0)} kg`}
                accent
              />
              <Detail label="Độ ẩm" value={`${receipt.moisturePercent}%`} />
            </View>
          </Card>
        ))}

        <Card
          style={[
            styles.traceCard,
            {
              backgroundColor: theme.colors.surface,
              borderColor: theme.colors.separator,
            },
          ]}
        >
          <View style={styles.traceRow}>
            <View
              style={[
                styles.traceIcon,
                {
                  backgroundColor: theme.colors.surfaceSecondary,
                  borderRadius: theme.radii.md,
                },
              ]}
            >
              <AppIcon name="trace" size={25} color={theme.colors.accent} />
            </View>
            <View style={styles.flex}>
              <AppText variant="headline" color="label">
                Truy xuất nguồn gốc hai chiều
              </AppText>
              <AppText
                variant="footnote"
                style={[
                  styles.traceDescription,
                  { color: theme.colors.secondaryLabel },
                ]}
              >
                Kiểm tra hành trình hạt gạo từ đồng ruộng Mekong đến container
                xuất khẩu.
              </AppText>
            </View>
          </View>
          <Button
            title="Quét mã và tra cứu"
            variant="secondary"
            onPress={() => router.push("/(tabs)/trace")}
            style={styles.traceButton}
          />
        </Card>
      </ScrollView>
    </SafeAreaView>
  );
}

function SectionHeading({
  title,
  trailing,
  actionLabel,
  onAction,
}: {
  title: string;
  trailing?: string;
  actionLabel?: string;
  onAction?: () => void;
}) {
  const theme = useAppTheme();

  return (
    <View style={styles.sectionHeading}>
      <AppText variant="title3">{title}</AppText>
      {trailing ? (
        <View
          style={[
            styles.headingPill,
            {
              backgroundColor: theme.colors.surfaceSecondary,
              borderRadius: theme.radii.pill,
            },
          ]}
        >
          <AppText variant="captionStrong" color="secondaryLabel">
            {trailing}
          </AppText>
        </View>
      ) : null}
      {actionLabel && onAction ? (
        <Pressable
          accessibilityRole="button"
          hitSlop={8}
          onPress={onAction}
          style={({ pressed }) => [
            styles.headingAction,
            pressed && styles.pressed,
          ]}
        >
          <AppText variant="subheadline" color="accent">
            {actionLabel}
          </AppText>
        </Pressable>
      ) : null}
    </View>
  );
}

function Detail({
  label,
  value,
  accent = false,
}: {
  label: string;
  value: string;
  accent?: boolean;
}) {
  return (
    <View style={styles.detail}>
      <AppText variant="caption" color="secondaryLabel">
        {label}
      </AppText>
      <AppText
        variant="footnote"
        color={accent ? "accent" : "label"}
        style={styles.detailValue}
      >
        {value}
      </AppText>
    </View>
  );
}

const styles = StyleSheet.create({
  bannerPressable: {
    marginBottom: spacing.xs,
  },
  content: {
    alignSelf: "center",
    maxWidth: 760,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.sm,
    width: "100%",
  },
  detail: {
    flex: 1,
    minWidth: 88,
  },
  detailValue: {
    fontWeight: "600",
    marginTop: spacing.xxs,
  },
  details: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.md,
  },
  emptyCard: {
    alignItems: "center",
    gap: spacing.md,
    padding: spacing.xl,
  },
  emptyIcon: {
    alignItems: "center",
    height: 54,
    justifyContent: "center",
    width: 54,
  },
  eyebrow: {
    letterSpacing: 1.3,
    marginBottom: spacing.xs,
  },
  flex: {
    flex: 1,
  },
  headingAction: {
    justifyContent: "center",
    minHeight: 44,
  },
  headingPill: {
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
  },
  metricGrid: {
    flexDirection: "row",
    gap: spacing.sm,
    marginBottom: spacing.sm,
  },
  offlineBanner: {
    alignItems: "center",
    flexDirection: "row",
    gap: spacing.md,
    padding: spacing.md,
  },
  organization: {
    fontWeight: "600",
    marginTop: spacing.xxs,
  },
  pressed: {
    opacity: 0.62,
  },
  quickCard: {
    minHeight: 142,
    padding: spacing.lg,
  },
  quickGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.sm,
  },
  quickIcon: {
    alignItems: "center",
    height: 40,
    justifyContent: "center",
    marginBottom: spacing.md,
    width: 40,
  },
  quickItem: {
    flexBasis: "46%",
    flexGrow: 1,
    minWidth: 145,
  },
  quickTitle: {
    fontWeight: "600",
    marginBottom: spacing.xxs,
  },
  receiptCard: {
    marginBottom: spacing.sm,
    padding: spacing.lg,
  },
  receiptHeader: {
    alignItems: "center",
    flexDirection: "row",
    gap: spacing.md,
  },
  receiptNumber: {
    fontWeight: "700",
  },
  safeArea: {
    flex: 1,
  },
  sectionHeading: {
    alignItems: "center",
    flexDirection: "row",
    gap: spacing.sm,
    justifyContent: "space-between",
    marginBottom: spacing.md,
    marginTop: spacing.xl,
  },
  separator: {
    height: StyleSheet.hairlineWidth,
    marginVertical: spacing.md,
  },
  traceButton: {
    alignSelf: "stretch",
    marginTop: spacing.lg,
  },
  traceCard: {
    marginBottom: spacing.lg,
    marginTop: spacing.lg,
    padding: spacing.lg,
  },
  traceDescription: {
    marginTop: spacing.xs,
    opacity: 0.82,
  },
  traceIcon: {
    alignItems: "center",
    height: 48,
    justifyContent: "center",
    width: 48,
  },
  traceRow: {
    alignItems: "center",
    flexDirection: "row",
    gap: spacing.md,
  },
  userName: {
    marginTop: spacing.sm,
  },
  welcome: {
    marginBottom: spacing.lg,
  },
});
