import { BlurView, type BlurViewProps } from 'expo-blur';
import { LinearGradient } from 'expo-linear-gradient';
import { createContext, useContext, useEffect, useState, type ComponentRef, type Ref } from 'react';
import { AccessibilityInfo, Platform, StyleSheet, View, type StyleProp, type ViewProps, type ViewStyle } from 'react-native';

import { useAppTheme } from '@/theme/ThemeProvider';
import type { AppTheme } from '@/theme/tokens';

const InsideGlass = createContext(false);

export type GlassViewProps = ViewProps & {
  ref?: Ref<ComponentRef<typeof View>>;
  /** Android: the ref of a previously rendered BlurTargetView behind this surface. */
  blurTarget?: BlurViewProps['blurTarget'];
  opaque?: boolean;
  intensity?: number;
  cornerRadius?: keyof AppTheme['radius'];
  padding?: keyof AppTheme['spacing'] | 'none';
  shadow?: keyof AppTheme['shadows'];
  /** Padding, gap and alignment belong here; style controls the outer layout. */
  contentContainerStyle?: StyleProp<ViewStyle>;
};

export function GlassView({ children, ref, blurTarget, opaque = false, intensity,
  cornerRadius = 'card', padding = 'lg', shadow = 'none', style, contentContainerStyle,
  ...viewProps }: GlassViewProps) {
  const { theme } = useAppTheme();
  const nested = useContext(InsideGlass);
  const [reducedTransparency, setReducedTransparency] = useState(Platform.OS === 'ios');

  useEffect(() => {
    if (Platform.OS !== 'ios') return;
    let active = true;
    void AccessibilityInfo.isReduceTransparencyEnabled()
      .then((value) => { if (active) setReducedTransparency(value); })
      .catch(() => {}); // Keep the accessible opaque default if the query fails.
    const subscription = AccessibilityInfo.addEventListener('reduceTransparencyChanged', setReducedTransparency);
    return () => { active = false; subscription.remove(); };
  }, []);

  const androidFallback = Platform.OS === 'android' && (Number(Platform.Version) < 31 || !blurTarget);
  const solid = opaque || nested || reducedTransparency || androidFallback;
  const borderRadius = theme.radius[cornerRadius];
  const corners: ViewStyle = { borderRadius, borderCurve: 'continuous' };
  const blurIntensity = typeof intensity === 'number' && Number.isFinite(intensity)
    ? Math.min(100, Math.max(1, intensity)) : theme.glass.intensity;

  return (
    <View ref={ref} {...viewProps} style={[corners, theme.shadows[shadow], style]}>
      <View style={[styles.clip, corners, { borderWidth: theme.glass.borderWidth, borderColor: theme.colors.glassBorder }]}>
        {solid ? null : <BlurView pointerEvents="none" accessible={false} blurTarget={blurTarget}
          blurMethod="dimezisBlurViewSdk31Plus" tint={theme.scheme} intensity={blurIntensity} style={StyleSheet.absoluteFill} />}
        <View pointerEvents="none" accessible={false} style={[StyleSheet.absoluteFill,
          { backgroundColor: solid ? theme.colors.surface : theme.colors.glass }]} />
        <LinearGradient pointerEvents="none" accessible={false} colors={[theme.colors.glassBorder, 'transparent']}
          start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={styles.highlight} />
        <InsideGlass.Provider value={true}>
          <View style={[{ padding: padding === 'none' ? 0 : theme.spacing[padding] }, contentContainerStyle]}>
            {children}
          </View>
        </InsideGlass.Provider>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  clip: { overflow: 'hidden' },
  highlight: { position: 'absolute', top: 0, left: 0, right: 0, height: 1 },
});
