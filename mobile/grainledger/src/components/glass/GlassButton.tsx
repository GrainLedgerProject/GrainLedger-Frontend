import { useState, type ComponentRef, type Ref } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, type PressableProps, type StyleProp, type TextStyle, type ViewStyle } from 'react-native';

import { useAppTheme } from '@/theme/ThemeProvider';
import { GlassView, type GlassViewProps } from './GlassView';

export type GlassButtonProps = Omit<PressableProps, 'children' | 'style' | 'accessibilityRole'> & {
  ref?: Ref<ComponentRef<typeof Pressable>>;
  label: string;
  variant?: 'primary' | 'glass';
  loading?: boolean;
  loadingLabel?: string;
  fullWidth?: boolean;
  blurTarget?: GlassViewProps['blurTarget'];
  opaque?: boolean;
  style?: StyleProp<ViewStyle>;
  labelStyle?: StyleProp<TextStyle>;
};

export function GlassButton({ label, variant = 'primary', loading = false, loadingLabel = 'Working…',
  disabled = false, fullWidth = false, blurTarget, opaque, style, labelStyle,
  accessibilityLabel, accessibilityState, onFocus, onBlur, ref, ...props }: GlassButtonProps) {
  const { theme } = useAppTheme();
  const [focused, setFocused] = useState(false);
  const blocked = Boolean(disabled || loading);
  const foreground = disabled ? theme.colors.textDisabled : variant === 'primary' ? theme.colors.onPrimary : theme.colors.textPrimary;
  const background = disabled ? theme.colors.disabledSurface : variant === 'primary' ? theme.colors.primary : undefined;

  return (
    <Pressable {...props} ref={ref} disabled={blocked} accessibilityRole="button"
      accessibilityLabel={accessibilityLabel ?? label}
      accessibilityState={{ ...accessibilityState, disabled: blocked, busy: loading }}
      onFocus={(event) => { setFocused(true); onFocus?.(event); }}
      onBlur={(event) => { setFocused(false); onBlur?.(event); }}
      style={({ pressed }) => [styles.pressable, { borderRadius: theme.radius.control,
        alignSelf: fullWidth ? 'stretch' : 'flex-start' }, pressed ? theme.shadows.none : theme.shadows.soft,
        focused ? { outlineWidth: 2, outlineOffset: 3, outlineColor: theme.colors.focus } : null, style]}>
      {({ pressed }) => (
        <GlassView pointerEvents="none" padding="none" cornerRadius="control" blurTarget={blurTarget}
          opaque={opaque || blocked || variant === 'primary'}
          style={{ borderWidth: 1, borderRadius: theme.radius.control,
            borderColor: pressed ? theme.colors.focus : theme.colors.controlBorder }}
          contentContainerStyle={[styles.content, { minHeight: theme.layout.minTouchTarget,
            paddingHorizontal: theme.spacing.xl, paddingVertical: theme.spacing.md, gap: theme.spacing.sm,
            backgroundColor: background ?? (pressed ? theme.colors.surfaceRaised : undefined) }]}>
          {loading ? <ActivityIndicator accessible={false} color={foreground} size="small" /> : null}
          <Text style={[theme.typography.label, styles.label, { color: foreground }, labelStyle]}>{loading ? loadingLabel : label}</Text>
        </GlassView>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  pressable: { borderCurve: 'continuous', maxWidth: '100%' },
  content: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center' },
  label: { flexShrink: 1, textAlign: 'center' },
});
