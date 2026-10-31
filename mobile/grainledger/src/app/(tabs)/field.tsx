import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TextInput,
  RefreshControl,
} from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Header } from '../../components/common/Header';
import { GlassCard } from '../../components/common/GlassCard';
import { GlassButton } from '../../components/common/GlassButton';
import { GlassBadge } from '../../components/common/GlassBadge';
import { GlassSegmentedControl } from '../../components/common/GlassSegmentedControl';
import { useFieldStore } from '../../store/fieldStore';
import { formatMass } from '../../utils/decimalMass';
import { AppleGlass } from '../../theme/appleGlass';
import { useAppTheme } from '../../theme';
import {
  Search,
  Phone,
  User,
} from 'lucide-react-native';

type SubTab = 'receipts' | 'farmers' | 'plots' | 'sprays';

export default function FieldScreen() {
  const router = useRouter();
  const theme = useAppTheme();
  const [activeTab, setActiveTab] = useState<SubTab>('receipts');
  const [searchQuery, setSearchQuery] = useState('');

  const { farmers, plots, sprays, receipts, isLoading, fetchFieldData } = useFieldStore();

  const filteredReceipts = receipts.filter(
    (r) =>
      r.receiptNumber.toLowerCase().includes(searchQuery.toLowerCase()) ||
      r.farmerName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      r.commodityName.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const filteredFarmers = farmers.filter(
    (f) =>
      f.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      f.code.toLowerCase().includes(searchQuery.toLowerCase()) ||
      f.contact.includes(searchQuery)
  );

  const filteredPlots = plots.filter(
    (p) =>
      p.code.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.variety.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (p.farmerName && p.farmerName.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  const filteredSprays = sprays.filter(
    (s) =>
      s.productName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      s.plotCode.toLowerCase().includes(searchQuery.toLowerCase()) ||
      s.substanceId.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: theme.colors.background }]}>
      <Header
        title="Thực địa & Thu mua"
        subtitle="Quản lý nông hộ, thửa ruộng và chuỗi thu hoạch tại ruộng"
      />

      {/* Apple Glass Segmented Control */}
      <View style={styles.tabBarContainer}>
        <GlassSegmentedControl
          segments={[
            { id: 'receipts', label: 'Thu mua', count: receipts.length },
            { id: 'farmers', label: 'Nông hộ', count: farmers.length },
            { id: 'plots', label: 'Thửa ruộng', count: plots.length },
            { id: 'sprays', label: 'BVTV', count: sprays.length },
          ]}
          activeId={activeTab}
          onSelect={(id) => setActiveTab(id as SubTab)}
        />
      </View>

      {/* Search and Action Bar */}
      <View style={styles.searchRow}>
        <GlassCard
          tintColor="rgba(255, 255, 255, 0.85)"
          borderRadius={AppleGlass.radii.pill}
          contentStyle={styles.searchWrapper}
          style={{ flex: 1 }}
        >
          <Search size={16} color="#64748B" />
          <TextInput
            style={[styles.searchInput, { color: theme.colors.label }]}
            placeholder="Tìm kiếm mã, tên, số ĐT..."
            placeholderTextColor={theme.colors.tertiaryLabel}
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
        </GlassCard>

        <GlassButton
          title="+ Tạo mới"
          variant="primary"
          size="small"
          onPress={() => {
            if (activeTab === 'receipts') router.push('/procurement-form');
            else if (activeTab === 'farmers') router.push('/farmer-form');
            else if (activeTab === 'plots') router.push('/plot-form');
            else router.push('/spray-form');
          }}
        />
      </View>

      <ScrollView
        style={styles.contentScroll}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={isLoading}
            onRefresh={fetchFieldData}
            tintColor={theme.colors.accent}
            colors={[theme.colors.accent]}
          />
        }
      >
        {/* RECEIPTS */}
        {activeTab === 'receipts' && (
          <View>
            {filteredReceipts.map((r) => (
              <GlassCard
                key={r.id}
                borderRadius={AppleGlass.radii.lg}
                style={styles.itemCard}
                interactive
              >
                <View style={styles.cardHeader}>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.itemCode}>{r.receiptNumber}</Text>
                    <Text style={styles.itemFarmer}>{r.farmerName}</Text>
                  </View>
                  <GlassBadge status={r.status} />
                </View>

                <View style={styles.cardDivider} />

                <View style={styles.rowBetween}>
                  <View style={styles.infoCol}>
                    <Text style={styles.infoLabel}>Khối lượng</Text>
                    <Text style={[styles.infoVal, { color: AppleGlass.colors.brandGreen, fontWeight: '800' }]}>
                      {formatMass(r.measuredGrossKg, 0)} kg
                    </Text>
                  </View>
                  <View style={styles.infoCol}>
                    <Text style={styles.infoLabel}>Độ ẩm</Text>
                    <Text style={styles.infoVal}>{r.moisturePercent}%</Text>
                  </View>
                  <View style={styles.infoCol}>
                    <Text style={styles.infoLabel}>Địa điểm</Text>
                    <Text style={styles.infoVal}>{r.collectionSite}</Text>
                  </View>
                </View>
              </GlassCard>
            ))}
          </View>
        )}

        {/* FARMERS */}
        {activeTab === 'farmers' && (
          <View>
            {filteredFarmers.map((f) => (
              <GlassCard
                key={f.id}
                borderRadius={AppleGlass.radii.lg}
                style={styles.itemCard}
                interactive
              >
                <View style={styles.cardHeader}>
                  <View style={styles.avatarRow}>
                    <View style={styles.avatarBox}>
                      <User size={18} color={AppleGlass.colors.brandGreen} />
                    </View>
                    <View>
                      <Text style={styles.farmerName}>{f.name}</Text>
                      <Text style={styles.farmerCode}>Mã: {f.code}</Text>
                    </View>
                  </View>
                  <GlassBadge status={f.syncStatus} size="small" />
                </View>

                <View style={styles.cardDivider} />

                <View style={styles.farmerFooter}>
                  <View style={styles.phoneRow}>
                    <Phone size={13} color="#64748B" />
                    <Text style={styles.phoneText}>{f.contact || 'Chưa có số ĐT'}</Text>
                  </View>
                  <Text style={styles.registerDate}>Ngày đăng ký: {f.registeredAt}</Text>
                </View>
              </GlassCard>
            ))}
          </View>
        )}

        {/* PLOTS */}
        {activeTab === 'plots' && (
          <View>
            {filteredPlots.map((p) => (
              <GlassCard
                key={p.id}
                borderRadius={AppleGlass.radii.lg}
                style={styles.itemCard}
                interactive
              >
                <View style={styles.cardHeader}>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.itemCode}>{p.code}</Text>
                    <Text style={styles.itemFarmer}>Nông hộ: {p.farmerName}</Text>
                  </View>
                  <View style={styles.areaBadge}>
                    <Text style={styles.areaText}>{p.areaHa} ha</Text>
                  </View>
                </View>

                <View style={styles.cardDivider} />

                <View style={styles.rowBetween}>
                  <View style={styles.infoCol}>
                    <Text style={styles.infoLabel}>Giống lúa</Text>
                    <Text style={styles.infoVal}>{p.variety}</Text>
                  </View>
                  <View style={styles.infoCol}>
                    <Text style={styles.infoLabel}>Vụ mùa</Text>
                    <Text style={styles.infoVal}>{p.season}</Text>
                  </View>
                </View>
              </GlassCard>
            ))}
          </View>
        )}

        {/* SPRAYS */}
        {activeTab === 'sprays' && (
          <View>
            {filteredSprays.map((s) => (
              <GlassCard
                key={s.id}
                borderRadius={AppleGlass.radii.lg}
                style={styles.itemCard}
                interactive
              >
                <View style={styles.cardHeader}>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.itemCode}>{s.productName}</Text>
                    <Text style={styles.itemFarmer}>Thửa ruộng: {s.plotCode}</Text>
                  </View>
                  <GlassBadge status="COMMITTED" label="HỢP LỆ" />
                </View>

                <View style={styles.cardDivider} />

                <View style={styles.rowBetween}>
                  <View style={styles.infoCol}>
                    <Text style={styles.infoLabel}>Ngày phun</Text>
                    <Text style={styles.infoVal}>{s.appliedOn}</Text>
                  </View>
                  <View style={styles.infoCol}>
                    <Text style={styles.infoLabel}>Cách ly (PHI)</Text>
                    <Text style={styles.infoVal}>{s.phiDays} ngày</Text>
                  </View>
                  <View style={styles.infoCol}>
                    <Text style={styles.infoLabel}>Thu hoạch từ</Text>
                    <Text style={[styles.infoVal, { color: AppleGlass.colors.brandGreen }]}>
                      {s.harvestAllowedDate}
                    </Text>
                  </View>
                </View>
              </GlassCard>
            ))}
          </View>
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
  tabBarContainer: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    backgroundColor: 'rgba(255, 255, 255, 0.4)',
  },
  searchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 16,
    paddingVertical: 8,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
  },
  searchWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 4,
    gap: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 13,
    color: '#0F172A',
    paddingVertical: 6,
  },
  contentScroll: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 120,
  },
  itemCard: {
    marginBottom: 12,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  itemCode: {
    fontSize: 15,
    fontWeight: '800',
    color: '#0F172A',
  },
  itemFarmer: {
    fontSize: 12,
    color: '#64748B',
    marginTop: 2,
  },
  cardDivider: {
    height: 1,
    backgroundColor: 'rgba(226, 232, 240, 0.8)',
    marginVertical: 10,
  },
  rowBetween: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  infoCol: {
    flex: 1,
  },
  infoLabel: {
    fontSize: 11,
    color: '#64748B',
    marginBottom: 2,
  },
  infoVal: {
    fontSize: 13,
    fontWeight: '600',
    color: '#0F172A',
  },
  avatarRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  avatarBox: {
    width: 36,
    height: 36,
    borderRadius: AppleGlass.radii.pill,
    backgroundColor: 'rgba(15, 56, 40, 0.1)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  farmerName: {
    fontSize: 15,
    fontWeight: '800',
    color: '#0F172A',
  },
  farmerCode: {
    fontSize: 11,
    color: '#64748B',
    marginTop: 1,
  },
  farmerFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  phoneRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  phoneText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#334155',
  },
  registerDate: {
    fontSize: 11,
    color: '#64748B',
  },
  areaBadge: {
    backgroundColor: '#ECFDF5',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  areaText: {
    fontSize: 12,
    fontWeight: '800',
    color: AppleGlass.colors.brandGreen,
  },
});
