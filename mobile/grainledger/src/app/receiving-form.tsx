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
import { useMillStore } from '../store/millStore';
import { useFieldStore } from '../store/fieldStore';
import { toDecimal, formatMass } from '../utils/decimalMass';
import { ArrowLeft, Warehouse } from 'lucide-react-native';

export default function ReceivingFormScreen() {
  const theme = useAppTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);
  const router = useRouter();
  const { silos, addReceivingTask } = useMillStore();
  const { receipts } = useFieldStore();

  const [selectedReceiptId, setSelectedReceiptId] = useState(receipts[0]?.id || '');
  const [supplier, setSupplier] = useState('HTX Nông nghiệp Cái Bè');
  const [vehiclePlate, setVehiclePlate] = useState('63C-124.89');
  const [grossWeight, setGrossWeight] = useState('14500');
  const [tareWeight, setTareWeight] = useState('4200');
  const [moisture, setMoisture] = useState('24.2');
  const [selectedSiloId, setSelectedSiloId] = useState(silos[0]?.id || '');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const selectedReceipt = receipts.find((r) => r.id === selectedReceiptId);
  const selectedSilo = silos.find((s) => s.id === selectedSiloId);

  // Exact Net Weight Calculation
  const grossDec = toDecimal(grossWeight);
  const tareDec = toDecimal(tareWeight);
  const netDec = grossDec.minus(tareDec);
  const isValidNet = netDec.greaterThan(0);

  const handleSubmit = async () => {
    if (!isValidNet) {
      Alert.alert('Khối lượng không hợp lệ', 'Khối lượng tổng (Gross) phải lớn hơn khối lượng bì xe (Tare).');
      return;
    }

    setIsSubmitting(true);
    await addReceivingTask({
      sourceProcurementId: selectedReceiptId,
      supplierName: supplier,
      farmerName: selectedReceipt?.farmerName || 'Nguyễn Văn An',
      vehiclePlate,
      grossWeightKg: grossWeight,
      tareWeightKg: tareWeight,
      netWeightKg: netDec.toFixed(2),
      moisturePercent: moisture,
      targetSiloId: selectedSiloId,
      targetSiloName: selectedSilo?.siloName || 'Silo tiếp nhận S-01',
      status: 'WEIGHED',
    });
    setIsSubmitting(false);

    Alert.alert(
      'Tiếp nhận thành công',
      `Đã ghi nhận xe ${vehiclePlate} nhập ${formatMass(netDec.toString(), 0)} kg lúa vào ${selectedSilo?.siloName}.`,
      [{ text: 'Đóng', onPress: () => router.back() }]
    );
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
          <ArrowLeft size={20} color={theme.colors.label} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Cân Xe & Tiếp Nhận Lúa</Text>
        <View style={{ width: 36 }} />
      </View>

      <ScrollView keyboardShouldPersistTaps="handled" automaticallyAdjustKeyboardInsets
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Source Procurement Receipt Link */}
        <Card style={styles.card}>
          <Text style={styles.cardHeader}>1. Liên kết Phiếu Thu mua (Nguồn)</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            {receipts.map((r) => {
              const isSelected = r.id === selectedReceiptId;
              return (
                <TouchableOpacity
                  key={r.id}
                  style={[styles.receiptChip, isSelected && styles.receiptChipActive]}
                  onPress={() => {
                    setSelectedReceiptId(r.id);
                    setSupplier(r.farmerName);
                    if (r.vehiclePlate) setVehiclePlate(r.vehiclePlate);
                    if (r.measuredGrossKg) setGrossWeight(r.measuredGrossKg);
                  }}
                >
                  <Text style={[styles.receiptNum, isSelected && styles.receiptNumActive]}>
                    {r.receiptNumber}
                  </Text>
                  <Text style={styles.receiptSub}>
                    {r.farmerName} • {r.commodityName}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </ScrollView>
        </Card>

        {/* Transport & Vehicle */}
        <Card style={styles.card}>
          <Text style={styles.cardHeader}>2. Xe vận chuyển & Nhà cung cấp</Text>

          <View style={styles.inputRow}>
            <InputField
              label="Biển số xe"
              value={vehiclePlate}
              onChangeText={setVehiclePlate}
              required
              containerStyle={{ flex: 1 }}
            />
            <InputField
              label="Nhà cung cấp / Đội xe"
              value={supplier}
              onChangeText={setSupplier}
              required
              containerStyle={{ flex: 1 }}
            />
          </View>
        </Card>

        {/* Cân Xe: Gross, Tare, Net */}
        <Card style={styles.card}>
          <Text style={styles.cardHeader}>3. Đo lường Trạm cân Cầu xe</Text>

          <View style={styles.inputRow}>
            <InputField
              label="Cân tổng (Xe + Lúa)"
              value={grossWeight}
              onChangeText={setGrossWeight}
              keyboardType="numeric"
              unitSuffix="kg"
              required
              containerStyle={{ flex: 1 }}
            />
            <InputField
              label="Cân bì xe (Xe không)"
              value={tareWeight}
              onChangeText={setTareWeight}
              keyboardType="numeric"
              unitSuffix="kg"
              required
              containerStyle={{ flex: 1 }}
            />
          </View>

          <InputField
            label="Độ ẩm kiểm tra tại cổng"
            value={moisture}
            onChangeText={setMoisture}
            keyboardType="numeric"
            unitSuffix="%"
            required
          />

          {/* Net Calculation Callout */}
          <View style={[styles.netBox, !isValidNet && styles.netBoxError]}>
            <View>
              <Text style={styles.netLabel}>Khối lượng lúa thực nhập (Net Weight):</Text>
              <Text style={styles.netSub}>Net = Cân tổng (Gross) - Cân bì (Tare)</Text>
            </View>
            <Text style={[styles.netVal, !isValidNet && { color: theme.colors.destructive }]}>
              {isValidNet ? `${formatMass(netDec.toString(), 0)} kg` : 'Lỗi tính toán'}
            </Text>
          </View>
        </Card>

        {/* Target Silo Selection */}
        <Card style={styles.card}>
          <Text style={styles.cardHeader}>4. Chỉ định Silo / Hầm tiếp nhận</Text>
          {silos.map((silo) => {
            const isSelected = silo.id === selectedSiloId;
            return (
              <TouchableOpacity
                key={silo.id}
                style={[styles.siloOption, isSelected && styles.siloOptionActive]}
                onPress={() => setSelectedSiloId(silo.id)}
              >
                <Warehouse size={20} color={isSelected ? theme.colors.accent : theme.colors.tertiaryLabel} />
                <View style={{ flex: 1 }}>
                  <Text style={[styles.siloName, isSelected && styles.siloNameActive]}>
                    {silo.siloName}
                  </Text>
                  <Text style={styles.siloDesc}>
                    {silo.commodityType} • Hiện chứa {formatMass(silo.currentMassKg, 0)} kg
                  </Text>
                </View>
              </TouchableOpacity>
            );
          })}
        </Card>

        <Button
          title="Xác nhận Cân & Nhập Silo"
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
  receiptChip: {
    backgroundColor: theme.colors.surfaceSecondary,
    borderWidth: 1.5,
    borderColor: theme.colors.separator,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 8,
    marginRight: 8,
  },
  receiptChipActive: {
    backgroundColor: theme.colors.accentMuted,
    borderColor: theme.colors.accent,
  },
  receiptNum: {
    ...theme.typography.footnote,
    fontWeight: '700',
    color: theme.colors.label,
  },
  receiptNumActive: {
    color: theme.colors.accent,
  },
  receiptSub: {
    ...theme.typography.body,
    color: theme.colors.secondaryLabel,
    marginTop: 2,
  },
  inputRow: {
    flexDirection: 'row',
    gap: 12,
  },
  netBox: {
    backgroundColor: theme.colors.successMuted,
    borderWidth: 1.5,
    borderColor: theme.colors.success,
    borderRadius: 12,
    padding: 12,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 6,
  },
  netBoxError: {
    backgroundColor: theme.colors.destructiveMuted,
    borderColor: theme.colors.destructive,
  },
  netLabel: {
    ...theme.typography.footnote,
    fontWeight: '700',
    color: theme.colors.success,
  },
  netSub: {
    ...theme.typography.body,
    color: theme.colors.success,
    marginTop: 1,
  },
  netVal: {
    ...theme.typography.headline,
    fontWeight: '800',
    color: theme.colors.success,
  },
  siloOption: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    padding: 12,
    borderRadius: 10,
    borderWidth: 1.5,
    borderColor: theme.colors.separator,
    marginBottom: 8,
  },
  siloOptionActive: {
    backgroundColor: theme.colors.accentMuted,
    borderColor: theme.colors.accent,
  },
  siloName: {
    ...theme.typography.subheadline,
    fontWeight: '700',
    color: theme.colors.label,
  },
  siloNameActive: {
    color: theme.colors.accent,
  },
  siloDesc: {
    ...theme.typography.body,
    color: theme.colors.secondaryLabel,
    marginTop: 2,
  },
});
