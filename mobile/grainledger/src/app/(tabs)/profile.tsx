import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import {
  Building,
  Cloud,
  LogOut,
  Server,
  Shield,
  KeyRound,
  Sparkles,
} from 'lucide-react-native';
import { useState } from 'react';
import {
  Alert,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { GlassHeader } from '../../components/common/GlassHeader';
import { GlassCard } from '../../components/common/GlassCard';
import { GlassButton } from '../../components/common/GlassButton';
import { GlassBadge } from '../../components/common/GlassBadge';
import { GlassInput } from '../../components/common/GlassInput';
import { api } from '../../services/api';
import { useAuthStore } from '../../store/authStore';
import { useOfflineStore } from '../../store/offlineStore';
import { AppleGlass } from '../../theme/appleGlass';
import { useAppTheme } from '../../theme';
import { ROLE_DEFINITIONS, UserRole } from '../../types/roles';

export default function ProfileScreen() {
  const router = useRouter();
  const theme = useAppTheme();
  const { user, activeRole, logout, loginAsMock } = useAuthStore();
  const { isSyncing, lastSyncedAt, syncAll, getPendingCount } = useOfflineStore();

  const [apiUrl, setApiUrl] = useState(api.getBaseUrl());
  const [testingConnection, setTestingConnection] = useState(false);
  const pendingCount = getPendingCount();

  const handleSaveApiUrl = async () => {
    await api.setBaseUrl(apiUrl);
    const normalized = api.getBaseUrl();
    setApiUrl(normalized);
    Alert.alert('Thành công', `Đã lưu địa chỉ máy chủ: ${normalized}`);
  };

  const handleTestConnection = async () => {
    setTestingConnection(true);
    const res = await api.request<{ status?: string }>('/health');
    setTestingConnection(false);

    if (res.data && !res.isMock) {
      Alert.alert(
        'Kết nối thành công',
        `Máy chủ GrainLedger backend đang phản hồi tốt!\nURL: ${api.getBaseUrl()}\nTrạng thái: ${
          typeof res.data === 'object' && res.data.status ? res.data.status : 'OK'
        }`
      );
    } else {
      Alert.alert(
        'Không thể kết nối máy chủ',
        `Không thể kết nối trực tiếp đến ${api.getBaseUrl()}.\n\nChi tiết lỗi: ${
          res.error || 'Máy chủ không phản hồi'
        }\n\nVui lòng kiểm tra lại URL máy chủ hoặc trạng thái backend.`
      );
    }
  };

  const handleSwitchMockRole = async (role: UserRole) => {
    await loginAsMock(role);
    Alert.alert('Đã đổi vai trò', `Hiện đang xem thử dưới quyền: ${ROLE_DEFINITIONS[role]?.labelVi}`);
  };

  const roleLabel =
    (activeRole && ROLE_DEFINITIONS[activeRole]?.labelVi) ||
    user?.role ||
    'Chưa gán vai trò';

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: theme.colors.background }]}>
      <GlassHeader
        title="Tài khoản & Cài đặt"
        subtitle="Thông tin tài khoản, máy chủ kết nối và dữ liệu ngoại tuyến"
      />

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Apple Glass Profile Card */}
        <GlassCard
          tintColor="rgba(255, 255, 255, 0.9)"
          borderRadius={AppleGlass.radii.xl}
          elevated
          style={styles.profileCard}
        >
          <View style={styles.profileTop}>
            <View style={styles.avatarCircle}>
              <Text style={styles.avatarInitial}>
                {user?.displayName ? user.displayName.charAt(0).toUpperCase() : 'U'}
              </Text>
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.userName}>{user?.displayName || 'Chưa đăng nhập'}</Text>
              <Text style={styles.userEmail}>{user?.email || 'N/A'}</Text>
              <View style={styles.roleRow}>
                <GlassBadge status="COMMITTED" label={roleLabel} size="small" />
              </View>
            </View>
          </View>

          <View style={styles.divider} />

          <View style={styles.infoRow}>
            <Building size={16} color="#64748B" />
            <Text style={styles.infoText}>{user?.organizationName || 'Chưa gán đơn vị'}</Text>
          </View>

          {user?.assignedFacilities && user.assignedFacilities.length > 0 ? (
            <View style={[styles.infoRow, { marginTop: 6 }]}>
              <Shield size={16} color="#64748B" />
              <Text style={styles.infoText}>
                Phạm vi: {user.assignedFacilities.join(', ')}
              </Text>
            </View>
          ) : null}

          {user?.permissions && user.permissions.length > 0 ? (
            <View style={{ marginTop: 10 }}>
              <View style={[styles.infoRow, { marginBottom: 6 }]}>
                <KeyRound size={16} color="#64748B" />
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

        {/* DEMO / MOCK ROLE SWITCHER */}
        <GlassCard
          tintColor="rgba(240, 253, 244, 0.9)"
          borderTint="rgba(52, 199, 89, 0.35)"
          borderRadius={AppleGlass.radii.lg}
          style={styles.roleSwitcherCard}
        >
          <View style={styles.roleSwitcherHeader}>
            <View style={styles.roleSwitcherIconBox}>
              <Sparkles size={16} color="#166534" />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.roleSwitcherTitle}>Chuyển đổi Vai trò Xem thử (Demo)</Text>
              <Text style={styles.roleSwitcherSub}>
                Chạm để đổi vai trò trực tiếp và kiểm tra quyền hạn giao diện:
              </Text>
            </View>
          </View>

          <View style={styles.roleChipsGrid}>
            {(['CUSTOMER_PROCUREMENT_OFFICER', 'MILL_OPERATOR', 'MILL_MANAGER', 'CUSTOMER_MANAGER', 'MILL_ADMIN'] as UserRole[]).map((r) => {
              const meta = ROLE_DEFINITIONS[r];
              const isSelected = activeRole === r;
              return (
                <TouchableOpacity
                  key={r}
                  style={[styles.roleChip, isSelected && styles.roleChipActive]}
                  onPress={() => handleSwitchMockRole(r)}
                  activeOpacity={0.7}
                >
                  <Text style={[styles.roleChipText, isSelected && styles.roleChipTextActive]}>
                    {meta.code} - {meta.labelVi}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </GlassCard>

        {/* Offline Sync Manager Card */}
        <GlassCard
          tintColor="rgba(255, 255, 255, 0.88)"
          borderRadius={AppleGlass.radii.lg}
          style={styles.syncCard}
        >
          <View style={styles.syncHeader}>
            <View style={styles.syncIconBox}>
              <Cloud size={20} color={pendingCount > 0 ? '#D97706' : '#059669'} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.syncTitle}>Quản lý Đồng bộ Ngoại tuyến</Text>
              <Text style={styles.syncSubtitle}>
                {pendingCount > 0
                  ? `${pendingCount} giao dịch chưa gửi máy chủ`
                  : 'Dữ liệu đã được đồng bộ hoàn toàn'}
              </Text>
            </View>
          </View>

          <View style={styles.syncInfoRow}>
            <Text style={styles.syncInfoLabel}>Lần đồng bộ cuối:</Text>
            <Text style={styles.syncInfoVal}>
              {lastSyncedAt ? new Date(lastSyncedAt).toLocaleTimeString('vi-VN') : 'Vừa xong'}
            </Text>
          </View>

          <View style={styles.syncButtonsGroup}>
            <GlassButton
              title="Xem hàng đợi"
              size="small"
              variant="secondary"
              onPress={() => router.push('/offline-queue')}
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
          tintColor="rgba(255, 255, 255, 0.88)"
          borderRadius={AppleGlass.radii.lg}
          style={styles.serverCard}
        >
          <View style={styles.serverHeader}>
            <Server size={18} color={AppleGlass.colors.brandGreen} />
            <Text style={styles.serverTitle}>Địa chỉ Máy chủ (API Base URL)</Text>
          </View>

          <Text style={styles.serverDesc}>
            Cấu hình endpoint backend cho ứng dụng (hỗ trợ localhost, LAN IP hoặc Cloud Gateway).
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

        {/* Logout Button */}
        <GlassButton
          title="Đăng xuất khỏi thiết bị"
          variant="danger"
          size="large"
          icon={<LogOut size={18} color="#FFFFFF" />}
          onPress={() => {
            Alert.alert('Đăng xuất', 'Bạn có chắc chắn muốn đăng xuất tài khoản này?', [
              { text: 'Huỷ', style: 'cancel' },
              { text: 'Đăng xuất', style: 'destructive', onPress: logout },
            ]);
          }}
          fullWidth
          style={styles.logoutBtn}
        />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: AppleGlass.colors.systemBackground,
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 120,
  },
  profileCard: {
    marginBottom: 16,
  },
  profileTop: {
    flexDirection: 'row',
    gap: 14,
    alignItems: 'center',
  },
  avatarCircle: {
    width: 54,
    height: 54,
    borderRadius: AppleGlass.radii.pill,
    backgroundColor: AppleGlass.colors.brandGreen,
    alignItems: 'center',
    justifyContent: 'center',
    ...AppleGlass.shadows.glassSubtle,
  },
  avatarInitial: {
    fontSize: 22,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  userName: {
    fontSize: 18,
    fontWeight: '800',
    color: '#0F172A',
  },
  userEmail: {
    fontSize: 13,
    color: '#64748B',
    marginTop: 2,
  },
  roleRow: {
    marginTop: 6,
  },
  divider: {
    height: 1,
    backgroundColor: 'rgba(226, 232, 240, 0.8)',
    marginVertical: 14,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  infoText: {
    fontSize: 13,
    color: '#334155',
    fontWeight: '500',
  },
  permissionTitle: {
    fontSize: 12,
    fontWeight: '700',
    color: '#475569',
  },
  permissionList: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  permissionBadge: {
    backgroundColor: 'rgba(241, 245, 249, 0.8)',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: 'rgba(226, 232, 240, 0.8)',
  },
  permissionBadgeText: {
    fontSize: 10,
    fontWeight: '600',
    color: '#475569',
  },
  roleSwitcherCard: {
    marginBottom: 16,
  },
  roleSwitcherHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 8,
  },
  roleSwitcherIconBox: {
    width: 32,
    height: 32,
    borderRadius: 8,
    backgroundColor: '#DCFCE7',
    alignItems: 'center',
    justifyContent: 'center',
  },
  roleSwitcherTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: '#0F172A',
  },
  roleSwitcherSub: {
    fontSize: 11,
    color: '#64748B',
    marginTop: 2,
  },
  roleChipsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 8,
  },
  roleChip: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: AppleGlass.radii.pill,
    backgroundColor: 'rgba(255, 255, 255, 0.8)',
    borderWidth: 1,
    borderColor: 'rgba(52, 199, 89, 0.3)',
  },
  roleChipActive: {
    backgroundColor: AppleGlass.colors.brandGreen,
    borderColor: AppleGlass.colors.brandGreen,
  },
  roleChipText: {
    fontSize: 11,
    fontWeight: '700',
    color: AppleGlass.colors.brandGreen,
  },
  roleChipTextActive: {
    color: '#FFFFFF',
  },
  syncCard: {
    marginBottom: 16,
  },
  syncHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  syncIconBox: {
    width: 38,
    height: 38,
    borderRadius: 10,
    backgroundColor: 'rgba(241, 245, 249, 0.8)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  syncTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: '#0F172A',
  },
  syncSubtitle: {
    fontSize: 12,
    color: '#64748B',
    marginTop: 2,
  },
  syncInfoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginVertical: 12,
  },
  syncInfoLabel: {
    fontSize: 12,
    color: '#64748B',
  },
  syncInfoVal: {
    fontSize: 12,
    fontWeight: '600',
    color: '#0F172A',
  },
  syncButtonsGroup: {
    flexDirection: 'row',
    gap: 10,
  },
  serverCard: {
    marginBottom: 20,
  },
  serverHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 6,
  },
  serverTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: '#0F172A',
  },
  serverDesc: {
    fontSize: 12,
    color: '#64748B',
    lineHeight: 16,
    marginBottom: 12,
  },
  serverActionsGroup: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 4,
  },
  logoutBtn: {
    marginBottom: 30,
  },
});
