import React from 'react';
import { Text, type TextProps, type TextStyle } from 'react-native';

import { useAppTheme, type TypographyVariant } from '../../theme';

export interface AppTextProps extends TextProps {
  variant?: TypographyVariant;
  color?: 'label' | 'secondaryLabel' | 'tertiaryLabel' | 'accent' | 'destructive' | 'success';
  align?: TextStyle['textAlign'];
}

export function AppText({
  variant = 'body',
  color = 'label',
  align,
  style,
  allowFontScaling = true,
  maxFontSizeMultiplier = 1.6,
  ...props
}: AppTextProps) {
  const theme = useAppTheme();

  return (
    <Text
      allowFontScaling={allowFontScaling}
      maxFontSizeMultiplier={maxFontSizeMultiplier}
      style={[theme.typography[variant], { color: theme.colors[color], textAlign: align }, style]}
      {...props}
    />
  );
}
