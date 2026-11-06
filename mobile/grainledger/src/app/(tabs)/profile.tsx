import { useRouter } from "expo-router";
import { useMemo, useState } from "react";
import { SafeAreaView } from "react-native-safe-area-context";
import {
  Building,
  Cloud,
  KeyRound,
  LogOut,
  Server,
  Shield,
  Sparkles,
} from "../../components/ui/named-icons";
import { radii, spacing } from "../../theme/tokens";

import {
  Alert,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { GlassBadge } from "../../components/common/GlassBadge";
import { GlassButton } from "../../components/common/GlassButton";
import { GlassCard } from "../../components/common/GlassCard";
import { GlassHeader } from "../../components/common/GlassHeader";
import { GlassInput } from "../../components/common/GlassInput";
import { AdminPanel } from "../../components/profile/AdminPanel";
import { AuditHistoryPanel } from "../../components/profile/AuditHistoryPanel";
import { CatalogPanel } from "../../components/profile/CatalogPanel";
import { api } from "../../services/api";
import { useAuthStore } from "../../store/authStore";
import { useOfflineStore } from "../../store/offlineStore";
import { useAppTheme, type AppTheme } from "../../theme";
import { AppleGlass } from "../../theme/appleGlass";
import { ROLE_DEFINITIONS, UserRole } from "../../types/roles";

export default function ProfileScreen() {
  const Colors = usePalette();
  const styles = createStyles(Colors);
  const router = useRouter();
  const theme = useAppTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);
  const { user, activeRole, logout, loginAsMock, updateProfile } =
    useAuthStore();
  const { isSyncing, lastSyncedAt, syncAll, getPendingCount } =
    useOfflineStore();

  const [apiUrl, setApiUrl] = useState(api.getBaseUrl());
  const [testingConnection, setTestingConnection] = useState(false);
  const [editingProfile, setEditingProfile] = useState(false);
  const [displayName, setDisplayName] = useState(user?.displayName ?? "");
  const [phoneNumber, setPhoneNumber] = useState(user?.phoneNumber ?? "");
  const [savingProfile, setSavingProfile] = useState(false);
  const handleSaveProfile = async () => {
    setSavingProfile(true);
    try {
      const result = await updateProfile(displayName, phoneNumber);
      if (!result.success) {
        Alert.alert("Chưa thể cập nhật", result.error);
        return;
      }
      setEditingProfile(false);
      Alert.alert("Đã lưu", "Thông tin hồ sơ đã được cập nhật.");
    } catch {
      Alert.alert("Chưa thể cập nhật", "Vui lòng thử lại.");
    } finally {
      setSavingProfile(false);
    }
  };
  const pendingCount = getPendingCount();

  const handleSaveApiUrl = async () => {
    await api.setBaseUrl(apiUrl);
    const normalized = api.getBaseUrl();
    setApiUrl(normalized);
    Alert.alert("Thành công", `Đã lưu địa chỉ máy chủ: ${normalized}`);
  };

  const handleTestConnection = async () => {
    setTestingConnection(true);
    const res = await api.request<{ status?: string }>("/health");
    setTestingConnection(false);

    if (res.data && !res.isMock) {
      Alert.alert(
        "Kết nối thành công",
        `Máy chủ GrainLedger backend đang phản hồi tốt!\nURL: ${api.getBaseUrl()}\nTrạng thái: ${
          typeof res.data === "object" && res.data.status
            ? res.data.status
            : "OK"
        }`,
      );
    } else {
      Alert.alert(
        "Không thể kết nối máy chủ",
        `Không thể kết nối trực tiếp đến ${api.getBaseUrl()}.\n\nChi tiết lỗi: ${
          res.error || "Máy chủ không phản hồi"
        }\n\nVui lòng kiểm tra lại URL máy chủ hoặc trạng thái backend.`,
      );
    }
  };

  const handleSwitchMockRole = async (role: UserRole) => {
    await loginAsMock(role);
    Alert.alert(
      "Đã đổi vai trò",
      `Hiện đang xem thử dưới quyền: ${ROLE_DEFINITIONS[role]?.labelVi}`,
    );
  };

  const roleLabel =
    (activeRole && ROLE_DEFINITIONS[activeRole]?.labelVi) ||
    user?.role ||
    "Chưa gán vai trò";

  return (
    <SafeAreaView
      style={[styles.safeArea, { backgroundColor: theme.colors.background }]}
    >
      <GlassHeader
        title="Tài khoản & Cài đặt"
        subtitle="Thông tin tài khoản, máy chủ kết nối và dữ liệu ngoại tuyến"
      />

      <ScrollView
        keyboardShouldPersistTaps="handled"
        automaticallyAdjustKeyboardInsets
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Apple Glass Profile Card */}
        <GlassCard
          tintColor={theme.colors.surface}
          borderRadius={AppleGlass.radii.xl}
          elevated
          style={styles.profileCard}
        >
          <View style={styles.profileTop}>
            <View style={styles.avatarCircle}>
              <Text style={styles.avatarInitial}>
                {user?.displayName
                  ? user.displayName.charAt(0).toUpperCase()
                  : "U"}
              </Text>
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.userName}>
                {user?.displayName || "Chưa đăng nhập"}
              </Text>
              <Text style={styles.userEmail}>{user?.email || "N/A"}</Text>
              <View style={styles.roleRow}>
                <GlassBadge status="COMMITTED" label={roleLabel} size="small" />
              </View>
            </View>
          </View>

          <View style={styles.divider} />

          <View style={styles.infoRow}>
            <Building size={16} color={theme.colors.secondaryLabel} />
            <Text style={styles.infoText}>
              {user?.organizationName || "Chưa gán đơn vị"}
            </Text>
          </View>

          {user?.assignedFacilities && user.assignedFacilities.length > 0 ? (
            <View style={[styles.infoRow, { marginTop: spacing.xs }]}>
              <Shield size={16} color={theme.colors.secondaryLabel} />
              <Text style={styles.infoText}>
                Phạm vi: {user.assignedFacilities.join(", ")}
              </Text>
            </View>
          ) : null}

          {user?.permissions && user.permissions.length > 0 ? (
            <View style={{ marginTop: spacing.sm }}>
              <View style={[styles.infoRow, { marginBottom: spacing.xs }]}>
                <KeyRound size={16} color={theme.colors.secondaryLabel} />
                <Text style={styles.permissionTitle}>
                  Quyền hạn được cấp ({user.permissions.length}):
                </Text>
              </View>
              <View style={styles.permissionList}>
                {user.permissions.map((p) => (
                  <View key={p} style={styles.permissionBadge}>
                    <Text style={styles.permissionBadgeText}>{p}</Text>
                  </View>
                ))}
              </View>
            </View>
          ) : null}
        </GlassCard>

        <GlassCard style={{ marginBottom: theme.spacing.lg }}>
          {editingProfile ? (
            <>
              <GlassInput
                label="Tên hiển thị"
                value={displayName}
                onChangeText={setDisplayName}
                editable={!savingProfile}
                autoComplete="name"
              />
              <GlassInput
                label="Số điện thoại"
                value={phoneNumber}
                onChangeText={setPhoneNumber}
                editable={!savingProfile}
                keyboardType="phone-pad"
                autoComplete="tel"
              />
              <GlassButton
                title="Lưu hồ sơ"
                onPress={handleSaveProfile}
                loading={savingProfile}
                disabled={!displayName.trim()}
              />
              <GlassButton
                title="Hủy"
                variant="secondary"
                disabled={savingProfile}
                onPress={() => setEditingProfile(false)}
              />
            </>
          ) : (
            <GlassButton
              title="Chỉnh sửa hồ sơ"
              variant="secondary"
              onPress={() => {
                setDisplayName(user?.displayName ?? "");
                setPhoneNumber(user?.phoneNumber ?? "");
                setEditingProfile(true);
              }}
            />
          )}
        </GlassCard>

        {/* DEMO / MOCK ROLE SWITCHER */}
        <GlassCard
          tintColor={theme.colors.surface}
          borderTint={theme.colors.separator}
          borderRadius={AppleGlass.radii.lg}
          style={styles.roleSwitcherCard}
        >
          <View style={styles.roleSwitcherHeader}>
            <View style={styles.roleSwitcherIconBox}>
              <Sparkles size={16} color={theme.colors.success} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.roleSwitcherTitle}>
                Chuyển đổi Vai trò Xem thử (Demo)
              </Text>
              <Text style={styles.roleSwitcherSub}>
                Chạm để đổi vai trò trực tiếp và kiểm tra quyền hạn giao diện:
              </Text>
            </View>
          </View>

          <View style={styles.roleChipsGrid}>
            {(
              [
                "CUSTOMER_PROCUREMENT_OFFICER",
                "MILL_OPERATOR",
                "MILL_MANAGER",
                "CUSTOMER_MANAGER",
                "MILL_ADMIN",
              ] as UserRole[]
            ).map((r) => {
              const meta = ROLE_DEFINITIONS[r];
              const isSelected = activeRole === r;
              return (
                <TouchableOpacity
                  key={r}
                  style={[styles.roleChip, isSelected && styles.roleChipActive]}
                  onPress={() => handleSwitchMockRole(r)}
                  activeOpacity={0.7}
                >
                  <Text
                    style={[
                      styles.roleChipText,
                      isSelected && styles.roleChipTextActive,
                    ]}
                  >
                    {meta.code} - {meta.labelVi}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </GlassCard>

        {/* Offline Sync Manager Card */}
        <GlassCard
          tintColor={theme.colors.surface}
          borderRadius={AppleGlass.radii.lg}
          style={styles.syncCard}
        >
          <View style={styles.syncHeader}>
            <View style={styles.syncIconBox}>
              <Cloud
                size={20}
                color={
                  pendingCount > 0 ? theme.colors.warning : theme.colors.success
                }
              />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.syncTitle}>Quản lý Đồng bộ Ngoại tuyến</Text>
              <Text style={styles.syncSubtitle}>
                {pendingCount > 0
                  ? `${pendingCount} giao dịch chưa gửi máy chủ`
                  : "Dữ liệu đã được đồng bộ hoàn toàn"}
              </Text>
            </View>
          </View>

          <View style={styles.syncInfoRow}>
            <Text style={styles.syncInfoLabel}>Lần đồng bộ cuối:</Text>
            <Text style={styles.syncInfoVal}>
              {lastSyncedAt
                ? new Date(lastSyncedAt).toLocaleTimeString("vi-VN")
                : "Vừa xong"}
            </Text>
          </View>

          <View style={styles.syncButtonsGroup}>
            <GlassButton
              title="Xem hàng đợi"
              size="small"
              variant="secondary"
              onPress={() => router.push("/offline-queue")}
              style={{ flex: 1 }}
            />
            <GlassButton
              title="Đồng bộ ngay"
              size="small"
              variant="primary"
              loading={isSyncing}
              onPress={syncAll}
              style={{ flex: 1 }}
            />
          </View>
        </GlassCard>

        {/* Server Connection Config */}
        <GlassCard
          tintColor={theme.colors.surface}
          borderRadius={AppleGlass.radii.lg}
          style={styles.serverCard}
        >
          <View style={styles.serverHeader}>
            <Server size={18} color={theme.colors.accent} />
            <Text style={styles.serverTitle}>
              Địa chỉ Máy chủ (API Base URL)
            </Text>
          </View>

          <Text style={styles.serverDesc}>
            Cấu hình endpoint backend cho ứng dụng (hỗ trợ localhost, LAN IP
            hoặc Cloud Gateway).
          </Text>

          <GlassInput
            value={apiUrl}
            onChangeText={setApiUrl}
            placeholder="http://10.0.2.2:5080 hoặc domain"
            autoCapitalize="none"
            autoCorrect={false}
          />

          <View style={styles.serverActionsGroup}>
            <GlassButton
              title="Kiểm tra kết nối"
              size="small"
              variant="secondary"
              loading={testingConnection}
              onPress={handleTestConnection}
              style={{ flex: 1 }}
            />
            <GlassButton
              title="Lưu cấu hình"
              size="small"
              variant="primary"
              onPress={handleSaveApiUrl}
              style={{ flex: 1 }}
            />
          </View>
        </GlassCard>

        {activeRole === "MILL_ADMIN" ? (
          <>
            <AdminPanel key={`admin-${user?.id ?? "signed-out"}`} />
            <CatalogPanel key={`catalog-${user?.id ?? "signed-out"}`} />
          </>
        ) : null}
        <AuditHistoryPanel key={user?.id ?? "signed-out"} />

        {/* Logout Button */}
        <GlassButton
          title="Đăng xuất khỏi thiết bị"
          variant="danger"
          size="large"
          icon={<LogOut size={18} color={theme.colors.surface} />}
          onPress={() => {
            Alert.alert(
              "Đăng xuất",
              "Bạn có chắc chắn muốn đăng xuất tài khoản này?",
              [
                { text: "Huỷ", style: "cancel" },
                { text: "Đăng xuất", style: "destructive", onPress: logout },
              ],
            );
          }}
          fullWidth
          style={styles.logoutBtn}
        />
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
    scroll: {
      flex: 1,
    },
    scrollContent: {
      padding: spacing.lg,
      paddingBottom: spacing.huge,
    },
    profileCard: {
      marginBottom: spacing.lg,
    },
    profileTop: {
      flexDirection: "row",
      gap: spacing.md,
      alignItems: "center",
    },
    avatarCircle: {
      width: 54,
      height: 54,
      borderRadius: AppleGlass.radii.pill,
      backgroundColor: theme.colors.surfaceSecondary,
      alignItems: "center",
      justifyContent: "center",
      ...AppleGlass.shadows.glassSubtle,
    },
    avatarInitial: {
      ...theme.typography.title2,
      fontWeight: "800",
      color: theme.colors.label,
    },
    userName: {
      ...theme.typography.headline,
      fontWeight: "800",
      color: theme.colors.label,
    },
    userEmail: {
      ...theme.typography.footnote,
      color: theme.colors.secondaryLabel,
      marginTop: spacing.xxs,
    },
    roleRow: {
      marginTop: spacing.xs,
    },
    divider: {
      height: 1,
      backgroundColor: theme.colors.separator,
      marginVertical: spacing.md,
    },
    infoRow: {
      flexDirection: "row",
      alignItems: "center",
      gap: spacing.sm,
    },
    infoText: {
      ...theme.typography.footnote,
      color: theme.colors.label,
      fontWeight: "500",
    },
    permissionTitle: {
      ...theme.typography.caption,
      fontWeight: "700",
      color: theme.colors.secondaryLabel,
    },
    permissionList: {
      flexDirection: "row",
      flexWrap: "wrap",
      gap: spacing.xs,
    },
    permissionBadge: {
      backgroundColor: theme.colors.surfaceSecondary,
      paddingHorizontal: spacing.sm,
      paddingVertical: spacing.xxs,
      borderRadius: radii.xs,
      borderWidth: 1,
      borderColor: theme.colors.separator,
    },
    permissionBadgeText: {
      ...theme.typography.caption,
      fontWeight: "600",
      color: theme.colors.secondaryLabel,
    },
    roleSwitcherCard: {
      marginBottom: spacing.lg,
    },
    roleSwitcherHeader: {
      flexDirection: "row",
      alignItems: "center",
      gap: spacing.sm,
      marginBottom: spacing.sm,
    },
    roleSwitcherIconBox: {
      width: 32,
      height: 32,
      borderRadius: radii.xs,
      backgroundColor: theme.colors.successMuted,
      alignItems: "center",
      justifyContent: "center",
    },
    roleSwitcherTitle: {
      ...theme.typography.subheadline,
      fontWeight: "800",
      color: theme.colors.label,
    },
    roleSwitcherSub: {
      ...theme.typography.caption,
      color: theme.colors.secondaryLabel,
      marginTop: spacing.xxs,
    },
    roleChipsGrid: {
      flexDirection: "row",
      flexWrap: "wrap",
      gap: spacing.sm,
      marginTop: spacing.sm,
    },
    roleChip: {
      paddingHorizontal: spacing.sm,
      paddingVertical: spacing.xs,
      borderRadius: AppleGlass.radii.pill,
      backgroundColor: theme.colors.surface,
      borderWidth: 1,
      borderColor: theme.colors.accentMuted,
    },
    roleChipActive: {
      backgroundColor: theme.colors.accent,
      borderColor: theme.colors.accent,
    },
    roleChipText: {
      ...theme.typography.caption,
      fontWeight: "700",
      color: theme.colors.accent,
    },
    roleChipTextActive: {
      color: theme.colors.surface,
    },
    syncCard: {
      marginBottom: spacing.lg,
    },
    syncHeader: {
      flexDirection: "row",
      alignItems: "center",
      gap: spacing.md,
    },
    syncIconBox: {
      width: 38,
      height: 38,
      borderRadius: radii.xs,
      backgroundColor: theme.colors.surfaceSecondary,
      alignItems: "center",
      justifyContent: "center",
    },
    syncTitle: {
      ...theme.typography.subheadline,
      fontWeight: "800",
      color: theme.colors.label,
    },
    syncSubtitle: {
      ...theme.typography.caption,
      color: theme.colors.secondaryLabel,
      marginTop: spacing.xxs,
    },
    syncInfoRow: {
      flexDirection: "row",
      justifyContent: "space-between",
      marginVertical: spacing.md,
    },
    syncInfoLabel: {
      ...theme.typography.caption,
      color: theme.colors.secondaryLabel,
    },
    syncInfoVal: {
      ...theme.typography.caption,
      fontWeight: "600",
      color: theme.colors.label,
    },
    syncButtonsGroup: {
      flexDirection: "row",
      gap: spacing.sm,
    },
    serverCard: {
      marginBottom: spacing.lg,
    },
    serverHeader: {
      flexDirection: "row",
      alignItems: "center",
      gap: spacing.sm,
      marginBottom: spacing.xs,
    },
    serverTitle: {
      ...theme.typography.subheadline,
      fontWeight: "800",
      color: theme.colors.label,
    },
    serverDesc: {
      ...theme.typography.caption,
      color: theme.colors.secondaryLabel,
      lineHeight: 16,
      marginBottom: spacing.md,
    },
    serverActionsGroup: {
      flexDirection: "row",
      gap: spacing.sm,
      marginTop: spacing.xs,
    },
    logoutBtn: {
      marginBottom: spacing.xxl,
    },
  });
