import { router } from 'expo-router';
import { useEffect, useRef, useState, type ComponentRef, type ReactNode } from 'react';
import { AccessibilityInfo, ScrollView, StyleSheet, Text, View, useWindowDimensions,
  type LayoutChangeEvent, type NativeScrollEvent, type NativeSyntheticEvent } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { useAuth } from '@/features/auth/AuthProvider';
import { useAppTheme } from '@/theme/ThemeProvider';
import { landingContent, type LandingLocale, type StakeholderId } from './landing-data';
import { activeLandingSection, landingSections, primaryDestination, sectionScrollOffset, type LandingSectionId } from './landing-model';
import { LandingSimulator } from './LandingSimulator';
import { LandingControl, LandingDisclosure, LandingPanel, useLandingAppearance } from './landing-ui';

const sectionNames: Record<LandingLocale, Record<LandingSectionId, string>> = {
  vi: { problem: 'Thách thức', tech: 'Hệ thống', comparison: 'Đối chiếu', simulators: 'Mô phỏng', ecosystem: 'Hệ sinh thái' },
  en: { problem: 'Challenge', tech: 'System', comparison: 'Comparison', simulators: 'Simulators', ecosystem: 'Ecosystem' },
};
const stakeholderNames: Record<LandingLocale, Record<StakeholderId, string>> = {
  vi: { MILL: 'Nhà máy', EXPORTER: 'Xuất khẩu', FARMER: 'Nông hộ', AUDIT: 'Kiểm định' },
  en: { MILL: 'Mill', EXPORTER: 'Export', FARMER: 'Farmers', AUDIT: 'Audit' },
};
const references = ['ISO 22095:2020 Mass Balance', 'EU Regulation (EC) No 396/2005', 'USA EPA 40 CFR Part 180',
  'Japan MHLW/CAA Positive List', 'TCVN 11888:2017 · TT 50/2016'];

export function LandingScreen() {
  const { mode, setMode, storageError } = useAppTheme();
  const { theme, palette: p } = useLandingAppearance();
  const { canAccess } = useAuth();
  const { colors: c, typography: t, spacing: s } = theme;
  const [locale, setLocale] = useState<LandingLocale>('vi');
  const [stakeholder, setStakeholder] = useState<StakeholderId>('MILL');
  const [optionsOpen, setOptionsOpen] = useState(false);
  const [activeSection, setActiveSection] = useState<LandingSectionId | null>(null);
  const [reducedMotion, setReducedMotion] = useState(true);
  const scroll = useRef<ComponentRef<typeof ScrollView> | null>(null);
  const headerHeight = useRef(0);
  const contentTop = useRef(0);
  const offsets = useRef<Partial<Record<LandingSectionId, number>>>({});
  const { width, fontScale } = useWindowDimensions();
  const tr = (vi: string, en: string) => locale === 'vi' ? vi : en;
  const content = landingContent[locale];
  const authenticated = canAccess();
  const openWorkspace = () => router.push(primaryDestination(authenticated));
  const primaryLabel = authenticated ? tr('Vào Dashboard', 'Open dashboard') : content.signInLabel;
  const selected = content.stakeholders.find((item) => item.id === stakeholder)!;
  const cardWidth = width >= 640 && fontScale < 1.3 ? '46%' : '100%';

  useEffect(() => {
    let active = true;
    void AccessibilityInfo.isReduceMotionEnabled().then((value) => { if (active) setReducedMotion(value); }).catch(() => {});
    const subscription = AccessibilityInfo.addEventListener('reduceMotionChanged', setReducedMotion);
    return () => { active = false; subscription.remove(); };
  }, []);
  function jump(id: LandingSectionId) {
    const y = offsets.current[id];
    if (y === undefined) return;
    scroll.current?.scrollTo({ y: sectionScrollOffset(y, contentTop.current, headerHeight.current), animated: !reducedMotion });
    setActiveSection(id);
  }
  function backToTop() {
    scroll.current?.scrollTo({ y: 0, animated: !reducedMotion });
    setActiveSection(null);
  }
  function onScroll(event: NativeSyntheticEvent<NativeScrollEvent>) {
    const { contentOffset, layoutMeasurement, contentSize } = event.nativeEvent;
    setActiveSection(activeLandingSection(contentOffset.y, headerHeight.current, contentTop.current,
      offsets.current, layoutMeasurement.height, contentSize.height));
  }
  function recordSectionLayout(id: LandingSectionId, event: LayoutChangeEvent) { offsets.current[id] = event.nativeEvent.layout.y; }

  return <View style={{ flex: 1, backgroundColor: p.background }}>
    <SafeAreaView style={{ flex: 1 }}>
      <ScrollView ref={scroll} stickyHeaderIndices={[0]} onScroll={onScroll} scrollEventThrottle={32}
        keyboardShouldPersistTaps="handled" automaticallyAdjustKeyboardInsets keyboardDismissMode="on-drag">
        <View onLayout={(event) => { headerHeight.current = event.nativeEvent.layout.height; }}
          style={[styles.headerShell, { backgroundColor: p.background, borderBottomColor: p.separator }]}>
          <View style={styles.headerContent}>
            <View style={styles.row}>
              <LandingControl label="GrainLedger" style={styles.wordmark}
                accessibilityLabel={tr('GrainLedger, về đầu trang', 'GrainLedger, back to top')} onPress={backToTop} />
              <LandingControl label={authenticated ? 'Home' : tr('Đăng nhập', 'Sign in')} onPress={openWorkspace} />
              <LandingControl label="•••" accessibilityLabel={tr('Tùy chọn giao diện và ngôn ngữ', 'Appearance and language options')}
                accessibilityState={{ expanded: optionsOpen }} onPress={() => { setOptionsOpen(!optionsOpen); backToTop(); }} />
            </View>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 2 }}>
              {landingSections.map((id) => <LandingControl key={id} label={sectionNames[locale][id]} kind="choice"
                selected={activeSection === id} onPress={() => jump(id)} />)}
            </ScrollView>
          </View>
        </View>

        <View onLayout={(event) => { contentTop.current = event.nativeEvent.layout.y; }} style={styles.content}>
          {optionsOpen ? <LandingPanel title={tr('Tùy chọn', 'Preferences')}>
            <Text style={[t.caption, { color: p.secondary }]}>{tr('Giao diện', 'Appearance')}</Text>
            <View style={[styles.segmented, { backgroundColor: p.grouped }]}>
              {(['system', 'light', 'dark'] as const).map((value) => <LandingControl key={value} kind="choice" selected={mode === value}
                label={value === 'system' ? tr('Hệ thống', 'System') : value === 'light' ? tr('Sáng', 'Light') : tr('Tối', 'Dark')}
                style={{ flexGrow: 1 }} onPress={() => { void setMode(value); }} />)}
            </View>
            <LandingControl label={locale === 'vi' ? 'English' : 'Tiếng Việt'} onPress={() => setLocale(locale === 'vi' ? 'en' : 'vi')} />
          </LandingPanel> : null}
          {storageError ? <LandingPanel>
            <Text accessibilityRole="alert" style={[t.caption, { color: c.danger }]}>{storageError}</Text>
            <LandingControl label={tr('Lưu lại giao diện', 'Retry saving appearance')} onPress={() => { void setMode(mode); }} />
          </LandingPanel> : null}

          <View style={[styles.hero, { paddingVertical: width >= 700 ? 56 : 32 }]}>
            <Text style={[t.caption, { color: p.secondary }]}>{tr('Thí điểm tại Tiền Giang', 'A pilot in Tien Giang')}</Text>
            <Text accessibilityRole="header" style={[styles.largeTitle, { color: p.text, fontSize: width >= 700 ? 48 : 34,
              lineHeight: width >= 700 ? 56 : 42 }]}>{content.heroTitle}</Text>
            <Text style={[styles.introduction, { color: p.secondary }]}>{content.heroDescription}</Text>
            <LandingControl label={primaryLabel} kind="primary" onPress={openWorkspace} />
            <LandingControl label={tr('Trải nghiệm mô phỏng ↓', 'Try the simulators ↓')} onPress={() => jump('simulators')} />
            <View style={[styles.flow, { borderTopColor: p.separator }]}>
              {(locale === 'vi' ? ['Nông hộ', 'Nhà máy', 'Xuất khẩu'] : ['Field', 'Mill', 'Export']).map((stage, index) =>
                <Text key={index} style={[t.caption, { color: p.secondary }]}>{String(index + 1).padStart(2, '0')}  {stage}{index < 2 ? '   ›' : ''}</Text>)}
            </View>
          </View>

          <Section eyebrow={tr('Bối cảnh dự án', 'Project context')} title={tr('Từ ruộng lúa đến cửa cảng', 'From paddy fields to export ports')}
            onLayout={(event) => recordSectionLayout('problem', event)}>
            <Text style={[t.body, { color: p.secondary }]}>{tr(
              'Một container kết hợp lúa từ nhiều thửa ruộng. Đối chiếu khối lượng và liên kết kết quả kiểm nghiệm giúp nhận diện nguồn gốc và phạm vi rủi ro.',
              'A container combines grain from many plots. Mass accounting and linked laboratory evidence help identify provenance and the scope of a risk.')}</Text>
            <LandingPanel style={{ gap: 0, paddingVertical: 0 }}>
              <View style={styles.wrap}>{content.problem.map((card, index) => <View key={card.badge}
                style={{ flexBasis: cardWidth, flexGrow: 1, minWidth: 0, paddingVertical: 20, paddingRight: 12, gap: 8,
                  borderBottomWidth: index === content.problem.length - 1 ? 0 : StyleSheet.hairlineWidth, borderBottomColor: p.separator }}>
                <Text style={[t.caption, { color: p.secondary }]}>{card.badge}</Text>
                <Text style={[styles.metric, { color: p.text }]}>{card.metric}{card.unit ? ' ' + card.unit : ''}</Text>
                <Text accessibilityRole="header" style={[t.label, { color: p.text }]}>{card.title}</Text>
                <Text style={[t.caption, { color: p.secondary }]}>{card.desc}</Text>
              </View>)}</View>
            </LandingPanel>
          </Section>

          <Section eyebrow={sectionNames[locale].tech} title={tr('Rõ ràng ở từng công đoạn', 'Clarity at every stage')} onLayout={(event) => recordSectionLayout('tech', event)}>
            <LandingPanel style={{ gap: 0, paddingVertical: 8 }}>
              {content.pillars.map((pillar, index) => <LandingDisclosure key={pillar.title} title={String(index + 1).padStart(2, '0') + ' · ' + pillar.title}
                initiallyExpanded={index === 0} last={index === content.pillars.length - 1}>
                <Text style={[t.caption, { color: c.primary }]}>{pillar.tag}</Text>
                <Text style={[t.body, { color: p.secondary }]}>{pillar.desc}</Text>
              </LandingDisclosure>)}
            </LandingPanel>
          </Section>

          <Section eyebrow={sectionNames[locale].comparison} title={tr('Một cách ghi nhận tốt hơn', 'A better way to keep records')} onLayout={(event) => recordSectionLayout('comparison', event)}>
            <LandingPanel style={{ gap: 0, paddingVertical: 8 }}>
              {content.comparisons.map((item, index) => <LandingDisclosure key={item.criteria} title={item.criteria}
                initiallyExpanded={index === 0} last={index === content.comparisons.length - 1}>
                <Text style={[t.caption, { color: p.secondary }]}>{tr('Sổ sách & Excel', 'Manual records & Excel')}</Text>
                <Text style={[t.body, { color: p.secondary }]}>{item.oldWay}</Text>
                <Text style={[t.label, { color: c.primary }]}>GrainLedger / Mass Balance</Text>
                <Text style={[t.body, { color: p.text }]}>{item.newWay}</Text>
              </LandingDisclosure>)}
            </LandingPanel>
          </Section>

          <Section eyebrow={tr('Khám phá', 'Explore')} title={tr('Thử ngay, hiểu rõ hơn', 'Try it. See the difference.')} onLayout={(event) => recordSectionLayout('simulators', event)}>
            <LandingSimulator locale={locale} />
          </Section>

          <Section eyebrow={sectionNames[locale].ecosystem} title={tr('Một chuỗi giá trị. Cùng kết nối.', 'One value chain. Working together.')} onLayout={(event) => recordSectionLayout('ecosystem', event)}>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={[styles.segmented, { backgroundColor: p.grouped }]}>
              {content.stakeholders.map((item) => <LandingControl key={item.id} label={stakeholderNames[locale][item.id]}
                accessibilityLabel={item.label} kind="choice" selected={stakeholder === item.id} onPress={() => setStakeholder(item.id)} />)}
            </ScrollView>
            <LandingPanel title={selected.title} description={selected.desc}>
              <Text style={[t.caption, { color: p.secondary }]}>{selected.eyebrow}</Text>
              {selected.benefits.map((benefit) => <Text key={benefit} style={[t.body, { color: p.text }]}>• {benefit}</Text>)}
              <View style={{ backgroundColor: p.background, padding: 16, borderRadius: 12, gap: 8 }}>
                <Text style={[t.label, { color: p.text }]}>{tr('Ví dụ minh họa', 'Illustrative example')}</Text>
                {selected.sample.map((line, index) => <Text key={index} style={[t.caption, { color: p.secondary }]}>{line}</Text>)}
              </View>
            </LandingPanel>
          </Section>

          <View style={{ paddingVertical: 24, gap: 20 }}>
            <Text accessibilityRole="header" style={[t.title, { color: p.text }]}>{tr('Bắt đầu với GrainLedger.', 'Start with GrainLedger.')}</Text>
            <Text style={[t.body, { color: p.secondary }]}>{tr('Khám phá mô hình sổ cái cân bằng khối lượng trong chương trình thí điểm tại Tiền Giang.',
              'Explore the mass-balance custody model in the Tien Giang pilot project.')}</Text>
            <LandingControl label={primaryLabel} kind="primary" onPress={openWorkspace} />
          </View>
          <View style={{ gap: s.lg, paddingBottom: 24 }}>
            <LandingPanel style={{ gap: 0, paddingVertical: 8 }}>
              <LandingDisclosure title={tr('Tham chiếu tiêu chuẩn trong dự án', 'Standards referenced by the project')}>
                {references.map((reference) => <Text key={reference} selectable style={[t.caption, { color: p.secondary }]}>{reference}</Text>)}
              </LandingDisclosure>
              <LandingDisclosure title={tr('Công nghệ', 'Technology')} last>
                {content.pillars.map((pillar) => <LandingControl key={pillar.title} label={pillar.title} onPress={() => jump('tech')} />)}
              </LandingDisclosure>
            </LandingPanel>
            <Text style={[t.caption, { color: p.secondary }]}>{tr('Cơ sở thí điểm: nhà máy xay xát lúa gạo Tiền Giang, Đồng bằng sông Cửu Long, Việt Nam.',
              'Pilot site: rice mill in Tien Giang, Mekong Delta, Vietnam.')}</Text>
            <Text style={[t.caption, { color: p.secondary }]}>FA26SE272 · GFA26SE137 · GrainLedger © 2026</Text>
            <LandingControl label={tr('Về đầu trang', 'Back to top')} onPress={backToTop} />
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  </View>;
}

function Section({ eyebrow, title, onLayout, children }: { eyebrow: string; title: string; onLayout: (event: LayoutChangeEvent) => void; children: ReactNode }) {
  const { theme, palette: p } = useLandingAppearance();
  return <View onLayout={onLayout} style={{ gap: 16 }}>
    <Text style={[theme.typography.caption, { color: p.secondary }]}>{eyebrow}</Text>
    <Text accessibilityRole="header" style={[theme.typography.title, { color: p.text }]}>{title}</Text>
    {children}
  </View>;
}
const styles = StyleSheet.create({
  headerShell: { width: '100%', borderBottomWidth: StyleSheet.hairlineWidth },
  headerContent: { width: '100%', maxWidth: 800, alignSelf: 'center', paddingHorizontal: 12, paddingBottom: 6 },
  row: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center' },
  wordmark: { flexGrow: 1, flexShrink: 1, alignItems: 'flex-start' },
  wrap: { flexDirection: 'row', flexWrap: 'wrap', columnGap: 16 },
  segmented: { flexDirection: 'row', flexWrap: 'wrap', padding: 4, gap: 4, borderRadius: 16 },
  content: { width: '100%', maxWidth: 800, alignSelf: 'center', paddingHorizontal: 24, paddingTop: 16, gap: 48 },
  hero: { gap: 20 },
  largeTitle: { fontWeight: '700', letterSpacing: -1.1 },
  introduction: { fontSize: 17, lineHeight: 27 },
  flow: { flexDirection: 'row', flexWrap: 'wrap', gap: 16, paddingTop: 20, marginTop: 8, borderTopWidth: StyleSheet.hairlineWidth },
  metric: { fontSize: 28, lineHeight: 36, fontWeight: '600', letterSpacing: -0.6 },
});
