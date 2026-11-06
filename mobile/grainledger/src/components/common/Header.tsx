import { useRouter } from "expo-router";
import React from "react";
import { Pressable, StyleSheet, View } from "react-native";
import { radii, spacing } from "../../theme/tokens";

import { useAuthStore } from "../../store/authStore";
import { useOfflineStore } from "../../store/offlineStore";
import { useAppTheme } from "../../theme";
import { ROLE_DEFINITIONS } from "../../types/roles";
import { AppIcon } from "../ui/AppIcon";
import { AppText } from "../ui/AppText";
import { GlassSurface } from "../ui/GlassSurface";

interface HeaderProps {
  title?: string;
  subtitle?: string;
  showBack?: boolean;
}

export const Header: React.FC<HeaderProps> = ({
  title,
  subtitle,
  showBack,
}) => {
  const router = useRouter();
  const theme = useAppTheme();
  const { activeRole } = useAuthStore();
  const { getPendingCount, isSyncing } = useOfflineStore();
  const pending = getPendingCount();
  const role = activeRole ? ROLE_DEFINITIONS[activeRole] : undefined;

  return (
    <View style={styles.wrapper}>
      <View style={styles.row}>
        <View style={styles.brand}>
          {showBack ? (
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Trở lại"
              hitSlop={6}
              onPress={() => router.back()}
              style={({ pressed }) => [
                styles.logo,
                {
                  backgroundColor: theme.colors.surfaceSecondary,
                  borderRadius: theme.radii.md,
                },
                pressed && styles.pressed,
              ]}
            >
              <AppIcon name="back" size={23} color={theme.colors.label} />
            </Pressable>
          ) : (
            <View
              style={[
                styles.logo,
                {
                  backgroundColor: theme.colors.accentMuted,
                  borderRadius: theme.radii.md,
                },
              ]}
            >
              <AppIcon name="field" size={23} color={theme.colors.accent} />
            </View>
          )}
          <View style={styles.brandText}>
            <AppText variant="headline">GrainLedger</AppText>
            <AppText
              variant="caption"
              color="secondaryLabel"
              style={styles.caption}
            >
              Từ đồng ruộng đến thế giới
            </AppText>
          </View>
        </View>

        <GlassSurface
          variant="clear"
          interactive
          radius={theme.radii.pill}
          style={styles.actions}
        >
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={
              isSyncing
                ? "Đang đồng bộ"
                : pending
                  ? `${pending} giao dịch chờ đồng bộ`
                  : "Đã đồng bộ. Xem hàng đợi"
            }
            hitSlop={4}
            onPress={() => router.push("/offline-queue")}
            style={({ pressed }) => [styles.control, pressed && styles.pressed]}
          >
            <AppIcon
              name={pending ? "offline" : "sync"}
              size={20}
              color={
                pending ? theme.colors.warning : theme.colors.secondaryLabel
              }
            />
            {pending > 0 ? (
              <View
                style={[
                  styles.pendingDot,
                  { backgroundColor: theme.colors.warning },
                ]}
              />
            ) : null}
          </Pressable>
          <View
            style={[
              styles.divider,
              { backgroundColor: theme.colors.separator },
            ]}
          />
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Mở hồ sơ cá nhân"
            hitSlop={4}
            onPress={() => router.push("/(tabs)/profile")}
            style={({ pressed }) => [styles.control, pressed && styles.pressed]}
          >
            <AppText
              variant="captionStrong"
              color="label"
              maxFontSizeMultiplier={1.25}
            >
              {role?.code || "GL"}
            </AppText>
          </Pressable>
        </GlassSurface>
      </View>

      {title ? (
        <View style={styles.titleSection}>
          <AppText variant="largeTitle" maxFontSizeMultiplier={1.35}>
            {title}
          </AppText>
          {subtitle ? (
            <AppText
              variant="subheadline"
              color="secondaryLabel"
              style={styles.subtitle}
            >
              {subtitle}
            </AppText>
          ) : null}
        </View>
      ) : null}
    </View>
  );
};

const styles = StyleSheet.create({
  actions: {
    alignItems: "center",
    flexDirection: "row",
  },
  brand: {
    alignItems: "center",
    flex: 1,
    flexDirection: "row",
    gap: spacing.sm,
  },
  brandText: {
    flex: 1,
  },
  caption: {
    marginTop: spacing.zero,
  },
  control: {
    alignItems: "center",
    borderRadius: radii.lg,
    justifyContent: "center",
    minHeight: 48,
    minWidth: 48,
    paddingHorizontal: spacing.sm,
  },
  divider: {
    height: 18,
    width: StyleSheet.hairlineWidth,
  },
  logo: {
    alignItems: "center",
    height: 44,
    justifyContent: "center",
    width: 44,
  },
  pendingDot: {
    borderRadius: radii.xs,
    height: 7,
    position: "absolute",
    right: 9,
    top: 9,
    width: 7,
  },
  pressed: {
    opacity: 0.55,
  },
  row: {
    alignItems: "center",
    flexDirection: "row",
    gap: spacing.md,
    justifyContent: "space-between",
  },
  subtitle: {
    marginTop: spacing.xs,
  },
  titleSection: {
    marginTop: spacing.xl,
  },
  wrapper: {
    paddingBottom: spacing.lg,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
  },
});
