import React from 'react';
import { StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';

import { useAppTheme, type ThemeColors } from '../../theme';
import { AppText } from '../ui/AppText';
import { Card } from './Card';

export interface MetricCardProps {
  label: string;
  value: string | number;
  unit?: string;
  subtext?: string;
  icon?: React.ReactNode;
  variant?: 'primary' | 'accent' | 'emerald' | 'amber' | 'red' | 'blue';
  style?: StyleProp<ViewStyle>;
}

const toneByVariant: Record<
  NonNullable<MetricCardProps['variant']>,
  { foreground: keyof ThemeColors; background: keyof ThemeColors }
> = {
  primary: { foreground: 'accent', background: 'accentMuted' },
  accent: { foreground: 'warning', background: 'warningMuted' },
  amber: { foreground: 'warning', background: 'warningMuted' },
  emerald: { foreground: 'success', background: 'successMuted' },
  red: { foreground: 'destructive', background: 'destructiveMuted' },
  blue: { foreground: 'info', background: 'infoMuted' },
};

export const MetricCard: React.FC<MetricCardProps> = ({
  label,
  value,
  unit,
  subtext,
  icon,
  variant = 'primary',
  style,
}) => {
  const theme = useAppTheme();
  const tone = toneByVariant[variant];

  return (
    <Card style={[styles.container, style]}>
      <View style={styles.topRow}>
        <AppText variant="footnote" color="secondaryLabel" style={styles.label}>
          {label}
        </AppText>
        {icon ? (
          <View
            style={[
              styles.icon,
              {
                backgroundColor: theme.colors[tone.background],
                borderRadius: theme.radii.sm,
              },
            ]}
          >
            {icon}
          </View>
        ) : null}
      </View>
      <View style={styles.valueRow}>
        <AppText variant="title1" style={styles.value} maxFontSizeMultiplier={1.25}>
          {value}
        </AppText>
        {unit ? (
          <AppText variant="captionStrong" color="secondaryLabel">
            {unit}
          </AppText>
        ) : null}
      </View>
      {subtext ? (
        <AppText variant="caption" color="secondaryLabel" style={styles.subtext}>
          {subtext}
        </AppText>
      ) : null}
    </Card>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    minHeight: 150,
    minWidth: 0,
    padding: 17,
  },
  icon: {
    alignItems: 'center',
    height: 30,
    justifyContent: 'center',
    width: 30,
  },
  label: {
    flex: 1,
  },
  subtext: {
    marginTop: 5,
  },
  topRow: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 8,
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  value: {
    fontVariant: ['tabular-nums'],
  },
  valueRow: {
    alignItems: 'baseline',
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 5,
  },
});
