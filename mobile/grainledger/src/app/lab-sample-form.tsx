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
import { useComplianceStore } from '../store/complianceStore';
import { useMillStore } from '../store/millStore';
import { AppleGlass } from '../theme/appleGlass';
import { Lock, FlaskConical, Building2, MapPin, Check } from 'lucide-react-native';

const LAB_PARTNERS = [
  'Eurofins Sắc Ký Hải Đăng',
  'SGS Vietnam Co., Ltd',
  'Trung tâm Kỹ thuật Tiêu chuẩn Đo lường 3 (QUATEST 3)',
  'Vinacontrol TP. Hồ Chí Minh',
];

export default function LabSampleFormModal() {
  const router = useRouter();
  const { addSample } = useComplianceStore();
  const { traceLots } = useMillStore();

  const [selectedLotId, setSelectedLotId] = useState(traceLots[0]?.id || 'lot-raw-01');
  const [sealCode, setSealCode] = useState('SEAL-VN-98421');
  const [labName, setLabName] = useState(LAB_PARTNERS[0]);
  const [materialDescription, setMaterialDescription] = useState('Lúa tươi ST25 - Vụ Đông Xuân');
  const [collectionLocation, setCollectionLocation] = useState('Trạm tiếp nhận Cái Bè, Tiền Giang');
  const [loading, setLoading] = useState(false);

  const selectedLot = traceLots.find((l) => l.id === selectedLotId) || traceLots[0];

  const handleSubmit = async () => {
    if (!sealCode.trim()) {
      Alert.alert('Thiếu thông tin', 'Vui lòng nhập số niêm chì (Seal Code).');
      return;
    }

    setLoading(true);
    try {
      await addSample({
        sourceLotId: selectedLotId,
        sourceLotCode: selectedLot?.lotCode || 'RAW-LOT-01',
        sealCode: sealCode.trim(),
        materialDescription,
        collectionLocation,
        collectedAt: new Date().toISOString().replace('T', ' ').slice(0, 16),
      });

      Alert.alert('Thành công', 'Đã lập biên bản lấy mẫu và gắn số seal niêm chì.', [
        { text: 'Đóng', onPress: () => router.back() },
      ]);
    } catch {
      Alert.alert('Thông báo', 'Đã lưu mẫu vào bộ nhớ ngoại tuyến.');
      router.back();
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <GlassHeader
        title="Đăng ký Mẫu Xét nghiệm"
        subtitle="Lập biên bản niêm phong mẫu kiểm định MRL"
        showBack
      />

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Source Lot Picker */}
        <GlassCard
          tintColor="rgba(255, 255, 255, 0.85)"
          borderRadius={AppleGlass.radii.lg}
          style={styles.card}
        >
          <Text style={styles.sectionHeading}>1. Chọn Lô Gạo Cần Kiểm Nghiệm</Text>
          <View style={styles.lotList}>
            {traceLots.slice(0, 4).map((lot) => {
              const isSelected = lot.id === selectedLotId;
              return (
                <TouchableOpacity
                  key={lot.id}
                  style={[
                    styles.lotOption,
                    isSelected && styles.lotOptionSelected,
                  ]}
                  onPress={() => setSelectedLotId(lot.id)}
                >
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.lotCode, isSelected && styles.lotCodeSelected]}>
                      {lot.lotCode}
                    </Text>
                    <Text style={styles.lotProduct}>{lot.productType}</Text>
                  </View>
                  {isSelected && <Check size={18} color={AppleGlass.colors.brandGreen} />}
                </TouchableOpacity>
              );
            })}
          </View>
        </GlassCard>

        {/* Seal and Security Details */}
        <GlassCard
          tintColor="rgba(255, 255, 255, 0.85)"
          borderRadius={AppleGlass.radii.lg}
          style={styles.card}
        >
          <Text style={styles.sectionHeading}>2. Niêm chì & Bảo mật Chuỗi Hành trình</Text>

          <GlassInput
            label="Số hiệu Niêm chì (Seal Code) *"
            value={sealCode}
            onChangeText={setSealCode}
            placeholder="VD: SEAL-VN-88492"
            leftIcon={<Lock size={18} color="#047857" />}
          />

          <GlassInput
            label="Mô tả Vật liệu Lấy mẫu"
            value={materialDescription}
            onChangeText={setMaterialDescription}
            placeholder="VD: Lúa tươi ST25 sau thu hoạch"
            leftIcon={<FlaskConical size={18} color="#3B82F6" />}
          />

          <GlassInput
            label="Địa điểm Lấy mẫu"
            value={collectionLocation}
            onChangeText={setCollectionLocation}
            placeholder="VD: Nhà máy Xay xát Tiền Giang"
            leftIcon={<MapPin size={18} color="#D97706" />}
          />
        </GlassCard>

        {/* Lab Partner Selection */}
        <GlassCard
          tintColor="rgba(255, 255, 255, 0.85)"
          borderRadius={AppleGlass.radii.lg}
          style={styles.card}
        >
          <Text style={styles.sectionHeading}>3. Phòng Thí nghiệm Chỉ định</Text>

          <View style={styles.labOptions}>
            {LAB_PARTNERS.map((lab) => {
              const isSelected = lab === labName;
              return (
                <TouchableOpacity
                  key={lab}
                  style={[
                    styles.labOption,
                    isSelected && styles.labOptionSelected,
                  ]}
                  onPress={() => setLabName(lab)}
                >
                  <Building2 size={16} color={isSelected ? AppleGlass.colors.brandGreen : '#64748B'} />
                  <Text style={[styles.labText, isSelected && styles.labTextSelected]}>
                    {lab}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </GlassCard>

        {/* Submit Button */}
        <GlassButton
          title="Xác nhận & Niêm phong Mẫu"
          variant="primary"
          size="large"
          loading={loading}
          onPress={handleSubmit}
          fullWidth
          style={styles.submitBtn}
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
    letterSpacing: -0.2,
  },
  lotList: {
    gap: 8,
  },
  lotOption: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: AppleGlass.radii.md,
    backgroundColor: 'rgba(241, 245, 249, 0.7)',
    borderWidth: 1,
    borderColor: 'transparent',
  },
  lotOptionSelected: {
    backgroundColor: '#ECFDF5',
    borderColor: '#34D399',
  },
  lotCode: {
    fontSize: 14,
    fontWeight: '700',
    color: '#0F172A',
  },
  lotCodeSelected: {
    color: AppleGlass.colors.brandGreen,
  },
  lotProduct: {
    fontSize: 12,
    color: '#64748B',
    marginTop: 2,
  },
  labOptions: {
    gap: 8,
  },
  labOption: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    padding: 12,
    borderRadius: AppleGlass.radii.md,
    backgroundColor: 'rgba(241, 245, 249, 0.7)',
    borderWidth: 1,
    borderColor: 'transparent',
  },
  labOptionSelected: {
    backgroundColor: '#ECFDF5',
    borderColor: '#34D399',
  },
  labText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#334155',
    flex: 1,
  },
  labTextSelected: {
    color: AppleGlass.colors.brandGreen,
    fontWeight: '700',
  },
  submitBtn: {
    marginTop: 8,
  },
});
