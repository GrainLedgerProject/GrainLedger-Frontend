import { Link } from 'expo-router';
import { useCallback, useState } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { GlassButton } from '@/components/glass/GlassButton';
import { GlassCard } from '@/components/glass/GlassCard';
import { GlassInput } from '@/components/glass/GlassInput';
import { useAuth } from '@/features/auth/AuthProvider';
import { useAppTheme } from '@/theme/ThemeProvider';
import type { ThemeMode } from '@/theme/tokens';
import {
  createProfileService,
  ROLE_DETAILS,
  validateProfile,
  type ProfileValidationErrors,
} from './profile-api';

export function ProfileScreen() {
  const { user, client, busy: authBusy, message: authMessage } = useAuth();
  const { theme, mode, setMode } = useAppTheme();
  const { colors: c, typography: t, spacing: s } = theme;

  const [locale, setLocale] = useState<'vi' | 'en'>('vi');
  const tr = useCallback((vi: string, en: string) => (locale === 'vi' ? vi : en), [locale]);

  // Form states
  const [displayName, setDisplayName] = useState(user?.displayName ?? '');
  const [phoneNumber, setPhoneNumber] = useState(user?.phoneNumber ?? '');
  const [errors, setErrors] = useState<ProfileValidationErrors>({});
  const [attempted, setAttempted] = useState(false);

  // Async action states
  const [saving, setSaving] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const profileService = createProfileService(client.api);

  // Sync state if user changes externally
  const [prevUser, setPrevUser] = useState(user);
  if (user && user !== prevUser) {
    setPrevUser(user);
    setDisplayName(user.displayName);
    setPhoneNumber(user.phoneNumber ?? '');
  }

  const initials = displayName
    ? displayName
        .trim()
        .split(/\s+/)
        .map((part) => part[0])
        .filter(Boolean)
        .slice(0, 2)
        .join('')
        .toUpperCase()
    : 'GL';

  const roleInfo = user?.normalizedRole ? ROLE_DETAILS[user.normalizedRole] : null;

  const handleRefresh = useCallback(async () => {
    setRefreshing(true);
    setErrorMessage(null);
    try {
      const refreshed = await profileService.getProfile();
      client.updateUser?.(refreshed);
      setDisplayName(refreshed.displayName);
      setPhoneNumber(refreshed.phoneNumber ?? '');
    } catch (err) {
      setErrorMessage(
        err instanceof Error
          ? err.message
          : tr('Không thể làm mới thông tin hồ sơ.', 'Unable to refresh profile information.')
      );
    } finally {
      setRefreshing(false);
    }
  }, [client, profileService, tr]);

  const handleSave = async () => {
    setAttempted(true);
    setSuccessMessage(null);
    setErrorMessage(null);

    const validation = validateProfile({ displayName, phoneNumber });
    setErrors(validation);
    if (validation.displayName || validation.phoneNumber) {
      return;
    }

    setSaving(true);
    try {
      const updatedUser = await profileService.updateProfile({
        displayName: displayName.trim(),
        phoneNumber: phoneNumber.trim() ? phoneNumber.trim() : null,
      });

      // Update global auth store immediately
      client.updateUser?.(updatedUser);

      setSuccessMessage(
        tr('Thông tin cá nhân đã được lưu thành công.', 'Profile information updated successfully.')
      );
    } catch (err: any) {
      if (err?.status === 412) {
        setErrorMessage(
          tr(
            'Hồ sơ đã bị thay đổi đồng thời từ phiên khác. Vui lòng làm mới để xem dữ liệu mới nhất.',
            'The profile was modified concurrently from another session. Please refresh to load the latest data.'
          )
        );
      } else {
        setErrorMessage(
          err?.message ||
            tr('Không thể lưu thông tin cá nhân. Vui lòng thử lại.', 'Unable to save profile changes. Please try again.')
        );
      }
    } finally {
      setSaving(false);
    }
  };

  const modes: { key: ThemeMode; label: string }[] = [
    { key: 'system', label: tr('Tự động', 'System') },
    { key: 'light', label: tr('Sáng', 'Light') },
    { key: 'dark', label: tr('Tối', 'Dark') },
  ];

  return (
    <SafeAreaView edges={['top', 'left', 'right']} style={[styles.root, { backgroundColor: c.backgroundGrouped }]}>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode="on-drag"
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={() => {
                void handleRefresh();
              }}
              tintColor={c.primary}
            />
          }
          contentContainerStyle={[
            styles.content,
            {
              padding: s.page,
              gap: s.lg,
              maxWidth: 680,
            },
          ]}
        >
          {/* Top Bar */}
          <View style={styles.header}>
            <View style={{ gap: 2 }}>
              <Text style={[t.caption, styles.brand, { color: c.primary }]}>GRAINLEDGER</Text>
              <Text accessibilityRole="header" style={[t.display, { color: c.textPrimary }]}>
                {tr('Hồ sơ cá nhân', 'Account Profile')}
              </Text>
            </View>
            <GlassButton
              label={locale === 'vi' ? 'EN' : 'VI'}
              variant="glass"
              onPress={() => setLocale(locale === 'vi' ? 'en' : 'vi')}
            />
          </View>

          {/* Success & Error Banners */}
          {successMessage ? (
            <View accessibilityLiveRegion="polite" style={[styles.banner, { backgroundColor: c.successSurface, borderColor: c.border }]}>
              <Text style={[t.label, { color: c.success, fontWeight: '700' }]}>✓ {successMessage}</Text>
            </View>
          ) : null}
          {errorMessage ? (
            <View accessibilityRole="alert" accessibilityLiveRegion="polite" style={[styles.banner, { backgroundColor: c.dangerSurface, borderColor: c.border }]}>
              <Text style={[t.label, { color: c.danger, fontWeight: '700' }]}>✕ {errorMessage}</Text>
            </View>
          ) : null}

          {/* Identity Header Card */}
          <GlassCard opaque padding="lg">
            <View style={styles.userRow}>
              <View style={[styles.avatar, { backgroundColor: c.selectedSurface, borderColor: c.border }]}>
                <Text style={[t.heading, { color: c.primary, fontWeight: '700' }]}>{initials}</Text>
              </View>
              <View style={styles.userInfo}>
                <Text accessibilityRole="header" style={[t.heading, { color: c.textPrimary }]}>
                  {user?.displayName || tr('Người dùng', 'User')}
                </Text>
                <Text style={[t.body, { color: c.textSecondary }]}>{user?.email || '—'}</Text>
              </View>
            </View>
          </GlassCard>

          {/* Editable Fields Section */}
          <View style={{ gap: s.xs }}>
            <Text style={[t.caption, styles.sectionHeader, { color: c.textSecondary }]}>
              {tr('THÔNG TIN CHỈNH SỬA', 'EDITABLE INFORMATION')}
            </Text>
            <GlassCard opaque padding="lg">
              <GlassInput
                label={tr('Họ và tên hiển thị *', 'Display Name *')}
                value={displayName}
                onChangeText={(val) => {
                  setDisplayName(val);
                  if (attempted) setErrors(validateProfile({ displayName: val, phoneNumber }));
                }}
                autoCapitalize="words"
                autoCorrect={false}
                returnKeyType="next"
                editable={!saving}
                error={
                  errors.displayName === 'required'
                    ? tr('Họ và tên không được để trống.', 'Display name is required.')
                    : errors.displayName === 'too_short'
                    ? tr('Họ và tên phải có ít nhất 2 ký tự.', 'Name must be at least 2 characters.')
                    : errors.displayName === 'too_long'
                    ? tr('Họ và tên tối đa 120 ký tự.', 'Name must not exceed 120 characters.')
                    : undefined
                }
              />

              <GlassInput
                label={tr('Số điện thoại liên lạc', 'Phone Number')}
                value={phoneNumber}
                onChangeText={(val) => {
                  setPhoneNumber(val);
                  if (attempted) setErrors(validateProfile({ displayName, phoneNumber: val }));
                }}
                keyboardType="phone-pad"
                autoCapitalize="none"
                autoCorrect={false}
                placeholder="09xx xxx xxx"
                returnKeyType="done"
                editable={!saving}
                error={
                  errors.phoneNumber === 'format'
                    ? tr('Số điện thoại không đúng định dạng (9-15 chữ số).', 'Invalid phone number format (9-15 digits).')
                    : errors.phoneNumber === 'too_long'
                    ? tr('Số điện thoại tối đa 32 ký tự.', 'Phone number too long.')
                    : undefined
                }
              />

              <View style={{ gap: 6 }}>
                <Text style={[t.label, { color: c.textPrimary }]}>
                  {tr('Ngôn ngữ giao diện', 'Display Language')}
                </Text>
                <View style={styles.segmentedRow}>
                  <Pressable
                    accessibilityRole="radio"
                    accessibilityState={{ selected: locale === 'vi' }}
                    onPress={() => setLocale('vi')}
                    style={[
                      styles.segmentButton,
                      {
                        backgroundColor: locale === 'vi' ? c.selectedSurface : c.surfaceRaised,
                        borderColor: locale === 'vi' ? c.primary : c.border,
                      },
                    ]}
                  >
                    <Text
                      style={[
                        t.caption,
                        {
                          color: locale === 'vi' ? c.primary : c.textSecondary,
                          fontWeight: locale === 'vi' ? '700' : '500',
                        },
                      ]}
                    >
                      Tiếng Việt (Mặc định)
                    </Text>
                  </Pressable>

                  <Pressable
                    accessibilityRole="radio"
                    accessibilityState={{ selected: locale === 'en' }}
                    onPress={() => setLocale('en')}
                    style={[
                      styles.segmentButton,
                      {
                        backgroundColor: locale === 'en' ? c.selectedSurface : c.surfaceRaised,
                        borderColor: locale === 'en' ? c.primary : c.border,
                      },
                    ]}
                  >
                    <Text
                      style={[
                        t.caption,
                        {
                          color: locale === 'en' ? c.primary : c.textSecondary,
                          fontWeight: locale === 'en' ? '700' : '500',
                        },
                      ]}
                    >
                      English (Export)
                    </Text>
                  </Pressable>
                </View>
              </View>

              <GlassButton
                label={tr('Lưu thay đổi', 'Save changes')}
                variant="primary"
                fullWidth
                loading={saving}
                loadingLabel={tr('Đang lưu…', 'Saving…')}
                onPress={() => {
                  void handleSave();
                }}
              />
            </GlassCard>
          </View>

          {/* Admin Managed Scope (Read-only) */}
          <View style={{ gap: s.xs }}>
            <View style={styles.scopeHeaderRow}>
              <Text style={[t.caption, styles.sectionHeader, { color: c.textSecondary }]}>
                {tr('PHẠM VI QUẢN TRỊ BỞI NHÀ MÁY (CHỈ ĐỌC)', 'ADMIN MANAGED SCOPE (READ ONLY)')}
              </Text>
              <Text style={[t.caption, { color: c.textSecondary }]}>🔒</Text>
            </View>
            <GlassCard opaque padding="lg">
              <View style={styles.detailRow}>
                <Text style={[t.caption, { color: c.textSecondary }]}>{tr('Email tài khoản', 'Account Email')}</Text>
                <Text selectable style={[t.label, styles.mono, { color: c.textPrimary }]}>
                  {user?.email || '—'}
                </Text>
              </View>
              <View style={[styles.divider, { backgroundColor: c.border }]} />

              <View style={styles.detailRow}>
                <Text style={[t.caption, { color: c.textSecondary }]}>{tr('Vai trò nghiệp vụ', 'Assigned Role')}</Text>
                <View style={{ alignItems: 'flex-end', gap: 2 }}>
                  <Text style={[t.label, { color: c.primary, fontWeight: '700' }]}>
                    {roleInfo ? (locale === 'vi' ? roleInfo.labelVi : roleInfo.labelEn) : user?.normalizedRole}
                  </Text>
                  <Text style={[t.caption, { color: c.textSecondary }]}>
                    {roleInfo ? `[${roleInfo.code}] · ${roleInfo.side}` : ''}
                  </Text>
                </View>
              </View>
              <View style={[styles.divider, { backgroundColor: c.border }]} />

              <View style={styles.detailRow}>
                <Text style={[t.caption, { color: c.textSecondary }]}>{tr('Đơn vị / Doanh nghiệp', 'Assigned Organization')}</Text>
                <Text style={[t.label, { color: c.textPrimary }]}>{user?.organizationName || tr('Toàn hệ thống', 'Global Scope')}</Text>
              </View>
              <View style={[styles.divider, { backgroundColor: c.border }]} />

              <View style={styles.detailRow}>
                <Text style={[t.caption, { color: c.textSecondary }]}>{tr('Trạng thái tài khoản', 'Account Status')}</Text>
                <Text style={[t.label, { color: user?.isActive ? c.primary : c.danger, fontWeight: '700' }]}>
                  {user?.isActive ? tr('Đang hoạt động', 'Active') : tr('Đã khóa', 'Inactive')}
                </Text>
              </View>
            </GlassCard>
          </View>

          {/* Security & Password Change */}
          <View style={{ gap: s.xs }}>
            <Text style={[t.caption, styles.sectionHeader, { color: c.textSecondary }]}>
              {tr('BẢO MẬT & MẬT KHẨU', 'SECURITY & PASSWORDS')}
            </Text>
            <GlassCard opaque padding="md">
              <View style={{ gap: 6 }}>
                <Text style={[t.body, { color: c.textPrimary, fontWeight: '600' }]}>
                  {tr('Đổi mật khẩu tài khoản', 'Change Password')}
                </Text>
                <Text style={[t.caption, { color: c.textSecondary, lineHeight: 18 }]}>
                  {tr(
                    'Tính năng đổi mật khẩu trực tiếp trong phiên sẽ được hoàn thiện trong Tác vụ 2 kế tiếp (/settings/security). Hiện tại bạn có thể sử dụng quy trình Khôi phục mật khẩu để cấp lại mật khẩu mới.',
                    'Direct in-session password change is mapped to the next task (/settings/security). You can currently use the Password Recovery workflow to reset credentials.'
                  )}
                </Text>
                <Link href="/forgot-password" asChild>
                  <Pressable accessibilityRole="button" style={[styles.linkRow, { borderColor: c.border }]}>
                    <Text style={[t.caption, { color: c.primary, fontWeight: '700' }]}>
                      {tr('Mở quy trình Khôi phục mật khẩu →', 'Open Password Recovery →')}
                    </Text>
                  </Pressable>
                </Link>
              </View>
            </GlassCard>
          </View>

          {/* Appearance Settings */}
          <View style={{ gap: s.xs }}>
            <Text style={[t.caption, styles.sectionHeader, { color: c.textSecondary }]}>
              {tr('CHẾ ĐỘ HIỂN THỊ', 'APPEARANCE')}
            </Text>
            <GlassCard opaque padding="md">
              <View style={styles.modeSelector}>
                {modes.map((item) => {
                  const isSelected = mode === item.key;
                  return (
                    <Pressable
                      key={item.key}
                      accessibilityRole="radio"
                      accessibilityState={{ selected: isSelected }}
                      onPress={() => void setMode(item.key)}
                      style={({ pressed }) => [
                        styles.modeButton,
                        {
                          backgroundColor: isSelected ? c.selectedSurface : pressed ? c.surfaceRaised : 'transparent',
                          borderColor: isSelected ? c.primary : c.border,
                        },
                      ]}
                    >
                      <Text
                        style={[
                          t.caption,
                          {
                            color: isSelected ? c.primary : c.textPrimary,
                            fontWeight: isSelected ? '700' : '500',
                          },
                        ]}
                      >
                        {item.label}
                      </Text>
                    </Pressable>
                  );
                })}
              </View>
            </GlassCard>
          </View>

          {/* Session & Sign Out */}
          <View style={{ gap: s.xs }}>
            <Text style={[t.caption, styles.sectionHeader, { color: c.textSecondary }]}>
              {tr('PHIÊN ĐĂNG NHẬP', 'SESSION')}
            </Text>
            <GlassCard opaque padding="md">
              {authMessage ? (
                <View style={[styles.alertBox, { backgroundColor: c.dangerSurface }]}>
                  <Text accessibilityLiveRegion="polite" style={[t.caption, { color: c.danger, fontWeight: '600' }]}>
                    {authMessage}
                  </Text>
                </View>
              ) : null}
              <Pressable
                accessibilityRole="button"
                disabled={authBusy}
                onPress={() => {
                  void client.logout();
                }}
                style={({ pressed }) => [
                  styles.signOutButton,
                  {
                    backgroundColor: pressed ? c.dangerSurface : 'transparent',
                    borderColor: c.danger,
                    opacity: authBusy ? 0.6 : 1,
                  },
                ]}
              >
                <Text style={[t.label, { color: c.danger, fontWeight: '700' }]}>
                  {authBusy ? tr('Đang đăng xuất…', 'Signing out…') : tr('Đăng xuất khỏi thiết bị', 'Sign out of this device')}
                </Text>
              </Pressable>
            </GlassCard>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
  content: {
    flexGrow: 1,
    width: '100%',
    alignSelf: 'center',
    paddingBottom: 40,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  brand: {
    letterSpacing: 2,
    fontWeight: '700',
  },
  banner: {
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
  },
  userRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
  },
  avatar: {
    width: 56,
    height: 56,
    borderRadius: 28,
    borderWidth: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  userInfo: {
    flex: 1,
    gap: 2,
  },
  sectionHeader: {
    paddingHorizontal: 4,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    fontWeight: '600',
  },
  scopeHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 4,
  },
  segmentedRow: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 4,
  },
  segmentButton: {
    flex: 1,
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 10,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 44,
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    minHeight: 32,
  },
  divider: {
    height: StyleSheet.hairlineWidth,
    width: '100%',
    marginVertical: 4,
  },
  mono: {
    fontVariant: ['tabular-nums'],
  },
  linkRow: {
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 8,
    borderWidth: 1,
    marginTop: 6,
    alignItems: 'center',
    minHeight: 44,
    justifyContent: 'center',
  },
  modeSelector: {
    flexDirection: 'row',
    gap: 8,
  },
  modeButton: {
    flex: 1,
    minHeight: 44,
    borderRadius: 10,
    borderWidth: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  alertBox: {
    padding: 10,
    borderRadius: 8,
    marginBottom: 8,
  },
  signOutButton: {
    minHeight: 48,
    borderRadius: 12,
    borderWidth: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
});
