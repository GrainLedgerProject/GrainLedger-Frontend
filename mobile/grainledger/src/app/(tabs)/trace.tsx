import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TextInput,
  TouchableOpacity,
  RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Header } from '../../components/common/Header';
import { GlassCard } from '../../components/common/GlassCard';
import { GlassBadge } from '../../components/common/GlassBadge';
import { useMillStore } from '../../store/millStore';
import { formatMass } from '../../utils/decimalMass';
import { AppleGlass } from '../../theme/appleGlass';
import { useAppTheme } from '../../theme';
import {
  Search,
  QrCode,
  ShieldCheck,
  CheckCircle2,
  Check,
  Sparkles,
} from 'lucide-react-native';

export default function TraceScreen() {
  const theme = useAppTheme();
  const { traceLots, getLotByCode, isLoading, fetchMillData } = useMillStore();
  const [searchInput, setSearchInput] = useState('');
  const [selectedLotId, setSelectedLotId] = useState<string | null>(null);

  const currentLot = (selectedLotId ? traceLots.find((l) => l.id === selectedLotId) : undefined) ?? traceLots[0];

  const handleSearch = () => {
    const found = getLotByCode(searchInput);
    if (found) {
      setSelectedLotId(found.id);
    }
  };

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: theme.colors.background }]}>
      <Header
        title="Truy xuất Nguồn gốc"
        subtitle="Tra cứu chuỗi hành trình & kiểm định MRL bất biến"
      />

      {/* Apple Glass Search and Scan Bar */}
      <View style={styles.searchContainer}>
        <GlassCard
          tintColor="rgba(255, 255, 255, 0.85)"
          borderRadius={AppleGlass.radii.pill}
          contentStyle={styles.searchBarInner}
        >
          <Search size={18} color="#64748B" />
          <TextInput
            style={[styles.input, { color: theme.colors.label }]}
            placeholder="Nhập mã lô hàng (VD: RAW-...)"
            placeholderTextColor={theme.colors.tertiaryLabel}
            value={searchInput}
            onChangeText={setSearchInput}
            onSubmitEditing={handleSearch}
          />
          <TouchableOpacity style={styles.scanBtn} onPress={handleSearch} activeOpacity={0.7}>
            <QrCode size={18} color={AppleGlass.colors.brandGreen} />
          </TouchableOpacity>
        </GlassCard>

        {/* Suggestion Chips */}
        {traceLots.length > 0 ? (
          <View style={styles.suggestionRow}>
            <Text style={styles.suggestLabel}>Lô khả dụng:</Text>
            {traceLots.slice(0, 3).map((lot) => (
              <TouchableOpacity
                key={lot.id}
                style={[
                  styles.chip,
                  currentLot?.id === lot.id && styles.chipActive,
                ]}
                onPress={() => {
                  setSearchInput(lot.lotCode);
                  setSelectedLotId(lot.id);
                }}
              >
                <Text
                  style={[
                    styles.chipText,
                    currentLot?.id === lot.id && styles.chipTextActive,
                  ]}
                >
                  {lot.lotCode}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        ) : null}
      </View>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={isLoading}
            onRefresh={fetchMillData}
            tintColor={theme.colors.accent}
            colors={[theme.colors.accent]}
          />
        }
      >
        {currentLot ? (
          <View>
            {/* Lot Summary Glass Hero Card */}
            <GlassCard
              tintColor="rgba(255, 255, 255, 0.9)"
              borderRadius={AppleGlass.radii.xl}
              elevated
              style={styles.lotHeroCard}
            >
              <View style={styles.heroTop}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.heroCode}>{currentLot.lotCode}</Text>
                  <Text style={styles.heroProduct}>{currentLot.productType}</Text>
                </View>
                <GlassBadge status={currentLot.status} size="medium" />
              </View>

              <View style={styles.heroDivider} />

              <View style={styles.heroStatsRow}>
                <View style={styles.heroStatItem}>
                  <Text style={styles.heroStatLabel}>Khối lượng hiện tại</Text>
                  <Text style={styles.heroStatVal}>
                    {formatMass(currentLot.currentMassKg, 0)} kg
                  </Text>
                </View>

                <View style={styles.heroStatItem}>
                  <Text style={styles.heroStatLabel}>Độ thuần chủng</Text>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                    <Sparkles size={14} color="#D97706" />
                    <Text style={[styles.heroStatVal, { color: '#D97706' }]}>
                      {currentLot.purityScore}%
                    </Text>
                  </View>
                </View>

                <View style={styles.heroStatItem}>
                  <Text style={styles.heroStatLabel}>Ngày đóng gói</Text>
                  <Text style={styles.heroStatVal}>{currentLot.createdDate}</Text>
                </View>
              </View>
            </GlassCard>

            {/* MRL Compliance Banner */}
            <GlassCard
              tintColor="rgba(240, 253, 244, 0.9)"
              borderTint="rgba(52, 199, 89, 0.4)"
              borderRadius={AppleGlass.radii.lg}
              style={styles.mrlCard}
            >
              <View style={styles.mrlHeader}>
                <View style={styles.mrlIconBox}>
                  <ShieldCheck size={24} color="#166534" />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.mrlTitle}>Chứng nhận Dư lượng MRL Đạt chuẩn</Text>
                  <Text style={styles.mrlSub}>
                    Phù hợp quy chuẩn xuất khẩu thị trường EU, US và Nhật Bản.
                  </Text>
                </View>
              </View>

              <View style={styles.mrlDivider} />

              <View style={styles.mrlChecklist}>
                <View style={styles.mrlItem}>
                  <Check size={14} color="#166534" />
                  <Text style={styles.mrlItemText}>Azoxystrobin: 0.02 mg/kg (Ngưỡng 2.0)</Text>
                </View>
                <View style={styles.mrlItem}>
                  <Check size={14} color="#166534" />
                  <Text style={styles.mrlItemText}>Tricyclazole: Không phát hiện (LOD &lt; 0.01)</Text>
                </View>
                <View style={styles.mrlItem}>
                  <Check size={14} color="#166534" />
                  <Text style={styles.mrlItemText}>Kim loại nặng (Cadmium, Chì): Đạt an toàn</Text>
                </View>
              </View>
            </GlassCard>

            {/* Farmer Origin Composition */}
            <View style={styles.sectionHeaderRow}>
              <Text style={styles.sectionTitle}>Nguồn gốc Nông hộ & Thửa ruộng</Text>
            </View>

            {currentLot.farmerOrigins.map((origin, index) => (
              <GlassCard
                key={index}
                borderRadius={AppleGlass.radii.lg}
                style={styles.originCard}
                interactive
              >
                <View style={styles.originTop}>
                  <View>
                    <Text style={styles.originFarmer}>{origin.farmerName}</Text>
                    <Text style={styles.originPlot}>
                      Mã: {origin.farmerCode} • Thửa {origin.plotCode} ({origin.province})
                    </Text>
                  </View>
                  <View style={styles.originPercentBadge}>
                    <Text style={styles.originPercentText}>{origin.percentage}%</Text>
                  </View>
                </View>

                <View style={styles.originDivider} />

                <View style={styles.originFooter}>
                  <Text style={styles.originVariety}>Giống: {origin.variety}</Text>
                  <Text style={styles.originHarvest}>Thu hoạch: {origin.harvestDate}</Text>
                </View>
              </GlassCard>
            ))}

            {/* Supply Chain Timeline with Apple Glass */}
            <View style={styles.sectionHeaderRow}>
              <Text style={styles.sectionTitle}>Hành trình Chuỗi Cung ứng</Text>
            </View>

            <GlassCard
              borderRadius={AppleGlass.radii.lg}
              style={styles.timelineCard}
            >
              {currentLot.history.map((step, idx) => (
                <View key={idx} style={styles.timelineStep}>
                  <View style={styles.timelineLeft}>
                    <View style={styles.timelineDot}>
                      <CheckCircle2 size={12} color="#FFFFFF" />
                    </View>
                    {idx < currentLot.history.length - 1 && (
                      <View style={styles.timelineLine} />
                    )}
                  </View>

                  <View style={styles.timelineRight}>
                    <View style={styles.stepHeader}>
                      <Text style={styles.stepTitle}>{step.stage}</Text>
                      <Text style={styles.stepTime}>{step.timestamp}</Text>
                    </View>
                    <Text style={styles.stepOperator}>Thực hiện: {step.operator}</Text>
                    <Text style={styles.stepDetail}>{step.detail}</Text>
                  </View>
                </View>
              ))}
            </GlassCard>
          </View>
        ) : (
          <GlassCard style={styles.emptyContainer}>
            <Text style={styles.emptyText}>Không tìm thấy mã lô tương ứng.</Text>
          </GlassCard>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: AppleGlass.colors.systemBackground,
  },
  searchContainer: {
    backgroundColor: 'rgba(255, 255, 255, 0.4)',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(226, 232, 240, 0.8)',
  },
  searchBarInner: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 4,
    gap: 8,
  },
  input: {
    flex: 1,
    fontSize: 14,
    color: '#0F172A',
    paddingVertical: 8,
  },
  scanBtn: {
    padding: 6,
    borderRadius: 8,
    backgroundColor: 'rgba(15, 56, 40, 0.08)',
  },
  suggestionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 10,
    gap: 8,
  },
  suggestLabel: {
    fontSize: 12,
    color: '#64748B',
  },
  chip: {
    backgroundColor: 'rgba(255, 255, 255, 0.8)',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: AppleGlass.radii.pill,
    borderWidth: 1,
    borderColor: 'rgba(226, 232, 240, 0.8)',
  },
  chipActive: {
    backgroundColor: '#ECFDF5',
    borderColor: '#34D399',
  },
  chipText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#475569',
  },
  chipTextActive: {
    color: AppleGlass.colors.brandGreen,
    fontWeight: '700',
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 120,
  },
  lotHeroCard: {
    marginBottom: 12,
  },
  heroTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  heroCode: {
    fontSize: 17,
    fontWeight: '800',
    color: '#0F172A',
  },
  heroProduct: {
    fontSize: 13,
    color: '#475569',
    marginTop: 2,
  },
  heroDivider: {
    height: 1,
    backgroundColor: 'rgba(226, 232, 240, 0.8)',
    marginVertical: 12,
  },
  heroStatsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  heroStatItem: {
    flex: 1,
  },
  heroStatLabel: {
    fontSize: 11,
    color: '#64748B',
    marginBottom: 2,
  },
  heroStatVal: {
    fontSize: 14,
    fontWeight: '700',
    color: '#0F172A',
  },
  mrlCard: {
    marginBottom: 16,
  },
  mrlHeader: {
    flexDirection: 'row',
    gap: 12,
    alignItems: 'center',
  },
  mrlIconBox: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: '#DCFCE7',
    alignItems: 'center',
    justifyContent: 'center',
  },
  mrlTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: '#166534',
  },
  mrlSub: {
    fontSize: 12,
    color: '#15803D',
    marginTop: 2,
  },
  mrlDivider: {
    height: 1,
    backgroundColor: 'rgba(52, 199, 89, 0.25)',
    marginVertical: 10,
  },
  mrlChecklist: {
    gap: 6,
  },
  mrlItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  mrlItemText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#166534',
  },
  sectionHeaderRow: {
    marginTop: 8,
    marginBottom: 10,
  },
  sectionTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: '#0F172A',
  },
  originCard: {
    marginBottom: 10,
  },
  originTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  originFarmer: {
    fontSize: 14,
    fontWeight: '800',
    color: '#0F172A',
  },
  originPlot: {
    fontSize: 12,
    color: '#475569',
    marginTop: 2,
  },
  originPercentBadge: {
    backgroundColor: '#ECFDF5',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#A7F3D0',
  },
  originPercentText: {
    fontSize: 13,
    fontWeight: '800',
    color: AppleGlass.colors.brandGreen,
  },
  originDivider: {
    height: 1,
    backgroundColor: 'rgba(226, 232, 240, 0.8)',
    marginVertical: 8,
  },
  originFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  originVariety: {
    fontSize: 12,
    color: '#475569',
  },
  originHarvest: {
    fontSize: 12,
    color: '#64748B',
  },
  timelineCard: {
    padding: 16,
    marginBottom: 16,
  },
  timelineStep: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 16,
  },
  timelineLeft: {
    alignItems: 'center',
    width: 20,
  },
  timelineDot: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: AppleGlass.colors.brandGreen,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 2,
  },
  timelineLine: {
    width: 2,
    flex: 1,
    backgroundColor: '#CBD5E1',
    marginTop: 4,
    marginBottom: -16,
  },
  timelineRight: {
    flex: 1,
  },
  stepHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  stepTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#0F172A',
  },
  stepTime: {
    fontSize: 11,
    color: '#64748B',
  },
  stepOperator: {
    fontSize: 12,
    color: AppleGlass.colors.brandGreen,
    fontWeight: '600',
    marginTop: 2,
  },
  stepDetail: {
    fontSize: 12,
    color: '#475569',
    marginTop: 2,
    lineHeight: 16,
  },
  emptyContainer: {
    padding: 30,
    alignItems: 'center',
  },
  emptyText: {
    fontSize: 14,
    color: '#64748B',
  },
});
