import { spacing } from '../theme/tokens';
import { SafeAreaView } from 'react-native-safe-area-context';
import React, { useMemo , useState } from 'react';
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
import { GlassHeader } from '../components/common/GlassHeader';
import { GlassCard } from '../components/common/GlassCard';
import { GlassInput } from '../components/common/GlassInput';
import { GlassButton } from '../components/common/GlassButton';
import { useMillStore } from '../store/millStore';
import { api } from '../services/api';
import { buildCorrectionRequest, submitCorrection } from '../services/corrections';
import { AppleGlass } from '../theme/appleGlass';
import { Scale, FileText, Check } from '../components/ui/named-icons';

export default function CorrectionFormModal() {
  const theme = useAppTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);
  const router = useRouter();
  const { operations } = useMillStore();

  const [selectedOpId, setSelectedOpId] = useState(operations[0]?.id || '');
  const [varianceKg, setVarianceKg] = useState('15.5');
  const [reason, setReason] = useState('Hao hụt ẩm độ thực tế sau sấy vượt mức chuẩn 0.3%');
  const [reconciliationNotes, setReconciliationNotes] = useState('Đã cân đối lại cân điện tử trạm số 2');
  const [loading, setLoading] = useState(false);

  const selectedOp = operations.find((o) => o.id === selectedOpId) || operations[0];

  const handleSubmit = async () => {
    if (loading) return;
    setLoading(true);
    try {
      const request = buildCorrectionRequest(selectedOp?.id ?? '', reason, varianceKg, reconciliationNotes);
      await submitCorrection(request, api.request.bind(api));
      Alert.alert(
        'Thành công',
        `Yêu cầu hiệu chỉnh cho công đoạn ${selectedOp?.code || 'vận hành'} đã được gửi tới Quản đốc duyệt.`,
        [{ text: 'Đóng', onPress: () => router.back() }]
      );
    } catch (error: unknown) {
      Alert.alert('Chưa gửi được yêu cầu', error instanceof Error ? error.message : 'Vui lòng thử lại.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <GlassHeader
        title="Yêu cầu Hiệu chỉnh Khối lượng"
        subtitle="Khắc phục sai lệch cân và hao hụt vận hành máy"
        showBack
      />

      <ScrollView keyboardShouldPersistTaps="handled" automaticallyAdjustKeyboardInsets
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Step 1: Select Operation */}
        <GlassCard
          tintColor={theme.colors.surface}
          borderRadius={AppleGlass.radii.lg}
          style={styles.card}
        >
          <Text style={styles.sectionHeading}>1. Chọn Công đoạn Chế biến Cần Hiệu chỉnh</Text>

          <View style={styles.opList}>
            {operations.map((op) => {
              const isSelected = op.id === selectedOpId;
              return (
                <TouchableOpacity
                  key={op.id}
                  accessibilityRole="radio"
                  accessibilityLabel={`${op.code}, ${op.operationType}`}
                  accessibilityState={{ selected: isSelected, disabled: loading }}
                  disabled={loading}
                  style={[styles.opOption, isSelected && styles.opOptionSelected]}
                  onPress={() => setSelectedOpId(op.id)}
                >
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.opCode, isSelected && styles.opCodeSelected]}>
                      {op.code} ({op.operationType})
                    </Text>
                    <Text style={styles.opSub}>
                      Vào: {op.inputMassKg} kg ➔ Ra: {op.outputMassKg} kg
                    </Text>
                  </View>
                  {isSelected && <Check size={18} color={theme.colors.accent} />}
                </TouchableOpacity>
              );
            })}
          </View>
        </GlassCard>

        {/* Step 2: Variance & Reasons */}
        <GlassCard
          tintColor={theme.colors.surface}
          borderRadius={AppleGlass.radii.lg}
          style={styles.card}
        >
          <Text style={styles.sectionHeading}>2. Số liệu Chênh lệch & Giải trình</Text>

          <GlassInput
            label="Khối lượng chênh lệch cần bù trừ (kg) *"
            value={varianceKg}
            editable={!loading}
            onChangeText={setVarianceKg}
            keyboardType="decimal-pad"
            leftIcon={<Scale size={18} color={theme.colors.warning} />}
          />

          <GlassInput
            label="Lý do sai lệch kỹ thuật *"
            value={reason}
            editable={!loading}
            onChangeText={setReason}
            multiline
            numberOfLines={2}
            style={{ minHeight: 60, textAlignVertical: 'top' }}
          />

          <GlassInput
            label="Ghi chú đối soát đối ứng"
            value={reconciliationNotes}
            editable={!loading}
            onChangeText={setReconciliationNotes}
            placeholder="Biện pháp hiệu chuẩn đã thực hiện"
            leftIcon={<FileText size={18} color={theme.colors.secondaryLabel} />}
          />
        </GlassCard>

        {/* Action Button */}
        <GlassButton
          title="Gửi Yêu cầu Hiệu chỉnh tới Quản đốc"
          variant="primary"
          size="large"
          loading={loading}
          onPress={handleSubmit}
          fullWidth
          style={{ marginTop: spacing.sm }}
        />
      </ScrollView>
    </SafeAreaView>
  );
}

const createStyles = (theme: AppTheme) => StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    padding: spacing.lg,
    paddingBottom: spacing.xxl,
  },
  card: {
    marginBottom: spacing.lg,
  },
  sectionHeading: {
    ...theme.typography.subheadline,
    fontWeight: '800',
    color: theme.colors.label,
    marginBottom: spacing.md,
  },
  opList: {
    gap: spacing.sm,
  },
  opOption: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing.md,
    borderRadius: AppleGlass.radii.md,
    backgroundColor: theme.colors.surfaceSecondary,
    borderWidth: 1,
    borderColor: 'transparent',
  },
  opOptionSelected: {
    backgroundColor: theme.colors.successMuted,
    borderColor: theme.colors.success,
  },
  opCode: {
    ...theme.typography.subheadline,
    fontWeight: '700',
    color: theme.colors.label,
  },
  opCodeSelected: {
    color: theme.colors.accent,
  },
  opSub: {
    ...theme.typography.caption,
    color: theme.colors.secondaryLabel,
    marginTop: spacing.xxs,
  },
});
