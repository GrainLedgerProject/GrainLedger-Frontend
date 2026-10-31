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

const VARIETIES = ['ST25 Lúa Tôm', 'Jasmine 85', 'OM 5451', 'Đài Thơm 8', 'Nàng Hoa 9'];
const SEASONS = ['Đông Xuân 2026', 'Hè Thu 2026', 'Thu Đông 2026'];

export default function PlotFormScreen() {
  const theme = useAppTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);
  const router = useRouter();
  const { farmers, addPlot } = useFieldStore();

  const [selectedFarmerId, setSelectedFarmerId] = useState(farmers[0]?.id || '');
  const [variety, setVariety] = useState(VARIETIES[0]);
  const [season, setSeason] = useState(SEASONS[0]);
  const [areaHa, setAreaHa] = useState('2.5');
  const [latitude, setLatitude] = useState('10.3789');
  const [longitude, setLongitude] = useState('105.9542');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async () => {
    if (!areaHa || isNaN(Number(areaHa)) || Number(areaHa) <= 0) {
      Alert.alert('Lỗi nhập liệu', 'Vui lòng nhập diện tích hợp lệ (> 0 ha).');
      return;
    }

    setIsSubmitting(true);
    const newPlot = await addPlot({
      farmerId: selectedFarmerId,
      variety,
      season,
      areaHa: parseFloat(areaHa),
      latitude: parseFloat(latitude) || undefined,
      longitude: parseFloat(longitude) || undefined,
    });
    setIsSubmitting(false);

    Alert.alert(
      'Thành công',
      `Đã tạo thửa ruộng ${newPlot.code} (${newPlot.areaHa} ha - ${newPlot.variety}).`,
      [{ text: 'Đóng', onPress: () => router.back() }]
    );
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.header}>
        <TouchableOpacity accessibilityRole="button" accessibilityLabel="Quay lại" style={styles.backBtn} onPress={() => router.back()}>
          <ArrowLeft size={20} color={theme.colors.label} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Đăng ký Thửa ruộng Mới</Text>
        <View style={{ width: 36 }} />
      </View>

      <ScrollView keyboardShouldPersistTaps="handled" automaticallyAdjustKeyboardInsets
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Select Farmer */}
        <Card style={styles.card}>
          <Text style={styles.cardHeader}>1. Chọn Nông hộ</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            {farmers.map((f) => {
              const isSelected = f.id === selectedFarmerId;
              return (
                <TouchableOpacity
                  key={f.id}
                  style={[styles.farmerChip, isSelected && styles.farmerChipActive]}
                  onPress={() => setSelectedFarmerId(f.id)}
                >
                  <Text style={[styles.farmerName, isSelected && styles.farmerNameActive]}>
                    {f.name}
                  </Text>
                  <Text style={styles.farmerSub}>{f.code}</Text>
                </TouchableOpacity>
              );
            })}
          </ScrollView>
        </Card>

        {/* Variety Selection */}
        <Card style={styles.card}>
          <Text style={styles.cardHeader}>2. Giống lúa canh tác</Text>
          <View style={styles.varietiesRow}>
            {VARIETIES.map((v) => {
              const isSelected = variety === v;
              return (
                <TouchableOpacity
                  key={v}
                  style={[styles.varietyChip, isSelected && styles.varietyChipActive]}
                  onPress={() => setVariety(v)}
                >
                  <Text style={[styles.varietyText, isSelected && styles.varietyTextActive]}>
                    {v}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </Card>

        {/* Season & Area */}
        <Card style={styles.card}>
          <Text style={styles.cardHeader}>3. Mùa vụ & Diện tích</Text>

          <View style={styles.varietiesRow}>
            {SEASONS.map((s) => {
              const isSelected = season === s;
              return (
                <TouchableOpacity
                  key={s}
                  style={[styles.seasonChip, isSelected && styles.seasonChipActive]}
                  onPress={() => setSeason(s)}
                >
                  <Text style={[styles.seasonText, isSelected && styles.seasonTextActive]}>
                    {s}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>

          <InputField
            label="Diện tích thửa"
            value={areaHa}
            onChangeText={setAreaHa}
            keyboardType="numeric"
            unitSuffix="ha"
            required
            containerStyle={{ marginTop: 12 }}
          />

          <View style={styles.inputRow}>
            <InputField
              label="Vĩ độ GPS (Lat)"
              value={latitude}
              onChangeText={setLatitude}
              keyboardType="numeric"
              containerStyle={{ flex: 1 }}
            />
            <InputField
              label="Kinh độ GPS (Long)"
              value={longitude}
              onChangeText={setLongitude}
              keyboardType="numeric"
              containerStyle={{ flex: 1 }}
            />
          </View>
        </Card>

        <Button
          title="Lưu Thửa ruộng"
          size="large"
          loading={isSubmitting}
          onPress={handleSubmit}
          style={{ marginTop: spacing.sm, marginBottom: 30 }}
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
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    backgroundColor: theme.colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.separator,
  },
  backBtn: {
    width: 48,
    height: 48,
    borderRadius: 18,
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
    padding: spacing.lg,
  },
  card: {
    marginBottom: spacing.md,
  },
  cardHeader: {
    ...theme.typography.subheadline,
    fontWeight: '700',
    color: theme.colors.label,
    marginBottom: spacing.md,
  },
  farmerChip: {
    backgroundColor: theme.colors.surfaceSecondary,
    borderWidth: 1.5,
    borderColor: theme.colors.separator,
    borderRadius: 10,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    marginRight: spacing.sm,
  },
  farmerChipActive: {
    backgroundColor: theme.colors.accentMuted,
    borderColor: theme.colors.accent,
  },
  farmerName: {
    ...theme.typography.footnote,
    fontWeight: '700',
    color: theme.colors.label,
  },
  farmerNameActive: {
    color: theme.colors.accent,
  },
  farmerSub: {
    ...theme.typography.body,
    color: theme.colors.secondaryLabel,
    marginTop: spacing.xxs,
  },
  varietiesRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  varietyChip: {
    backgroundColor: theme.colors.surfaceSecondary,
    borderWidth: 1,
    borderColor: theme.colors.separator,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: 8,
  },
  varietyChipActive: {
    backgroundColor: theme.colors.accentMuted,
    borderColor: theme.colors.accent,
  },
  varietyText: {
    ...theme.typography.footnote,
    fontWeight: '600',
    color: theme.colors.secondaryLabel,
  },
  varietyTextActive: {
    color: theme.colors.accent,
    fontWeight: '700',
  },
  seasonChip: {
    backgroundColor: theme.colors.surfaceSecondary,
    borderWidth: 1,
    borderColor: theme.colors.separator,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: 8,
  },
  seasonChipActive: {
    backgroundColor: theme.colors.warningMuted,
    borderColor: theme.colors.warning,
  },
  seasonText: {
    ...theme.typography.caption,
    fontWeight: '600',
    color: theme.colors.secondaryLabel,
  },
  seasonTextActive: {
    color: theme.colors.warning,
    fontWeight: '700',
  },
  inputRow: {
    flexDirection: 'row',
    gap: spacing.md,
    marginTop: spacing.xs,
  },
});
