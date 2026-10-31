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
import { ArrowLeft, ShieldAlert } from 'lucide-react-native';

const PESTICIDE_CATALOG = [
  { name: 'Amistar Top 325SC', substance: 'Azoxystrobin + Difenoconazole', phi: 14, defaultRate: '0.5', unit: 'lít/ha' },
  { name: 'Beam 75WP', substance: 'Tricyclazole', phi: 21, defaultRate: '0.3', unit: 'kg/ha' },
  { name: 'Tilt Super 300EC', substance: 'Propiconazole + Difenoconazole', phi: 14, defaultRate: '0.4', unit: 'lít/ha' },
  { name: 'Filia 525SE', substance: 'Tricyclazole + Propiconazole', phi: 21, defaultRate: '0.5', unit: 'lít/ha' },
];

export default function SprayFormScreen() {
  const theme = useAppTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);
  const router = useRouter();
  const { plots, addSpray } = useFieldStore();

  const [selectedPlotId, setSelectedPlotId] = useState(plots[0]?.id || '');
  const [selectedPesticide, setSelectedPesticide] = useState(PESTICIDE_CATALOG[0]);
  const [appliedDate, setAppliedDate] = useState(new Date().toISOString().split('T')[0]);
  const [rate, setRate] = useState(PESTICIDE_CATALOG[0].defaultRate);
  const [rateUnit, setRateUnit] = useState(PESTICIDE_CATALOG[0].unit);
  const [phiDays, setPhiDays] = useState(String(PESTICIDE_CATALOG[0].phi));
  const [isSubmitting, setIsSubmitting] = useState(false);

  const selectedPlot = plots.find((p) => p.id === selectedPlotId);

  // Compute Safe Harvest Date
  const harvestAllowed = (() => {
    try {
      const d = new Date(appliedDate);
      d.setDate(d.getDate() + (parseInt(phiDays, 10) || 14));
      return d.toISOString().split('T')[0];
    } catch {
      return 'N/A';
    }
  })();

  const handleSubmit = async () => {
    if (!selectedPlot) {
      Alert.alert('Lỗi', 'Vui lòng chọn thửa ruộng.');
      return;
    }

    setIsSubmitting(true);
    await addSpray({
      plotSeasonId: selectedPlot.id,
      plotCode: selectedPlot.code,
      farmerName: selectedPlot.farmerName,
      appliedOn: appliedDate,
      productName: selectedPesticide.name,
      substanceId: selectedPesticide.substance,
      rate: parseFloat(rate) || 0.5,
      rateUnit,
      phiDays: parseInt(phiDays, 10) || 14,
    });
    setIsSubmitting(false);

    Alert.alert(
      'Khai báo thành công',
      `Đã ghi nhận phun ${selectedPesticide.name} cho thửa ${selectedPlot.code}. Ngày thu hoạch an toàn: ${harvestAllowed}.`,
      [{ text: 'Đóng', onPress: () => router.back() }]
    );
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
          <ArrowLeft size={20} color={theme.colors.label} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Khai báo Phun thuốc BVTV</Text>
        <View style={{ width: 36 }} />
      </View>

      <ScrollView keyboardShouldPersistTaps="handled" automaticallyAdjustKeyboardInsets
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Choose Plot */}
        <Card style={styles.card}>
          <Text style={styles.cardHeader}>1. Chọn Thửa ruộng</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            {plots.map((p) => {
              const isSelected = p.id === selectedPlotId;
              return (
                <TouchableOpacity
                  key={p.id}
                  style={[styles.plotChip, isSelected && styles.plotChipActive]}
                  onPress={() => setSelectedPlotId(p.id)}
                >
                  <Text style={[styles.plotChipTitle, isSelected && styles.plotChipTitleActive]}>
                    {p.code}
                  </Text>
                  <Text style={styles.plotChipSub}>
                    {p.variety} • {p.farmerName}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </ScrollView>
        </Card>

        {/* Choose Pesticide from Approved Catalog */}
        <Card style={styles.card}>
          <Text style={styles.cardHeader}>2. Chọn Thuốc BVTV trong danh mục</Text>
          {PESTICIDE_CATALOG.map((item, idx) => {
            const isSelected = selectedPesticide.name === item.name;
            return (
              <TouchableOpacity
                key={idx}
                style={[styles.pestItem, isSelected && styles.pestItemActive]}
                onPress={() => {
                  setSelectedPesticide(item);
                  setRate(item.defaultRate);
                  setRateUnit(item.unit);
                  setPhiDays(String(item.phi));
                }}
              >
                <View style={{ flex: 1 }}>
                  <Text style={[styles.pestName, isSelected && styles.pestNameActive]}>
                    {item.name}
                  </Text>
                  <Text style={styles.pestSub}>Hoạt chất: {item.substance}</Text>
                </View>
                <View style={styles.phiTag}>
                  <Text style={styles.phiTagText}>PHI: {item.phi} ngày</Text>
                </View>
              </TouchableOpacity>
            );
          })}
        </Card>

        {/* Details & Calculations */}
        <Card style={styles.card}>
          <Text style={styles.cardHeader}>3. Thông số phun & Thời gian cách ly</Text>

          <InputField
            label="Ngày phun"
            value={appliedDate}
            onChangeText={setAppliedDate}
            placeholder="YYYY-MM-DD"
            required
          />

          <View style={styles.inputRow}>
            <InputField
              label="Liều lượng"
              value={rate}
              onChangeText={setRate}
              keyboardType="numeric"
              unitSuffix={rateUnit}
              required
              containerStyle={{ flex: 1 }}
            />
            <InputField
              label="Thời gian cách ly (PHI)"
              value={phiDays}
              onChangeText={setPhiDays}
              keyboardType="numeric"
              unitSuffix="ngày"
              required
              containerStyle={{ flex: 1 }}
            />
          </View>

          {/* Safety Warning & Calculation Banner */}
          <View style={styles.safetyBox}>
            <ShieldAlert size={20} color={theme.colors.warning} />
            <View style={{ flex: 1 }}>
              <Text style={styles.safetyTitle}>Khuyến cáo thu hoạch an toàn (MRL)</Text>
              <Text style={styles.safetyDesc}>
                Lúa thuộc thửa ruộng này chỉ được phép thu hoạch từ ngày{' '}
                <Text style={{ fontWeight: '800', color: theme.colors.accent }}>
                  {harvestAllowed}
                </Text>{' '}
                để đảm bảo không tồn dư hoạt chất {selectedPesticide.substance}.
              </Text>
            </View>
          </View>
        </Card>

        <Button
          title="Xác nhận Khai báo"
          size="large"
          loading={isSubmitting}
          onPress={handleSubmit}
          style={{ marginTop: 10, marginBottom: 30 }}
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
    paddingHorizontal: 16,
    paddingVertical: 14,
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
    padding: 16,
  },
  card: {
    marginBottom: 12,
  },
  cardHeader: {
    ...theme.typography.subheadline,
    fontWeight: '700',
    color: theme.colors.label,
    marginBottom: 12,
  },
  plotChip: {
    backgroundColor: theme.colors.surfaceSecondary,
    borderWidth: 1.5,
    borderColor: theme.colors.separator,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 8,
    marginRight: 8,
  },
  plotChipActive: {
    backgroundColor: theme.colors.accentMuted,
    borderColor: theme.colors.accent,
  },
  plotChipTitle: {
    ...theme.typography.footnote,
    fontWeight: '700',
    color: theme.colors.label,
  },
  plotChipTitleActive: {
    color: theme.colors.accent,
  },
  plotChipSub: {
    ...theme.typography.body,
    color: theme.colors.secondaryLabel,
    marginTop: 2,
  },
  pestItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 10,
    borderRadius: 10,
    borderWidth: 1.5,
    borderColor: theme.colors.separator,
    marginBottom: 8,
    backgroundColor: theme.colors.surface,
  },
  pestItemActive: {
    backgroundColor: theme.colors.accentMuted,
    borderColor: theme.colors.accent,
  },
  pestName: {
    ...theme.typography.subheadline,
    fontWeight: '700',
    color: theme.colors.label,
  },
  pestNameActive: {
    color: theme.colors.accent,
  },
  pestSub: {
    ...theme.typography.caption,
    color: theme.colors.secondaryLabel,
    marginTop: 2,
  },
  phiTag: {
    backgroundColor: theme.colors.warningMuted,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  phiTagText: {
    ...theme.typography.body,
    fontWeight: '700',
    color: theme.colors.warning,
  },
  inputRow: {
    flexDirection: 'row',
    gap: 12,
  },
  safetyBox: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
    backgroundColor: theme.colors.warningMuted,
    borderWidth: 1,
    borderColor: theme.colors.warning,
    borderRadius: 10,
    padding: 12,
    marginTop: 6,
  },
  safetyTitle: {
    ...theme.typography.footnote,
    fontWeight: '700',
    color: theme.colors.warning,
  },
  safetyDesc: {
    ...theme.typography.caption,
    color: theme.colors.warning,
    marginTop: 2,
    lineHeight: 16,
  },
});
