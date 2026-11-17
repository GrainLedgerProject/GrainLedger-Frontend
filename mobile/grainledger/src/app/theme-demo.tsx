import { BlurTargetView } from 'expo-blur';
import { LinearGradient } from 'expo-linear-gradient';
import { useRef, useState, type ComponentRef } from 'react';
import { Pressable, ScrollView, StyleSheet, Switch, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { useAppTheme } from '@/theme/ThemeProvider';
import { themeModes, type AppTheme, type ThemeMode } from '@/theme/tokens';
import { GlassView } from '@/components/glass/GlassView';
import { GlassCard } from '@/components/glass/GlassCard';
import { GlassButton } from '@/components/glass/GlassButton';
import { GlassInput } from '@/components/glass/GlassInput';

export default function ThemeDemoScreen() {
  const { theme, mode, setMode, storageError } = useAppTheme();
  const { colors, spacing, typography, radius } = theme;
  const styles = createStyles(theme);
  const blurTarget = useRef<ComponentRef<typeof View> | null>(null);
  const [opaque, setOpaque] = useState(false);
  const [focusedMode, setFocusedMode] = useState<ThemeMode | null>(null);
  const [sample, setSample] = useState('');
  const [pressCount, setPressCount] = useState(0);

  return (
    <View style={styles.screen}>
      <BlurTargetView ref={blurTarget} style={StyleSheet.absoluteFill} pointerEvents="none" accessible={false}>
        <LinearGradient colors={theme.gradients.ambient} style={StyleSheet.absoluteFill} />
        <View style={styles.orb} />
      </BlurTargetView>
      <SafeAreaView style={styles.safeArea}>
        <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled" automaticallyAdjustKeyboardInsets>
          <View style={styles.heading}>
            <Text style={styles.overline}>THE DESIGN FOUNDATION</Text>
            <Text accessibilityRole="header" style={styles.title}>Quiet depth.{ '\n' }Clear intent.</Text>
            <Text style={styles.body}>A study in forest greens, warm grain tones and considered contrast.</Text>
          </View>

          <View style={styles.section}>
            <Text accessibilityRole="header" style={styles.sectionTitle}>Appearance</Text>
            <View style={styles.modes} accessibilityRole="radiogroup" accessibilityLabel="Appearance mode">
              {themeModes.map((option) => (
                <Pressable key={option} accessibilityRole="radio"
                  accessibilityLabel={`${option[0].toUpperCase()}${option.slice(1)} appearance`}
                  accessibilityState={{ checked: mode === option }} onPress={() => { void setMode(option); }}
                  onFocus={() => setFocusedMode(option)} onBlur={() => setFocusedMode(null)}
                  style={({ pressed }) => [styles.mode, mode === option ? styles.modeSelected : null,
                    focusedMode === option ? styles.modeFocused : null, pressed ? styles.pressed : null]}>
                  <Text style={[typography.label, { color: mode === option ? colors.onPrimary : colors.textPrimary }]}>
                    {option[0].toUpperCase() + option.slice(1)}
                  </Text>
                </Pressable>
              ))}
            </View>
            <Text accessibilityLiveRegion="polite" style={styles.caption}>
              {mode === 'system' ? `Following your device · ${theme.scheme}` : `${mode === 'dark' ? 'Dark' : 'Light'} appearance selected`} · applies throughout GrainLedger
            </Text>
            {storageError ? <Text accessibilityRole="alert" style={{ ...typography.caption, color: colors.danger }}>{storageError}</Text> : null}
          </View>

          <GlassCard blurTarget={blurTarget} opaque={opaque} shadow="raised" title="Clarity comes first."
            description="Soft light and a stable tint keep every word readable. Glass is an accent, never a barrier.">
                <Text style={styles.overline}>GLASSCARD · SURFACE PREVIEW</Text>
                <View style={styles.statusRow}>
                  {(['success', 'warning', 'danger'] as const).map((status) => (
                    <View key={status} style={[styles.badge, { backgroundColor: colors[`${status}Surface`] }]}>
                      <Text style={[typography.caption, { color: colors[status] }]}>{status === 'danger' ? 'HOLD' : status === 'warning' ? 'Pending' : 'Confirmed'}</Text>
                    </View>
                  ))}
                </View>
                <View style={styles.switchRow}>
                  <Text style={[typography.label, { color: colors.textPrimary }]}>Use opaque preview</Text>
                  <Switch accessibilityLabel="Use opaque preview" value={opaque} onValueChange={setOpaque}
                    trackColor={{ false: colors.border, true: colors.primary }} thumbColor={colors.surface} />
                </View>
                <Text style={styles.caption}>iOS reduced transparency, older Android and nested surfaces use the opaque fallback.</Text>
          </GlassCard>

          <View style={styles.section}>
            <Text accessibilityRole="header" style={styles.sectionTitle}>Four building blocks</Text>
            <GlassView blurTarget={blurTarget} opaque={opaque} contentContainerStyle={{ gap: spacing.sm }}>
              <Text style={styles.overline}>GLASSVIEW</Text>
              <Text style={styles.body}>A tinted, accessible surface for your own content.</Text>
            </GlassView>
            <View style={styles.statusRow}>
              <GlassButton label="Try a press" onPress={() => setPressCount((count) => count + 1)} />
              <GlassButton label="Reset" variant="glass" blurTarget={blurTarget} opaque={opaque}
                onPress={() => { setPressCount(0); setSample(''); }} />
            </View>
            <Text accessibilityLiveRegion="polite" style={styles.caption}>Demo button presses: {pressCount}</Text>
            <View style={styles.statusRow}>
              <GlassButton label="Disabled" disabled />
              <GlassButton label="Loading preview" loading loadingLabel="Loading…" />
            </View>
            <GlassInput label="Sample text" value={sample} onChangeText={setSample} placeholder="Try one or two letters"
              blurTarget={blurTarget} opaque={opaque} helperText="Three or more characters clear the validation preview."
              error={sample.length > 0 && sample.trim().length < 3 ? 'Use at least three characters.' : undefined} />
            <GlassInput label="Disabled input" value="Read-only preview" disabled blurTarget={blurTarget} opaque={opaque} />
            <GlassInput label="Loading input" value="Looking up a value…" loading blurTarget={blurTarget} opaque={opaque} />
          </View>

          <View style={styles.section}>
            <Text accessibilityRole="header" style={styles.sectionTitle}>The palette</Text>
            <View style={styles.swatches}>
              {(['primary', 'accent', 'surface', 'textPrimary'] as const).map((name) => (
                <View key={name} style={styles.swatchItem}>
                  <View style={[styles.swatch, { backgroundColor: colors[name] }]} />
                  <Text style={styles.caption}>{name}</Text>
                  <Text selectable style={[typography.mono, { color: colors.textSecondary }]}>{colors[name]}</Text>
                </View>
              ))}
            </View>
          </View>
          <View style={styles.section}>
            <Text accessibilityRole="header" style={styles.sectionTitle}>Type & rhythm</Text>
            <Text style={[typography.title, { color: colors.textPrimary }]}>Designed to breathe.</Text>
            <Text style={styles.body}>Body · 16 / 24. Comfortable reading, with room for larger text and Vietnamese diacritics.</Text>
            <Text style={styles.caption}>Caption · 13 / 18. Supporting detail with a clear purpose.</Text>
            <View style={styles.spacingRow}>
              {[spacing.xs, spacing.sm, spacing.md, spacing.lg, spacing.xl, spacing.xxl].map((size) => (
                <View key={size} style={styles.spacingItem}>
                  <View style={{ width: size, height: spacing.xl, backgroundColor: colors.primary, borderRadius: radius.sm, borderCurve: 'continuous' }} />
                  <Text style={styles.caption}>{size}</Text>
                </View>
              ))}
            </View>
            <Text style={styles.caption}>Radii · 14 control / 22 card / 28 sheet. Shadows · soft / raised.</Text>
          </View>
        </ScrollView>
      </SafeAreaView>
    </View>
  );
}

function createStyles({ colors: c, spacing: s, radius: r, typography: t, layout }: AppTheme) {
  return StyleSheet.create({
    screen: { flex: 1, backgroundColor: c.background }, safeArea: { flex: 1 },
    content: { width: '100%', maxWidth: layout.maxContentWidth, alignSelf: 'center', padding: s.page, gap: s.xxl, paddingBottom: s.hero },
    heading: { gap: s.lg }, back: { ...t.label, color: c.textPrimary, paddingVertical: s.md },
    overline: { ...t.caption, fontWeight: '600', letterSpacing: 1.6, color: c.textSecondary },
    title: { ...t.display, color: c.textPrimary }, body: { ...t.body, color: c.textSecondary },
    caption: { ...t.caption, color: c.textSecondary }, sectionTitle: { ...t.heading, color: c.textPrimary },
    section: { gap: s.md }, modes: { flexDirection: 'row', flexWrap: 'wrap', gap: s.sm },
    mode: { minHeight: layout.minTouchTarget, minWidth: 88, flexGrow: 1, justifyContent: 'center', alignItems: 'center', padding: s.md,
      borderWidth: 1, borderColor: c.controlBorder, backgroundColor: c.surface, borderRadius: r.control, borderCurve: 'continuous' },
    modeSelected: { backgroundColor: c.primary, borderColor: c.primary }, pressed: { opacity: 0.75 },
    modeFocused: { outlineWidth: 2, outlineColor: c.focus, outlineOffset: 3 },
    statusRow: { flexDirection: 'row', flexWrap: 'wrap', gap: s.sm },
    badge: { paddingHorizontal: s.md, paddingVertical: s.sm, borderRadius: r.sm, borderCurve: 'continuous' },
    switchRow: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', alignItems: 'center', gap: s.md, minHeight: layout.minTouchTarget },
    swatches: { flexDirection: 'row', flexWrap: 'wrap', gap: s.lg }, swatchItem: { flexGrow: 1, minWidth: 112, gap: s.xs },
    swatch: { height: 48, borderWidth: 1, borderColor: c.border, borderRadius: r.control, borderCurve: 'continuous' },
    spacingRow: { flexDirection: 'row', flexWrap: 'wrap', gap: s.xl }, spacingItem: { alignItems: 'center', gap: s.sm },
    orb: { position: 'absolute', top: 320, right: -60, width: 240, height: 240, borderRadius: r.pill, borderCurve: 'continuous', backgroundColor: c.ambientEnd },
  });
}
