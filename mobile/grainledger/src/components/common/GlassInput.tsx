import React, { useState } from 'react';
import {
  StyleSheet,
  TextInput,
  View,
  type StyleProp,
  type TextInputProps,
  type ViewStyle,
} from 'react-native';

import { useAppTheme } from '../../theme';
import { AppText } from '../ui/AppText';

export interface GlassInputProps extends TextInputProps {
  label?: string;
  error?: string;
  containerStyle?: StyleProp<ViewStyle>;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
}

/** @deprecated Inputs use a solid adaptive surface for reliable contrast. */
export const GlassInput: React.FC<GlassInputProps> = ({
  label,
  error,
  containerStyle,
  leftIcon,
  rightIcon,
  style,
  onBlur,
  onFocus,
  accessibilityLabel,
  ...props
}) => {
  const theme = useAppTheme();
  const [focused, setFocused] = useState(false);

  return (
    <View style={[styles.wrapper, containerStyle]}>
      {label ? (
        <AppText variant="subheadline" style={styles.label}>
          {label}
        </AppText>
      ) : null}
      <View
        style={[
          styles.inputContainer,
          {
            backgroundColor: theme.colors.surface,
            borderColor: error
              ? theme.colors.destructive
              : focused
                ? theme.colors.accent
                : theme.colors.separator,
            borderRadius: theme.radii.md,
          },
        ]}
      >
        {leftIcon ? <View style={styles.leading}>{leftIcon}</View> : null}
        <TextInput
          accessibilityLabel={accessibilityLabel ?? label}
          allowFontScaling
          maxFontSizeMultiplier={1.5}
          onBlur={(event) => {
            setFocused(false);
            onBlur?.(event);
          }}
          onFocus={(event) => {
            setFocused(true);
            onFocus?.(event);
          }}
          placeholderTextColor={theme.colors.tertiaryLabel}
          selectionColor={theme.colors.accent}
          style={[styles.input, theme.typography.body, { color: theme.colors.label }, style]}
          {...props}
        />
        {rightIcon ? <View style={styles.trailing}>{rightIcon}</View> : null}
      </View>
      {error ? (
        <AppText variant="caption" color="destructive" style={styles.error}>
          {error}
        </AppText>
      ) : null}
    </View>
  );
};

const styles = StyleSheet.create({
  error: { marginTop: 5 },
  input: { flex: 1, minHeight: 50, paddingVertical: 10 },
  inputContainer: {
    alignItems: 'center',
    borderWidth: StyleSheet.hairlineWidth,
    flexDirection: 'row',
    minHeight: 50,
    paddingHorizontal: 14,
  },
  label: { fontWeight: '600', marginBottom: 7 },
  leading: { marginRight: 10 },
  trailing: { marginLeft: 10 },
  wrapper: { marginBottom: 16 },
});
