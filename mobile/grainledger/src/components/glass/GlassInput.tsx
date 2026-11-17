import { useId, useState, type ComponentRef, type Ref } from 'react';
import { ActivityIndicator, Text, TextInput, View, type StyleProp, type TextInputProps, type ViewStyle } from 'react-native';

import { useAppTheme } from '@/theme/ThemeProvider';
import { GlassView, type GlassViewProps } from './GlassView';

export type GlassInputProps = TextInputProps & {
  ref?: Ref<ComponentRef<typeof TextInput>>;
  label: string;
  helperText?: string;
  error?: string;
  disabled?: boolean;
  loading?: boolean;
  blurTarget?: GlassViewProps['blurTarget'];
  opaque?: boolean;
  containerStyle?: StyleProp<ViewStyle>;
};

export function GlassInput({ label, helperText, error, disabled = false, loading = false, blurTarget, opaque,
  containerStyle, style, editable = true, multiline, accessibilityLabel, accessibilityLabelledBy,
  accessibilityHint, accessibilityState, nativeID, onFocus, onBlur, ref,
  placeholderTextColor, selectionColor, underlineColorAndroid, ...props }: GlassInputProps) {
  const { theme } = useAppTheme();
  const [focused, setFocused] = useState(false);
  const generatedId = useId();
  const labelId = `${nativeID ?? generatedId}-label`;
  const canEdit = editable && !disabled && !loading;
  const hint = [accessibilityHint, error ? `Error: ${error}` : helperText].filter(Boolean).join('. ');

  return (
    <View style={[{ gap: theme.spacing.sm, minWidth: 0 }, containerStyle]}>
      <Text nativeID={labelId} style={[theme.typography.label, { color: theme.colors.textPrimary }]}>{label}</Text>
      <GlassView padding="none" cornerRadius="control" blurTarget={blurTarget} opaque={opaque || !canEdit}
        style={{ borderWidth: 1, borderColor: error ? theme.colors.danger : focused ? theme.colors.focus : theme.colors.controlBorder,
          ...(focused ? { outlineWidth: 2, outlineOffset: 2, outlineColor: theme.colors.focus } : {}) }}
        contentContainerStyle={{ flexDirection: 'row', alignItems: 'center', gap: theme.spacing.sm,
          backgroundColor: !canEdit ? theme.colors.disabledSurface : undefined }}>
        <TextInput {...props} ref={ref} nativeID={nativeID ?? generatedId} multiline={multiline} editable={canEdit}
          accessibilityLabel={accessibilityLabel ?? label} accessibilityLabelledBy={accessibilityLabelledBy ?? labelId}
          accessibilityHint={hint || undefined} accessibilityState={{ ...accessibilityState, disabled: !canEdit, busy: loading }}
          placeholderTextColor={placeholderTextColor ?? theme.colors.textSecondary}
          selectionColor={selectionColor ?? theme.colors.primary} underlineColorAndroid={underlineColorAndroid ?? 'transparent'}
          onFocus={(event) => { setFocused(true); onFocus?.(event); }}
          onBlur={(event) => { setFocused(false); onBlur?.(event); }}
          style={[theme.typography.body, { flex: 1, minWidth: 0, minHeight: theme.layout.minTouchTarget,
            padding: theme.spacing.md, textAlignVertical: multiline ? 'top' : 'center',
            color: canEdit ? theme.colors.textPrimary : theme.colors.textDisabled }, style]} />
        {loading ? <ActivityIndicator accessible={false} color={theme.colors.textSecondary} style={{ marginRight: theme.spacing.md }} /> : null}
      </GlassView>
      {error ? <Text accessibilityLiveRegion="polite" style={[theme.typography.caption, { color: theme.colors.danger }]}>Error: {error}</Text>
        : helperText ? <Text style={[theme.typography.caption, { color: theme.colors.textSecondary }]}>{helperText}</Text> : null}
    </View>
  );
}
