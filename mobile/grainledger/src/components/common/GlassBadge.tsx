import { radii, spacing } from '../../theme/tokens';
import React from 'react';
import { StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';

import { useAppTheme, type ThemeColors } from '../../theme';
import { AppText } from '../ui/AppText';

export type GlassBadgeStatus =
  | 'COMMITTED'
  | 'PENDING'
  | 'HOLD'
  | 'IN_PROCESS'
  | 'AVAILABLE'
  | 'PASS'
  | 'FAIL'
  | 'WARNING'
  | 'SYNCED'
  | 'COMPLETED';

export interface GlassBadgeProps {
  status: GlassBadgeStatus | string;
  label?: string;
  size?: 'small' | 'medium';
  style?: StyleProp<ViewStyle>;
}

type Tone = {
  foreground: keyof ThemeColors;
  background: keyof ThemeColors;
  defaultLabel: string;
};

function toneFor(status: string): Tone {
  switch (status) {
    case 'COMMITTED':
    case 'AVAILABLE':
    case 'PASS':
    case 'SYNCED':
    case 'COMPLETED':
      return {
        foreground: 'success',
        background: 'successMuted',
        defaultLabel:
          status === 'COMMITTED' ? 'Đã chốt sổ' : status === 'PASS' ? 'Đạt chuẩn' : 'Hoàn tất',
      };
    case 'PENDING':
    case 'WARNING':
      return {
        foreground: 'warning',
        background: 'warningMuted',
        defaultLabel: status === 'PENDING' ? 'Chờ duyệt' : 'Cảnh báo',
      };
    case 'HOLD':
    case 'FAIL':
      return {
        foreground: 'destructive',
        background: 'destructiveMuted',
        defaultLabel: status === 'HOLD' ? 'Đang cách ly' : 'Không đạt',
      };
    case 'IN_PROCESS':
      return { foreground: 'info', background: 'infoMuted', defaultLabel: 'Đang xử lý' };
    default:
      return { foreground: 'secondaryLabel', background: 'surfaceSecondary', defaultLabel: status };
  }
}

export const GlassBadge: React.FC<GlassBadgeProps> = ({
  status,
  label,
  size = 'small',
  style,
}) => {
  const theme = useAppTheme();
  const tone = toneFor(status);
  const small = size === 'small';

  return (
    <View
      accessibilityLabel={label ?? tone.defaultLabel}
      accessibilityRole="text"
      style={[
        styles.badge,
        {
          backgroundColor: theme.colors[tone.background],
          borderRadius: theme.radii.pill,
          paddingHorizontal: small ? 9 : 12,
          paddingVertical: small ? 4 : 6,
        },
        style,
      ]}
    >
      <View style={[styles.dot, { backgroundColor: theme.colors[tone.foreground] }]} />
      <AppText
        variant={small ? 'captionStrong' : 'footnote'}
        style={{ color: theme.colors[tone.foreground] }}
        maxFontSizeMultiplier={1.35}
      >
        {label ?? tone.defaultLabel}
      </AppText>
    </View>
  );
};

const styles = StyleSheet.create({
  badge: {
    alignItems: 'center',
    alignSelf: 'flex-start',
    flexDirection: 'row',
    gap: spacing.xs,
  },
  dot: {
    borderRadius: radii.xs,
    height: 7,
    width: 7,
  },
});
