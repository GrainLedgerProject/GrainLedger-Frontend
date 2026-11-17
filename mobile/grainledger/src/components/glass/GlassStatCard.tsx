import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';

import { useAppTheme } from '@/theme/ThemeProvider';
import { GlassCard, type GlassCardProps } from './GlassCard';

export type GlassStatCardProps = Pick<GlassCardProps, 'blurTarget' | 'opaque' | 'style'> & {
  label: string; value: string | null; detail: string; unit?: string;
  tone?: 'primary' | 'info' | 'warning' | 'danger'; loading?: boolean; loadingLabel?: string; unavailable?: string;
};

/** A missing/failed statistic is never converted into zero. */
export function GlassStatCard({ label, value, detail, unit, tone = 'primary', loading = false,
  loadingLabel = 'Loading statistic', unavailable, ...surface }: GlassStatCardProps) {
  const { theme } = useAppTheme();
  const display = unavailable ? null : value;
  const note = unavailable ?? detail;
  return <GlassCard {...surface} padding="lg" accessible accessibilityState={{ busy: loading }}
    accessibilityLabel={`${label}. ${loading ? loadingLabel : `${display ?? '—'} ${display !== null ? unit ?? '' : ''}. ${note}`}`}>
    <View style={[styles.marker, { backgroundColor: theme.colors[tone] }]} accessible={false} />
    <Text style={[theme.typography.label, { color: theme.colors.textSecondary }]}>{label}</Text>
    {loading ? <View style={styles.value}><ActivityIndicator accessible={false} color={theme.colors.primary} /></View>
      : <View style={styles.value}>
        <Text selectable style={[theme.typography.title, styles.number, { color: theme.colors.textPrimary }]}>{display ?? '—'}</Text>
        {display !== null && unit ? <Text style={[theme.typography.caption, { color: theme.colors.textSecondary }]}>{unit}</Text> : null}
      </View>}
    <Text style={[theme.typography.caption, { color: theme.colors.textSecondary }]}>{note}</Text>
  </GlassCard>;
}
const styles = StyleSheet.create({ marker: { width: 28, height: 3, borderRadius: 2 },
  value: { minHeight: 42, flexDirection: 'row', flexWrap: 'wrap', alignItems: 'baseline', gap: 6 },
  number: { fontVariant: ['tabular-nums'], flexShrink: 1 } });
