import React, {
  createContext,
  useContext,
  useEffect,
  useRef,
  useState,
  type ComponentRef,
  type PropsWithChildren,
  type ReactNode,
} from 'react';
import {
  AccessibilityInfo,
  Platform,
  StyleSheet,
  View,
  type ColorValue,
  type StyleProp,
  type ViewProps,
  type ViewStyle,
} from 'react-native';
import { BlurTargetView, BlurView } from 'expo-blur';
import {
  GlassContainer,
  GlassView,
  isGlassEffectAPIAvailable,
  isLiquidGlassAvailable,
} from 'expo-glass-effect';
import { useAppTheme } from '../../theme';

export type GlassVariant = 'regular' | 'clear';

export interface GlassSurfaceProps extends Omit<ViewProps, 'style'> {
  variant?: GlassVariant;
  tint?: ColorValue;
  interactive?: boolean;
  radius?: number;
  intensity?: number;
  style?: StyleProp<ViewStyle>;
}

type BlurTargetRef = React.RefObject<ComponentRef<typeof View> | null>;
const BlurTargetContext = createContext<BlurTargetRef | null>(null);

function useTransparencyPreference(): boolean {
  // Start opaque until the asynchronous accessibility preferences resolve.
  const [reduceTransparency, setReduceTransparency] = useState(Platform.OS === 'ios');
  const [highContrast, setHighContrast] = useState(Platform.OS === 'android');

  useEffect(() => {
    const subscriptions: { remove: () => void }[] = [];

    if (Platform.OS === 'ios') {
      AccessibilityInfo.isReduceTransparencyEnabled()
        .then(setReduceTransparency)
        .catch(() => setReduceTransparency(true));
      subscriptions.push(
        AccessibilityInfo.addEventListener('reduceTransparencyChanged', setReduceTransparency),
      );
    }

    if (Platform.OS === 'android') {
      AccessibilityInfo.isHighTextContrastEnabled()
        .then(setHighContrast)
        .catch(() => setHighContrast(true));
      subscriptions.push(
        AccessibilityInfo.addEventListener('highTextContrastChanged', setHighContrast),
      );
    }

    return () => subscriptions.forEach((subscription) => subscription.remove());
  }, []);

  return reduceTransparency || highContrast;
}

export function GlassSurface({
  variant = 'regular',
  tint,
  interactive = false,
  radius,
  intensity = 72,
  style,
  children,
  ...viewProps
}: GlassSurfaceProps) {
  const theme = useAppTheme();
  const blurTarget = useContext(BlurTargetContext);
  const reduceTransparency = useTransparencyPreference();
  const resolvedRadius = radius ?? theme.radii.xl;
  const resolvedTint = tint ?? (
    variant === 'clear' ? theme.colors.glassTintClear : theme.colors.glassTint
  );
  const surfaceStyle = [
    styles.surface,
    {
      borderRadius: resolvedRadius,
      borderColor: theme.colors.glassBorder,
    },
    style,
  ];

  const nativeGlassAvailable =
    Platform.OS === 'ios' &&
    !reduceTransparency &&
    isLiquidGlassAvailable() &&
    isGlassEffectAPIAvailable();

  if (nativeGlassAvailable) {
    return (
      <GlassView
        {...viewProps}
        colorScheme={theme.scheme}
        glassEffectStyle={variant}
        tintColor={resolvedTint}
        isInteractive={interactive}
        style={surfaceStyle}
      >
        {children}
      </GlassView>
    );
  }

  const canBlur =
    !reduceTransparency &&
    (Platform.OS === 'ios' || (Platform.OS === 'android' && blurTarget !== null));

  if (canBlur) {
    return (
      <BlurView
        {...viewProps}
        blurTarget={blurTarget ?? undefined}
        blurMethod={Platform.OS === 'android' ? 'dimezisBlurViewSdk31Plus' : 'none'}
        tint={theme.dark ? 'systemMaterialDark' : 'systemMaterialLight'}
        intensity={intensity}
        style={surfaceStyle}
      >
        <View pointerEvents="none" style={[StyleSheet.absoluteFill, { backgroundColor: resolvedTint }]} />
        <View pointerEvents="none" style={[styles.specular, { backgroundColor: theme.colors.glassHighlight }]} />
        {children}
      </BlurView>
    );
  }

  return (
    <View {...viewProps} style={[surfaceStyle, { backgroundColor: theme.colors.elevatedSurface }]}>
      <View pointerEvents="none" style={[styles.specular, { backgroundColor: theme.colors.glassHighlight }]} />
      {children}
    </View>
  );
}

export interface GlassGroupProps extends PropsWithChildren, Omit<ViewProps, 'children'> {
  spacing?: number;
  backdrop?: ReactNode;
}

export function GlassGroup({ spacing = 8, backdrop, style, children, ...viewProps }: GlassGroupProps) {
  const targetRef = useRef<ComponentRef<typeof View> | null>(null);
  const reduceTransparency = useTransparencyPreference();
  const canUseNativeGroup =
    Platform.OS === 'ios' && !reduceTransparency && isLiquidGlassAvailable() && isGlassEffectAPIAvailable();

  if (canUseNativeGroup && !backdrop) {
    return (
      <GlassContainer {...viewProps} spacing={spacing} style={style}>
        {children}
      </GlassContainer>
    );
  }

  if (backdrop) {
    return (
      <View {...viewProps} style={[styles.group, style]}>
        <BlurTargetView ref={targetRef} style={StyleSheet.absoluteFill}>
          {backdrop}
        </BlurTargetView>
        <BlurTargetContext.Provider value={targetRef}>
          <View style={StyleSheet.absoluteFill}>{children}</View>
        </BlurTargetContext.Provider>
      </View>
    );
  }

  return (
    <View {...viewProps} style={style}>
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  surface: {
    borderCurve: 'continuous',
    overflow: 'hidden',
    borderWidth: StyleSheet.hairlineWidth,
  },
  specular: {
    position: 'absolute',
    top: 0,
    left: 10,
    right: 10,
    height: StyleSheet.hairlineWidth,
  },
  group: {
    position: 'relative',
    overflow: 'hidden',
  },
});
