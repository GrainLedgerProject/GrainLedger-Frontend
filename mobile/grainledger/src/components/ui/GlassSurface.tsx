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
type GlassDefaults = Pick<GlassSurfaceProps, 'variant' | 'tint' | 'interactive' | 'radius'>;
const GlassDefaultsContext = createContext<GlassDefaults>({});

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
  variant: variantProp,
  tint: tintProp,
  interactive: interactiveProp,
  radius: radiusProp,
  intensity = 72,
  style,
  children,
  ...viewProps
}: GlassSurfaceProps) {
  const theme = useAppTheme();
  const defaults = useContext(GlassDefaultsContext);
  const variant = variantProp ?? defaults.variant ?? 'regular';
  const tint = tintProp ?? defaults.tint;
  const interactive = interactiveProp ?? defaults.interactive ?? false;
  const radius = radiusProp ?? defaults.radius;
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

export interface GlassGroupProps extends PropsWithChildren, Omit<GlassSurfaceProps, 'children' | 'intensity'> {
  spacing?: number;
  backdrop?: ReactNode;
}

export function GlassGroup({ spacing = 8, backdrop, style, children, variant, tint, interactive, radius, ...viewProps }: GlassGroupProps) {
  const targetRef = useRef<ComponentRef<typeof View> | null>(null);
  const reduceTransparency = useTransparencyPreference();
  const canUseNativeGroup =
    Platform.OS === 'ios' && !reduceTransparency && isLiquidGlassAvailable() && isGlassEffectAPIAvailable();

  if (canUseNativeGroup && !backdrop) {
    return (
      <GlassDefaultsContext.Provider value={{ variant, tint, interactive, radius }}>
        <GlassContainer {...viewProps} spacing={spacing} style={style}>
          {children}
        </GlassContainer>
      </GlassDefaultsContext.Provider>
    );
  }

  if (backdrop) {
    return (
      <View {...viewProps} style={[styles.group, style]}>
        <BlurTargetView ref={targetRef} style={StyleSheet.absoluteFill}>
          {backdrop}
        </BlurTargetView>
        <BlurTargetContext.Provider value={targetRef}>
          <GlassDefaultsContext.Provider value={{ variant, tint, interactive, radius }}>
            <View style={StyleSheet.absoluteFill}>{children}</View>
          </GlassDefaultsContext.Provider>
        </BlurTargetContext.Provider>
      </View>
    );
  }

  return (
    <View {...viewProps} style={style}>
      <GlassDefaultsContext.Provider value={{ variant, tint, interactive, radius }}>
        {children}
      </GlassDefaultsContext.Provider>
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
