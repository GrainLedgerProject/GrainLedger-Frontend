import { radii, spacing } from '../theme/tokens';
import { SafeAreaView } from 'react-native-safe-area-context';
import React, { useMemo } from 'react';
import { useAppTheme, type AppTheme } from '../theme';

import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Card } from '../components/common/Card';
import { StatusBadge } from '../components/common/StatusBadge';
import { Button } from '../components/common/Button';
import { useOfflineStore } from '../store/offlineStore';
import { ArrowLeft, RefreshCw, Trash2, Cloud, CheckCircle } from '../components/ui/named-icons';

export default function OfflineQueueScreen() {
  const theme = useAppTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);
  const router = useRouter();
  const { queue, isSyncing, syncAll, retryItem, clearCompleted, getPendingCount } =
    useOfflineStore();

  const pendingCount = getPendingCount();

  const handleSyncAll = async () => {
    const res = await syncAll();
    Alert.alert('Hoàn tất đồng bộ', `Đã đồng bộ thành công ${res.successCount} mục.`);
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.header}>
        <TouchableOpacity accessibilityRole="button" accessibilityLabel="Quay lại" style={styles.backBtn} onPress={() => router.back()}>
          <ArrowLeft size={20} color={theme.colors.label} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Hàng Đợi Ngoại Tuyến</Text>
        <TouchableOpacity
          style={styles.clearBtn}
          onPress={() => {
            clearCompleted();
            Alert.alert('Đã dọn dẹp', 'Đã xóa các mục đã đồng bộ thành công.');
          }}
        >
          <Trash2 size={18} color={theme.colors.secondaryLabel} />
        </TouchableOpacity>
      </View>

      {/* Top Summary Banner */}
      <View style={styles.summaryBanner}>
        <View style={styles.summaryIconBox}>
          <Cloud size={24} color={pendingCount > 0 ? theme.colors.accent : theme.colors.success} />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={styles.summaryTitle}>
            {pendingCount > 0
              ? `${pendingCount} thao tác đang chờ kết nối`
              : 'Dữ liệu đã được đồng bộ đầy đủ'}
          </Text>
          <Text style={styles.summarySub}>
            Tất cả thao tác thực địa đều được lưu trữ an toàn trong bộ nhớ máy.
          </Text>
        </View>
      </View>

      <View style={styles.actionRow}>
        <Button
          title={isSyncing ? 'Đang truyền...' : 'Đồng bộ tất cả'}
          icon={<RefreshCw size={16} color={theme.colors.surface} />}
          loading={isSyncing}
          variant="primary"
          style={{ flex: 1 }}
          onPress={handleSyncAll}
        />
      </View>

      <ScrollView keyboardShouldPersistTaps="handled" automaticallyAdjustKeyboardInsets
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {queue.length === 0 ? (
          <View style={styles.emptyBox}>
            <CheckCircle size={40} color={theme.colors.success} />
            <Text style={styles.emptyTitle}>Hàng đợi trống</Text>
            <Text style={styles.emptySub}>Không có giao dịch nào đang chờ gửi.</Text>
          </View>
        ) : (
          queue.map((item) => (
            <Card key={item.id} style={styles.itemCard}>
              <View style={styles.cardTop}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.itemTitle}>{item.title}</Text>
                  <Text style={styles.itemSummary}>{item.summary}</Text>
                </View>
                <StatusBadge status={item.status} />
              </View>

              <View style={styles.divider} />

              <View style={styles.cardFooter}>
                <Text style={styles.timeText}>
                  Tạo lúc: {new Date(item.createdAt).toLocaleTimeString('vi-VN')}
                </Text>

                {item.status === 'PENDING' || item.status === 'FAILED' ? (
                  <TouchableOpacity
                    style={styles.retryBtn}
                    onPress={async () => {
                      await retryItem(item.id);
                      Alert.alert('Thành công', 'Đã đồng bộ mục này.');
                    }}
                  >
                    <RefreshCw size={13} color={theme.colors.accent} />
                    <Text style={styles.retryText}>Thử lại</Text>
                  </TouchableOpacity>
                ) : (
                  <Text style={styles.syncedText}>Đã truyền thành công</Text>
                )}
              </View>
            </Card>
          ))
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const createStyles = (theme: AppTheme) => StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    backgroundColor: theme.colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.separator,
  },
  backBtn: {
    width: 48,
    height: 48,
    borderRadius: radii.md,
    backgroundColor: theme.colors.surfaceSecondary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  clearBtn: {
    width: 48,
    height: 48,
    borderRadius: radii.md,
    backgroundColor: theme.colors.surfaceSecondary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    ...theme.typography.callout,
    fontWeight: '800',
    color: theme.colors.label,
  },
  summaryBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    padding: spacing.lg,
    backgroundColor: theme.colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.separator,
  },
  summaryIconBox: {
    width: 44,
    height: 44,
    borderRadius: radii.sm,
    backgroundColor: theme.colors.accentMuted,
    alignItems: 'center',
    justifyContent: 'center',
  },
  summaryTitle: {
    ...theme.typography.subheadline,
    fontWeight: '800',
    color: theme.colors.label,
  },
  summarySub: {
    ...theme.typography.caption,
    color: theme.colors.secondaryLabel,
    marginTop: spacing.xxs,
    lineHeight: 16,
  },
  actionRow: {
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    backgroundColor: theme.colors.surface,
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    padding: spacing.lg,
    paddingBottom: spacing.xxl,
  },
  itemCard: {
    marginBottom: spacing.sm,
  },
  cardTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  itemTitle: {
    ...theme.typography.subheadline,
    fontWeight: '700',
    color: theme.colors.label,
  },
  itemSummary: {
    ...theme.typography.caption,
    color: theme.colors.secondaryLabel,
    marginTop: spacing.xxs,
  },
  divider: {
    height: 1,
    backgroundColor: theme.colors.separator,
    marginVertical: spacing.sm,
  },
  cardFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  timeText: {
    ...theme.typography.caption,
    color: theme.colors.tertiaryLabel,
  },
  retryBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    backgroundColor: theme.colors.accentMuted,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: radii.xs,
  },
  retryText: {
    ...theme.typography.caption,
    fontWeight: '700',
    color: theme.colors.accent,
  },
  syncedText: {
    ...theme.typography.caption,
    fontWeight: '600',
    color: theme.colors.success,
  },
  emptyBox: {
    padding: spacing.xxl,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyTitle: {
    ...theme.typography.callout,
    fontWeight: '700',
    color: theme.colors.label,
    marginTop: spacing.md,
  },
  emptySub: {
    ...theme.typography.footnote,
    color: theme.colors.tertiaryLabel,
    marginTop: spacing.xs,
  },
});
