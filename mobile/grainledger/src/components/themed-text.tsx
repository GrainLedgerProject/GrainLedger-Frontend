import { typography } from '../theme/tokens';
import { Platform, StyleSheet, Text, type TextProps } from 'react-native';

import { Fonts, ThemeColor } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

export type ThemedTextProps = TextProps & {
  type?: 'default' | 'title' | 'small' | 'smallBold' | 'subtitle' | 'link' | 'linkPrimary' | 'code';
  themeColor?: ThemeColor;
};

export function ThemedText({ style, type = 'default', themeColor, ...rest }: ThemedTextProps) {
  const theme = useTheme();

  return (
    <Text
      style={[
        { color: theme.colors[themeColor ?? 'label'] },
        styles[type],
        type === 'linkPrimary' && { color: theme.colors.accent },
        style,
      ]}
      {...rest}
    />
  );
}

const styles = StyleSheet.create({
  small: {
    ...typography.subheadline,
    lineHeight: 20,
    fontWeight: 500,
  },
  smallBold: {
    ...typography.subheadline,
    lineHeight: 20,
    fontWeight: 700,
  },
  default: {
    ...typography.callout,
    lineHeight: 24,
    fontWeight: 500,
  },
  title: {
    ...typography.body,
    fontWeight: 600,
    lineHeight: 52,
  },
  subtitle: {
    ...typography.largeTitle,
    lineHeight: 44,
    fontWeight: 600,
  },
  link: {
    lineHeight: 30,
    ...typography.subheadline,
  },
  linkPrimary: {
    lineHeight: 30,
    ...typography.subheadline,
  },
  code: {
    fontFamily: Fonts.mono,
    fontWeight: Platform.select({ android: 700 }) ?? 500,
    ...typography.caption,
  },
});
