import React from 'react';
import { type StyleProp, type ViewProps, type ViewStyle } from 'react-native';
import { GlassSurface, type GlassVariant } from '../ui/GlassSurface';

export interface LiquidGlassViewProps extends Omit<ViewProps, 'style'> {
  preset?: 'frosted' | 'navigationBar' | 'floatingTabBar' | 'compactControl';
  variant?: GlassVariant;
  tintColor?: string;
  borderRadius?: number;
  interactive?: boolean;
  blurRadius?: number;
  rim?: boolean;
  specular?: boolean;
  style?: StyleProp<ViewStyle>;
}

/** @deprecated Prefer GlassSurface for all new presentation code. */
export function LiquidGlassView({
  variant = 'regular',
  tintColor,
  borderRadius,
  interactive,
  blurRadius,
  style,
  children,
  preset: _preset,
  rim: _rim,
  specular: _specular,
  ...props
}: LiquidGlassViewProps) {
  return (
    <GlassSurface
      {...props}
      variant={variant}
      tint={tintColor}
      radius={borderRadius}
      interactive={interactive}
      intensity={blurRadius ? Math.min(100, blurRadius * 4) : undefined}
      style={style}
    >
      {children}
    </GlassSurface>
  );
}
