import { useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { GlassInput } from '@/components/glass/GlassInput';
import { LandingControl, LandingPanel, useLandingAppearance } from './landing-ui';
import { MRL_DEMO, type LandingLocale } from './landing-data';
import { demoPresets, evaluateLedgerDemo, evaluateMrlDemo, formatDemoMass, markets, substances, type Market, type Substance } from './landing-model';

export function LandingSimulator({ locale }: { locale: LandingLocale }) {
  const { theme, palette: p } = useLandingAppearance();
  const { colors: c, typography: t, spacing: s } = theme;
  const tr = (vi: string, en: string) => locale === 'vi' ? vi : en;
  const [tab, setTab] = useState<'LEDGER' | 'MRL'>('LEDGER');
  const [mass, setMass] = useState<readonly string[]>(demoPresets.balanced);
  const [market, setMarket] = useState<Market>('EU');
  const [substance, setSubstance] = useState<Substance>('TCZ');
  const ledger = evaluateLedgerDemo(mass[0], mass[1], mass[2]);
  const mrl = evaluateMrlDemo(market, substance);
  const ledgerReady = ledger.status === 'balanced' || ledger.status === 'rejected';
  const ledgerFailure = ledger.status === 'rejected' || ledger.status === 'invalid';

  return <View style={{ gap: s.lg }}>
    <Text style={[t.caption, { color: c.textSecondary }]}>{tr(
      'Mô phỏng cục bộ bằng dữ liệu minh họa trong dự án. Không gửi API, không ghi sổ, không xác nhận tuân thủ hay cấp phép xuất hàng thực tế.',
      'Local illustration using the project’s demo data. No API submission, ledger entry, compliance certification or shipment authorization is performed.')}</Text>
    <View style={[styles.row, { gap: 4, padding: 4, borderRadius: 16, backgroundColor: p.grouped }]}>
      <LandingControl label={tr('Khối lượng', 'Mass balance')} kind="choice" selected={tab === 'LEDGER'}
        style={{ flexGrow: 1 }} onPress={() => setTab('LEDGER')} />
      <LandingControl label="MRL" kind="choice" selected={tab === 'MRL'}
        style={{ flexGrow: 1 }} onPress={() => setTab('MRL')} />
    </View>
    {tab === 'LEDGER' ? <LandingPanel title={tr('Đầu vào = Đầu ra + Hao hụt', 'Input = Output + Declared loss')}
      description={tr('Dung sai mô phỏng ≤ 0,5%. Dùng dấu chấm hoặc phẩy làm phần thập phân, không phân cách hàng nghìn.',
        'Illustrated tolerance ≤ 0.5%. Use a dot or comma for decimals, without thousands separators.')}>
      {[tr('Đầu vào (kg)', 'Input (kg)'), tr('Đầu ra (kg)', 'Output (kg)'), tr('Hao hụt khai báo (kg)', 'Declared loss (kg)')].map((label, index) =>
        <GlassInput key={index} label={label} value={mass[index]} keyboardType="decimal-pad" maxLength={24} opaque
          style={{ backgroundColor: p.surface, color: p.text }}
          onChangeText={(value) => setMass((previous) => previous.map((item, at) => at === index ? value : item))}
          autoCorrect={false} autoComplete="off" />)}
      <View accessibilityLiveRegion="polite" style={[styles.result, { backgroundColor: ledgerFailure
        ? c.dangerSurface : ledger.status === 'balanced' ? c.successSurface : c.infoSurface }]}>
        <Text accessibilityRole={ledger.status === 'invalid' ? 'alert' : 'text'} style={[t.label,
          { color: ledgerFailure ? c.danger : ledger.status === 'balanced' ? c.success : c.info }]}>
          {ledger.status === 'empty' ? tr('Nhập đủ ba khối lượng để xem kết quả.', 'Enter all three quantities to see a result.')
            : ledger.status === 'invalid' ? tr('Khối lượng phải là số hữu hạn hợp lệ.', 'Enter valid, finite numeric quantities.')
              : ledger.status === 'balanced' ? tr('Mô phỏng: khối lượng cân bằng', 'Illustration: balanced')
                : tr('Mô phỏng: từ chối — MSG01', 'Illustration: rejected — MSG01')}
        </Text>
        {ledgerReady ? <Text style={[t.caption, { color: c.textPrimary }]}>{tr('Độ lệch', 'Variance')}: {formatDemoMass(ledger.variance, locale)} kg
          {'\n'}{tr('Dung sai tối đa (0,5%)', 'Allowed variance (0.5%)')}: {formatDemoMass(ledger.allowed, locale)} kg</Text> : null}
      </View>
      <View style={[styles.row, { gap: s.sm }]}>
        <LandingControl label={tr('Mẫu chuẩn', 'Balanced example')} onPress={() => setMass(demoPresets.balanced)} />
        <LandingControl label={tr('Mẫu lỗi +4.000 kg', 'Error example +4,000 kg')} onPress={() => setMass(demoPresets.rejected)} />
      </View>
    </LandingPanel> : <LandingPanel title={tr('Kịch bản dư lượng minh họa', 'Illustrative residue scenario')}>
      <Text style={[t.label, { color: c.textPrimary }]}>{tr('Thị trường', 'Market')}</Text>
      <View style={[styles.row, { padding: 4, gap: 4, borderRadius: 16, backgroundColor: p.grouped }]}>{markets.map((id) => <LandingControl key={id} label={id}
        kind="choice" selected={market === id} onPress={() => setMarket(id)} />)}</View>
      <Text style={[t.label, { color: c.textPrimary }]}>{tr('Hoạt chất', 'Substance')}</Text>
      {substances.map((id) => <LandingControl key={id} label={`${MRL_DEMO[id].name.split(' (')[0]} · ${MRL_DEMO[id].cas}`}
        kind="choice" selected={substance === id} style={{ backgroundColor: substance === id ? p.grouped : undefined }} onPress={() => setSubstance(id)} />)}
      <Text selectable style={[t.caption, { color: c.textSecondary }]}>{tr('Tham chiếu trong bộ dữ liệu dự án', 'Source-project dataset reference')}: {mrl.basis}</Text>
      <Text style={[t.body, { color: c.textPrimary }]}>{tr('Giới hạn trong mẫu', 'Demo limit')}: {mrl.limit} {mrl.unit}
        {'\n'}{tr('Biên an toàn (-20%)', 'Safety threshold (-20%)')}: {mrl.safeMargin} {mrl.unit}
        {'\n'}{tr('Dư lượng mẻ thử', 'Demo measured residue')}: {mrl.measured} {mrl.unit}</Text>
      <View accessibilityLiveRegion="polite" style={[styles.result, { backgroundColor: mrl.compliant ? c.successSurface : c.dangerSurface }]}>
        <Text style={[t.label, { color: mrl.compliant ? c.success : c.danger }]}>{mrl.compliant
          ? tr('Mô phỏng: trong biên an toàn', 'Illustration: within the safety threshold')
          : tr('Mô phỏng: vượt biên an toàn', 'Illustration: above the safety threshold')}</Text>
      </View>
      <Text style={[t.caption, { color: c.textSecondary }]}>{tr('Ma trận tĩnh từ tài liệu SRS của dự án, không phải dữ liệu pháp lý hiện hành.',
        'Static matrix from the project SRS; not a current regulatory data feed.')}</Text>
    </LandingPanel>}
  </View>;
}
const styles = StyleSheet.create({ row: { flexDirection: 'row', flexWrap: 'wrap' }, result: { padding: 16, borderRadius: 14, gap: 8 } });
