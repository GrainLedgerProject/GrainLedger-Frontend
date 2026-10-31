import { spacing } from '../theme/tokens';
import React, { useState } from 'react';
import {
  Alert,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  View,
} from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Button } from '../components/common/Button';
import { Card } from '../components/common/Card';
import { AccountAccessPanel } from '../components/auth/AccountAccessPanel';
import { GlassBadge } from '../components/common/GlassBadge';
import { InputField } from '../components/common/InputField';
import { AppIcon, type AppIconName } from '../components/ui/AppIcon';
import { AppText } from '../components/ui/AppText';
import { api } from '../services/api';
import { useAuthStore } from '../store/authStore';
import { useAppTheme } from '../theme';
import { type UserRole } from '../types/roles';

const MOCK_ROLES: {
  role: UserRole;
  title: string;
  subtitle: string;
  icon: AppIconName;
}[] = [
  {
    role: 'CUSTOMER_PROCUREMENT_OFFICER',
    title: 'Cán bộ Thu mua',
    subtitle: 'Thực địa, nông hộ, phiếu cân',
    icon: 'field',
  },
  {
    role: 'MILL_OPERATOR',
    title: 'Vận hành Nhà máy',
    subtitle: 'Cân xe, sấy, xay xát, đóng bao',
    icon: 'mill',
  },
  {
    role: 'MILL_MANAGER',
    title: 'Quản đốc Nhà máy',
    subtitle: 'Đối soát dung sai, tồn kho silo',
    icon: 'settings',
  },
  {
    role: 'CUSTOMER_MANAGER',
    title: 'Quản lý Tuân thủ',
    subtitle: 'Kiểm định MRL Lab & phát lệnh HOLD',
    icon: 'compliance',
  },
  {
    role: 'MILL_ADMIN',
    title: 'Quản trị viên',
    subtitle: 'Cấu hình toàn quyền hệ thống',
    icon: 'warning',
  },
];

export default function LoginScreen() {
  const router = useRouter();
  const theme = useAppTheme();
  const { loginWithCredentials, loginAsMock, isLoading } = useAuthStore();

  const [email, setEmail] = useState('purchasing@grainledger.local');
  const [password, setPassword] = useState('Grainledger@1');
  const [showDevSettings, setShowDevSettings] = useState(false);
  const [serverUrl, setServerUrl] = useState(api.getBaseUrl());
  const [testingServer, setTestingServer] = useState(false);
  const [serverStatus, setServerStatus] = useState<'idle' | 'ok' | 'error'>('idle');

  const handleLogin = async () => {
    if (!email.trim() || !password.trim()) {
      Alert.alert('Thiếu thông tin', 'Vui lòng nhập đầy đủ email và mật khẩu.');
      return;
    }

    const res = await loginWithCredentials(email, password);
    if (res.success) {
      router.replace('/(tabs)');
      return;
    }

    Alert.alert(
      'Không thể kết nối máy chủ',
      `${res.error || 'Máy chủ đang ngoại tuyến'}.\n\nBạn có muốn đăng nhập bằng tài khoản Demo Mock để xem thử toàn bộ giao diện không?`,
      [
        { text: 'Thử lại', style: 'cancel' },
        {
          text: 'Dùng Tài khoản Demo',
          onPress: async () => {
            await loginAsMock('CUSTOMER_PROCUREMENT_OFFICER');
            router.replace('/(tabs)');
          },
        },
      ],
    );
  };

  const handleDirectMockLogin = async (role: UserRole) => {
    await loginAsMock(role);
    router.replace('/(tabs)');
  };

  const handleSaveServerUrl = async () => {
    await api.setBaseUrl(serverUrl);
    const normalized = api.getBaseUrl();
    setServerUrl(normalized);
    Alert.alert('Thành công', `Đã lưu địa chỉ máy chủ: ${normalized}`);
  };

  const handleTestConnection = async () => {
    setTestingServer(true);
    setServerStatus('idle');

    await api.setBaseUrl(serverUrl);
    const normalized = api.getBaseUrl();
    setServerUrl(normalized);

    const res = await api.request<{ status?: string }>('/health');
    setTestingServer(false);

    if (res.data && !res.isMock) {
      setServerStatus('ok');
      Alert.alert(
        'Kết nối thành công',
        `Máy chủ backend đang phản hồi tốt!\nURL: ${normalized}\nTrạng thái: ${
          typeof res.data === 'object' && res.data.status ? res.data.status : 'OK'
        }`,
      );
      return;
    }

    setServerStatus('error');
    Alert.alert(
      'Không thể kết nối',
      `Không thể kết nối tới ${normalized}.\n\nLỗi: ${
        res.error || 'Timeout hoặc máy chủ không phản hồi'
      }\n\nGợi ý: Bạn có thể chọn ngay một trong các "Tài khoản Demo" bên dưới để trải nghiệm đầy đủ giao diện ứng dụng!`,
    );
  };

  const handleSelectPreset = (url: string) => {
    setServerUrl(url);
    void api.setBaseUrl(url);
    setServerStatus('idle');
  };

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: theme.colors.background }]}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={styles.flex}
      >
        <ScrollView
          contentContainerStyle={styles.container}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.brandSection}>
            <View
              style={[
                styles.logo,
                { backgroundColor: theme.colors.accent, borderRadius: theme.radii.lg },
                theme.shadows.floating,
              ]}
            >
              <AppText variant="title2" style={{ color: theme.colors.onAccent }}>
                GL
              </AppText>
            </View>
            <AppText variant="title1" align="center" maxFontSizeMultiplier={1.35}>
              GrainLedger
            </AppText>
            <AppText
              variant="subheadline"
              color="secondaryLabel"
              align="center"
              style={styles.brandSubtitle}
            >
              Sổ cái và kiểm định tuân thủ MRL cho chuỗi lúa gạo Mekong
            </AppText>
          </View>

          <Card style={styles.section}>
            <View style={styles.sectionHeading}>
              <View
                style={[
                  styles.sectionIcon,
                  { backgroundColor: theme.colors.successMuted, borderRadius: theme.radii.sm },
                ]}
              >
                <AppIcon name="field" size={20} color={theme.colors.success} />
              </View>
              <View style={styles.flex}>
                <View style={styles.titleRow}>
                  <AppText variant="headline" style={styles.flex}>
                    Xem thử theo vai trò
                  </AppText>
                  <GlassBadge status="COMPLETED" label="Không cần backend" />
                </View>
                <AppText variant="footnote" color="secondaryLabel" style={styles.headingCaption}>
                  Chọn một vai trò để khám phá dữ liệu mẫu và các luồng nghiệp vụ.
                </AppText>
              </View>
            </View>

            <View
              style={[
                styles.roleList,
                { borderColor: theme.colors.separator, borderRadius: theme.radii.md },
              ]}
            >
              {MOCK_ROLES.map((item, index) => (
                <Pressable
                  key={item.role}
                  accessibilityRole="button"
                  accessibilityLabel={`${item.title}. ${item.subtitle}`}
                  onPress={() => void handleDirectMockLogin(item.role)}
                  style={({ pressed }) => [
                    styles.roleRow,
                    index < MOCK_ROLES.length - 1 && {
                      borderBottomColor: theme.colors.separator,
                      borderBottomWidth: StyleSheet.hairlineWidth,
                    },
                    pressed && { backgroundColor: theme.colors.surfaceSecondary },
                  ]}
                >
                  <View
                    style={[
                      styles.roleIcon,
                      { backgroundColor: theme.colors.accentMuted, borderRadius: theme.radii.sm },
                    ]}
                  >
                    <AppIcon name={item.icon} size={19} color={theme.colors.accent} />
                  </View>
                  <View style={styles.flex}>
                    <AppText variant="subheadline" style={styles.rowTitle}>
                      {item.title}
                    </AppText>
                    <AppText variant="caption" color="secondaryLabel">
                      {item.subtitle}
                    </AppText>
                  </View>
                  <AppIcon name="forward" size={16} color={theme.colors.tertiaryLabel} />
                </Pressable>
              ))}
            </View>
          </Card>

          <Card style={styles.section}>
            <AppText variant="title3" style={styles.cardTitle}>
              Đăng nhập doanh nghiệp
            </AppText>
            <InputField
              label="Email công vụ"
              required
              value={email}
              onChangeText={setEmail}
              keyboardType="email-address"
              autoCapitalize="none"
              autoComplete="email"
            />
            <InputField
              label="Mật khẩu"
              required
              value={password}
              onChangeText={setPassword}
              secureTextEntry
              autoComplete="current-password"
            />
            <Button
              title="Đăng nhập máy chủ"
              variant="primary"
              size="large"
              loading={isLoading}
              onPress={() => void handleLogin()}
              style={styles.fullWidth}
            />
          </Card>

          <AccountAccessPanel onReady={(address) => { setEmail(address); setPassword(''); }} />

          <Card style={styles.section}>
            <Pressable
              accessibilityRole="button"
              accessibilityState={{ expanded: showDevSettings }}
              accessibilityLabel="Cấu hình máy chủ backend"
              hitSlop={4}
              onPress={() => setShowDevSettings((current) => !current)}
              style={({ pressed }) => [styles.devHeader, pressed && styles.pressed]}
            >
              <View
                style={[
                  styles.sectionIcon,
                  { backgroundColor: theme.colors.warningMuted, borderRadius: theme.radii.sm },
                ]}
              >
                <AppIcon name="settings" size={19} color={theme.colors.warning} />
              </View>
              <View style={styles.flex}>
                <View style={styles.titleRow}>
                  <AppText variant="subheadline" style={styles.rowTitle}>
                    Cấu hình máy chủ
                  </AppText>
                  {serverStatus !== 'idle' ? (
                    <GlassBadge
                      status={serverStatus === 'ok' ? 'PASS' : 'FAIL'}
                      label={serverStatus === 'ok' ? 'Online' : 'Lỗi'}
                    />
                  ) : null}
                </View>
                <AppText variant="caption" color="secondaryLabel" numberOfLines={1}>
                  {api.getBaseUrl()}
                </AppText>
              </View>
              <AppIcon
                name={showDevSettings ? 'hidden' : 'visible'}
                size={18}
                color={theme.colors.tertiaryLabel}
              />
            </Pressable>

            {showDevSettings ? (
              <View
                style={[styles.devBody, { borderTopColor: theme.colors.separator }]}
              >
                <InputField
                  label="Địa chỉ API Backend"
                  value={serverUrl}
                  onChangeText={(value) => {
                    setServerUrl(value);
                    setServerStatus('idle');
                  }}
                  placeholder="http://10.0.2.2:5080 hoặc IP LAN"
                  autoCapitalize="none"
                  autoCorrect={false}
                />

                <AppText variant="captionStrong" color="secondaryLabel" style={styles.presetLabel}>
                  Địa chỉ thường dùng
                </AppText>
                <View style={styles.presetRow}>
                  {[
                    { label: 'Máy ảo Android', url: 'http://10.0.2.2:5080' },
                    { label: 'Localhost', url: 'http://localhost:5080' },
                  ].map((preset) => {
                    const selected = serverUrl.includes(
                      preset.url.includes('10.0.2.2') ? '10.0.2.2' : 'localhost',
                    );
                    return (
                      <Pressable
                        key={preset.url}
                        accessibilityRole="button"
                        accessibilityState={{ selected }}
                        onPress={() => handleSelectPreset(preset.url)}
                        style={({ pressed }) => [
                          styles.preset,
                          {
                            backgroundColor: selected
                              ? theme.colors.accent
                              : theme.colors.surfaceSecondary,
                            borderRadius: theme.radii.pill,
                          },
                          pressed && styles.pressed,
                        ]}
                      >
                        <AppText
                          variant="captionStrong"
                          maxFontSizeMultiplier={1.3}
                          style={{
                            color: selected
                              ? theme.colors.onAccent
                              : theme.colors.secondaryLabel,
                          }}
                        >
                          {preset.label}
                        </AppText>
                      </Pressable>
                    );
                  })}
                </View>

                <View style={styles.actions}>
                  <Button
                    title="Lưu URL"
                    size="small"
                    variant="secondary"
                    style={styles.flex}
                    onPress={() => void handleSaveServerUrl()}
                  />
                  <Button
                    title="Kiểm tra"
                    size="small"
                    variant="primary"
                    loading={testingServer}
                    style={styles.flex}
                    onPress={() => void handleTestConnection()}
                  />
                </View>
              </View>
            ) : null}
          </Card>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  actions: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginTop: spacing.xs,
  },
  brandSection: {
    alignItems: 'center',
    marginBottom: spacing.xl,
  },
  brandSubtitle: {
    marginTop: spacing.sm,
    maxWidth: 330,
  },
  cardTitle: {
    marginBottom: spacing.lg,
  },
  container: {
    alignSelf: 'center',
    maxWidth: 640,
    paddingBottom: spacing.xxl,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.xxl,
    width: '100%',
  },
  devBody: {
    borderTopWidth: StyleSheet.hairlineWidth,
    marginTop: spacing.lg,
    paddingTop: spacing.lg,
  },
  devHeader: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: spacing.md,
    minHeight: 48,
  },
  flex: {
    flex: 1,
  },
  fullWidth: {
    alignSelf: 'stretch',
  },
  headingCaption: {
    marginTop: spacing.xs,
  },
  logo: {
    alignItems: 'center',
    height: 64,
    justifyContent: 'center',
    marginBottom: spacing.lg,
    width: 64,
  },
  preset: {
    minHeight: 40,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  presetLabel: {
    marginBottom: spacing.sm,
  },
  presetRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
    marginBottom: spacing.lg,
  },
  pressed: {
    opacity: 0.6,
  },
  roleIcon: {
    alignItems: 'center',
    height: 36,
    justifyContent: 'center',
    width: 36,
  },
  roleList: {
    borderWidth: StyleSheet.hairlineWidth,
    overflow: 'hidden',
  },
  roleRow: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: spacing.md,
    minHeight: 64,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  rowTitle: {
    fontWeight: '600',
  },
  safeArea: {
    flex: 1,
  },
  section: {
    marginBottom: spacing.lg,
    padding: spacing.lg,
  },
  sectionHeading: {
    alignItems: 'flex-start',
    flexDirection: 'row',
    gap: spacing.md,
    marginBottom: spacing.lg,
  },
  sectionIcon: {
    alignItems: 'center',
    height: 38,
    justifyContent: 'center',
    width: 38,
  },
  titleRow: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: spacing.sm,
  },
});
