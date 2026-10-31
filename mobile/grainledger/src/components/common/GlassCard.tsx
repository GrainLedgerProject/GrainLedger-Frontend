import React from 'react';
import { View, type StyleProp, type ViewStyle } from 'react-native';

import { Card } from './Card';
import type { LiquidGlassViewProps } from './LiquidGlassView';

export interface GlassCardProps {
  children: React.ReactNode;
  style?: StyleProp<ViewStyle>;
  contentStyle?: StyleProp<ViewStyle>;
  borderRadius?: number;
  tintColor?: string;
  variant?: 'regular' | 'clear';
  preset?: LiquidGlassViewProps['preset'];
  interactive?: boolean;
  blurRadius?: number;
  elevated?: boolean;
  borderTint?: string;
}

/** @deprecated Content cards are opaque by design. Use Card for new UI. */
export const GlassCard: React.FC<GlassCardProps> = ({
  children,
  style,
  contentStyle,
  borderRadius,
}) => (
  <Card style={[borderRadius !== undefined && { borderRadius }, style]}>
    <View style={contentStyle}>{children}</View>
  </Card>
);
