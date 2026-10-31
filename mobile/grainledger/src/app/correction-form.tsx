import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  SafeAreaView,
  TouchableOpacity,
  Alert,
} from 'react-native';
import { useRouter } from 'expo-router';
import { GlassHeader } from '../components/common/GlassHeader';
import { GlassCard } from '../components/common/GlassCard';
import { GlassInput } from '../components/common/GlassInput';
import { GlassButton } from '../components/common/GlassButton';
import { useMillStore } from '../store/millStore';
import { AppleGlass } from '../theme/appleGlass';
import { Scale, FileText, Check } from 'lucide-react-native';

export default function CorrectionFormModal() {
  const router = useRouter();
  const { operations } = useMillStore();

  const [selectedOpId, setSelectedOpId] = useState(operations[0]?.id || '');
  const [varianceKg, setVarianceKg] = useState('15.5');
  const [reason, setReason] = useState('Hao hụt ẩm độ thực tế sau sấy vượt mức chuẩn 0.3%');
  const [reconciliationNotes, setReconciliationNotes] = useState('Đã cân đối lại cân điện tử trạm số 2');
  const [loading, setLoading] = useState(false);

  const selectedOp = operations.find((o) => o.id === selectedOpId) || operations[0];

  const handleSubmit = async () => {
    if (!reason.trim()) {
      Alert.alert('Thiếu thông tin', 'Vui lòng nhập lý do hiệu chỉnh chênh lệch.');
      return;
    }

    setLoading(true);
    try {
      Alert.alert(
        'Thành công',
        `Yêu cầu hiệu chỉnh cho công đoạn ${selectedOp?.code || 'vận hành'} đã được gửi tới Quản đốc duyệt.`,
        [{ text: 'Đóng', onPress: () => router.back() }]
      );
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

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Step 1: Select Operation */}
        <GlassCard
          tintColor="rgba(255, 255, 255, 0.9)"
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
                  {isSelected && <Check size={18} color={AppleGlass.colors.brandGreen} />}
                </TouchableOpacity>
              );
            })}
          </View>
        </GlassCard>

        {/* Step 2: Variance & Reasons */}
        <GlassCard
          tintColor="rgba(255, 255, 255, 0.9)"
          borderRadius={AppleGlass.radii.lg}
          style={styles.card}
        >
          <Text style={styles.sectionHeading}>2. Số liệu Chênh lệch & Giải trình</Text>

          <GlassInput
            label="Khối lượng chênh lệch cần bù trừ (kg) *"
            value={varianceKg}
            onChangeText={setVarianceKg}
            keyboardType="decimal-pad"
            leftIcon={<Scale size={18} color="#D97706" />}
          />

          <GlassInput
            label="Lý do sai lệch kỹ thuật *"
            value={reason}
            onChangeText={setReason}
            multiline
            numberOfLines={2}
            style={{ height: 60, textAlignVertical: 'top' }}
          />

          <GlassInput
            label="Ghi chú đối soát đối ứng"
            value={reconciliationNotes}
            onChangeText={setReconciliationNotes}
            placeholder="Biện pháp hiệu chuẩn đã thực hiện"
            leftIcon={<FileText size={18} color="#64748B" />}
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
          style={{ marginTop: 8 }}
        />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#F2F4F8',
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 40,
  },
  card: {
    marginBottom: 16,
  },
  sectionHeading: {
    fontSize: 14,
    fontWeight: '800',
    color: '#0F172A',
    marginBottom: 12,
  },
  opList: {
    gap: 8,
  },
  opOption: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: AppleGlass.radii.md,
    backgroundColor: 'rgba(241, 245, 249, 0.7)',
    borderWidth: 1,
    borderColor: 'transparent',
  },
  opOptionSelected: {
    backgroundColor: '#ECFDF5',
    borderColor: '#34D399',
  },
  opCode: {
    fontSize: 14,
    fontWeight: '700',
    color: '#0F172A',
  },
  opCodeSelected: {
    color: AppleGlass.colors.brandGreen,
  },
  opSub: {
    fontSize: 12,
    color: '#64748B',
    marginTop: 2,
  },
});
