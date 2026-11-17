import { router } from 'expo-router';
import { useState } from 'react';
import { KeyboardAvoidingView, Platform, ScrollView, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { GlassButton } from '@/components/glass/GlassButton';
import { GlassCard } from '@/components/glass/GlassCard';
import { useAuth } from '@/features/auth/AuthProvider';
import { useAppTheme } from '@/theme/ThemeProvider';
import { ComplianceDenied } from './LabReportsScreen';
import { ComplianceField, ComplianceText, formStyles } from './compliance-ui';
import { canViewSafetyMargin, demoMarkets, demoSubstances, simulateSafetyMargin, type DemoMarket } from './safety-margin-model';
import { AssessmentPolicyPanel } from '../governance/AssessmentPolicyPanel';

export function SafetyMarginScreen() {
  const { client, user } = useAuth();
  const scope = client.getRequestScope();
  if (!user || scope === null) return null;
  return canViewSafetyMargin(user) ? <SafetySimulation key={scope} /> : <ComplianceDenied />;
}
function SafetySimulation() {
  const { theme } = useAppTheme();
  const [locale, setLocale] = useState<'vi' | 'en'>('vi');
  const tr = (vi: string, en: string) => locale === 'vi' ? vi : en;
  const [market, setMarket] = useState<DemoMarket>('EU');
  const [substance, setSubstance] = useState(0);
  const [buffer, setBuffer] = useState(20);
  const [measured, setMeasured] = useState('0.0075');
  const [technical, setTechnical] = useState(false);
  const mi = demoMarkets.indexOf(market);
  const result = simulateSafetyMargin(demoSubstances[substance].limits[mi], buffer, measured);
  return <SafeAreaView style={[formStyles.screen, { backgroundColor: theme.colors.backgroundGrouped }]}>
    <KeyboardAvoidingView style={formStyles.screen} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
      <ScrollView contentContainerStyle={formStyles.content} keyboardShouldPersistTaps="handled" keyboardDismissMode="on-drag">
        <View style={formStyles.row}><GlassButton opaque variant="glass" label={tr('Trang chủ', 'Home')} onPress={() => router.dismissTo('/home')} />
          <GlassButton opaque variant="glass" label={locale === 'vi' ? 'English' : 'Tiếng Việt'} onPress={() => setLocale(locale === 'vi' ? 'en' : 'vi')} /></View>
        <ComplianceText heading>{tr('Biên an toàn', 'Safety margin')}</ComplianceText>
        <AssessmentPolicyPanel locale={locale} />
        <GlassCard opaque title={tr('Mô phỏng minh họa từ phiên bản web', 'Web-source demonstration')}>
          <ComplianceText>{tr('Số liệu cố định của bản web, chưa được xác minh theo quy định hiện hành. Không dùng để quyết định xuất hàng, phê duyệt phối trộn hoặc tạo HOLD. Thay đổi không được lưu.', 'Fixed demonstration values from the web source, not verified against current regulations. They do not authorize shipments, blending approval or HOLD creation. Changes are not saved.')}</ComplianceText>
          <ComplianceText>{tr('Thị trường minh họa', 'Demonstration market')}</ComplianceText>
          <View style={formStyles.row}>{demoMarkets.map((code) => <GlassButton opaque key={code} label={code} variant={market === code ? 'primary' : 'glass'}
            accessibilityState={{ selected: market === code }} onPress={() => setMarket(code)} />)}</View>
          <ComplianceText>{tr('Hoạt chất minh họa', 'Demonstration substance')}</ComplianceText>
          <View style={formStyles.row}>{demoSubstances.map((item, index) => <GlassButton opaque key={item.code} label={item.name} variant={substance === index ? 'primary' : 'glass'}
            accessibilityState={{ selected: substance === index }} onPress={() => setSubstance(index)} />)}</View>
          <ComplianceText>{tr('Biên đệm mô phỏng', 'Simulation buffer')}: {buffer}%</ComplianceText>
          <View style={formStyles.row}>{[10, 15, 20, 25, 30].map((value) => <GlassButton opaque key={value} label={`${value}%`} variant={buffer === value ? 'primary' : 'glass'}
            accessibilityState={{ selected: buffer === value }} onPress={() => setBuffer(value)} />)}</View>
          <ComplianceField label={tr('Nồng độ giả định (mg/kg)', 'Hypothetical concentration (mg/kg)')} keyboardType="decimal-pad" value={measured} onChangeText={setMeasured}
            error={!result ? tr('Nhập số thập phân không âm.', 'Enter a nonnegative decimal.') : undefined} />
          {result ? <>
            <ComplianceText>{tr('Giới hạn dữ liệu mẫu', 'Demo limit')}: {result.limit} mg/kg</ComplianceText>
            <ComplianceText>{tr('Ngưỡng sau biên đệm', 'Buffered threshold')}: {result.threshold} mg/kg</ComplianceText>
            <ComplianceText>{result.verdict === 'SAFE_PASS' ? tr('Mô phỏng: trong ngưỡng có đệm', 'Simulation: within buffered threshold')
              : result.verdict === 'WARNING_BUFFER' ? tr('Mô phỏng: nằm trong vùng đệm', 'Simulation: within buffer zone') : tr('Mô phỏng: vượt giới hạn dữ liệu mẫu', 'Simulation: exceeds demonstration limit')}</ComplianceText>
          </> : null}
          <GlassButton opaque variant="glass" label={tr('Đặt lại mô phỏng', 'Reset simulation')} onPress={() => { setMarket('EU'); setSubstance(0); setBuffer(20); setMeasured('0.0075'); }} />
        </GlassCard>
        <GlassCard opaque title={`${tr('Bảng dữ liệu minh họa', 'Demonstration data')} · ${market}`}>
          {demoSubstances.map((item) => <View key={item.code} style={{ gap: 8 }}>
            <ComplianceText>{item.name}</ComplianceText><ComplianceText>{tr('Giới hạn', 'Limit')}: {item.limits[mi]} · {tr('Cận 95% trong dữ liệu mẫu', 'Demo upper 95%')}: {item.upper95[mi]} mg/kg</ComplianceText>
            <ComplianceText>{tr('Ngưỡng sau đệm', 'Buffered threshold')}: {simulateSafetyMargin(item.limits[mi], buffer, '0')?.threshold} mg/kg</ComplianceText>
          </View>)}
        </GlassCard>
        <GlassButton opaque variant="glass" label={tr('Giải thích công thức', 'Explain the formula')} accessibilityState={{ expanded: technical }} onPress={() => setTechnical(!technical)} />
        {technical ? <GlassCard opaque><ComplianceText>{tr('Ngưỡng = giới hạn × (1 − biên đệm / 100). Nồng độ ≤ ngưỡng: trong biên; ngưỡng < nồng độ ≤ giới hạn: vùng đệm; cao hơn giới hạn: vượt giới hạn mẫu. Cận 95% là dữ liệu tham khảo cố định, không được suy ra từ kết quả nhập. Công thức không thay thế đánh giá của máy chủ hoặc quy định được xác minh.', 'Threshold = limit × (1 − buffer / 100). Concentration ≤ threshold is within the buffer; above threshold up to the limit is the buffer zone; above the limit exceeds the demonstration limit. Upper 95% is fixed reference data, not inferred from the entered result. This formula does not replace server assessment or verified regulations.')}</ComplianceText></GlassCard> : null}
      </ScrollView>
    </KeyboardAvoidingView>
  </SafeAreaView>;
}
