import { spacing } from '../theme/tokens';
import React, { useMemo, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useAppTheme, type AppTheme } from '../theme';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Card } from '../components/common/Card';
import { InputField } from '../components/common/InputField';
import { Button } from '../components/common/Button';
import { useFieldStore } from '../store/fieldStore';
import { ArrowLeft } from '../components/ui/named-icons';

export default function FarmerFormScreen() {
  const theme = useAppTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);
  const router = useRouter();
  const { addFarmer } = useFieldStore();

  const [name, setName] = useState('');
  const [contact, setContact] = useState('');
  const [identityNumber, setIdentityNumber] = useState('');
  const [province, setProvince] = useState('Tiền Giang');
  const [district, setDistrict] = useState('Huyện Cái Bè');
  const [commune, setCommune] = useState('Xã Hậu Mỹ Bắc B');
  const [areaHa, setAreaHa] = useState('3.0');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async () => {
    if (!name.trim()) {
      Alert.alert('Thiếu thông tin', 'Vui lòng nhập họ tên nông hộ.');
      return;
    }
    if (!contact.trim()) {
      Alert.alert('Thiếu thông tin', 'Vui lòng nhập số điện thoại liên hệ.');
      return;
    }

    setIsSubmitting(true);
    const newFarmer = await addFarmer({
      name: name.trim(),
      contact: contact.trim(),
      identityNumber: identityNumber.trim() || undefined,
      province,
      district,
      commune,
      totalAreaHa: parseFloat(areaHa) || 0,
    });
    setIsSubmitting(false);

    Alert.alert(
      'Thành công',
      `Đã đăng ký nông hộ ${newFarmer.name} (Mã: ${newFarmer.code}) vào vùng nguyên liệu.`,
      [{ text: 'Đóng', onPress: () => router.back() }]
    );
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.header}>
        <TouchableOpacity accessibilityRole="button" accessibilityLabel="Quay lại" style={styles.backBtn} onPress={() => router.back()}>
          <ArrowLeft size={20} color={theme.colors.label} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Đăng ký Nông hộ Mới</Text>
        <View style={{ width: 36 }} />
      </View>

      <ScrollView keyboardShouldPersistTaps="handled" automaticallyAdjustKeyboardInsets
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <Card style={styles.formCard}>
          <Text style={styles.cardHeader}>Thông tin Nông hộ</Text>

          <InputField
            label="Họ và tên nông hộ"
            placeholder="Ví dụ: Trần Văn Nam"
            value={name}
            onChangeText={setName}
            required
          />

          <View style={styles.inputRow}>
            <InputField
              label="Số điện thoại"
              placeholder="0918..."
              value={contact}
              onChangeText={setContact}
              keyboardType="phone-pad"
              required
              containerStyle={{ flex: 1 }}
            />
            <InputField
              label="Số CCCD / CMND"
              placeholder="082..."
              value={identityNumber}
              onChangeText={setIdentityNumber}
              keyboardType="numeric"
              containerStyle={{ flex: 1 }}
            />
          </View>

          <InputField
            label="Tỉnh / Thành phố"
            value={province}
            onChangeText={setProvince}
            required
          />

          <View style={styles.inputRow}>
            <InputField
              label="Quận / Huyện"
              value={district}
              onChangeText={setDistrict}
              containerStyle={{ flex: 1 }}
            />
            <InputField
              label="Xã / Phường"
              value={commune}
              onChangeText={setCommune}
              containerStyle={{ flex: 1 }}
            />
          </View>

          <InputField
            label="Tổng diện tích canh tác"
            placeholder="3.5"
            value={areaHa}
            onChangeText={setAreaHa}
            keyboardType="numeric"
            unitSuffix="ha"
          />
        </Card>

        <Button
          title="Lưu Nông hộ"
          size="large"
          loading={isSubmitting}
          onPress={handleSubmit}
          style={{ marginTop: spacing.md, marginBottom: 30 }}
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
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: theme.spacing.lg,
    paddingVertical: theme.spacing.sm,
    backgroundColor: theme.colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.separator,
  },
  backBtn: {
    width: 48,
    height: 48,
    borderRadius: theme.radii.md,
    backgroundColor: theme.colors.surfaceSecondary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    ...theme.typography.callout,
    fontWeight: '800',
    color: theme.colors.label,
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    padding: theme.spacing.lg,
  },
  formCard: {
    marginBottom: theme.spacing.md,
  },
  cardHeader: {
    ...theme.typography.subheadline,
    fontWeight: '700',
    color: theme.colors.label,
    marginBottom: theme.spacing.sm,
  },
  inputRow: {
    flexDirection: 'row',
    gap: theme.spacing.md,
  },
});
