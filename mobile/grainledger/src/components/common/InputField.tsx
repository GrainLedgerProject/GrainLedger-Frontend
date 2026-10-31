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

interface InputFieldProps extends TextInputProps {
  label: string;
  error?: string;
  unitSuffix?: string;
  containerStyle?: StyleProp<ViewStyle>;
  required?: boolean;
}

export const InputField: React.FC<InputFieldProps> = ({
  label,
  error,
  unitSuffix,
  containerStyle,
  required,
  style,
  onBlur,
  onFocus,
  accessibilityLabel,
  ...rest
}) => {
  const theme = useAppTheme();
  const [focused, setFocused] = useState(false);

  return (
    <View style={[styles.container, containerStyle]}>
      <View style={styles.labelRow}>
        <AppText variant="subheadline" style={styles.label}>
          {label}
        </AppText>
        {required ? (
          <AppText variant="subheadline" color="destructive">
            *
          </AppText>
        ) : null}
      </View>

      <View
        style={[
          styles.inputWrapper,
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
        <TextInput
          accessibilityLabel={accessibilityLabel ?? label}
          accessibilityState={{ disabled: rest.editable === false }}
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
          {...rest}
        />
        {unitSuffix ? (
          <View style={[styles.suffix, { borderLeftColor: theme.colors.separator }]}>
            <AppText variant="subheadline" color="secondaryLabel">
              {unitSuffix}
            </AppText>
          </View>
        ) : null}
      </View>

      {error ? (
        <AppText variant="caption" color="destructive" style={styles.supporting}>
          {error}
        </AppText>
      ) : null}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginBottom: 16,
  },
  input: {
    flex: 1,
    minHeight: 50,
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  inputWrapper: {
    alignItems: 'center',
    borderWidth: StyleSheet.hairlineWidth,
    flexDirection: 'row',
    minHeight: 50,
  },
  label: {
    fontWeight: '600',
  },
  labelRow: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 4,
    marginBottom: 7,
  },
  suffix: {
    borderLeftWidth: StyleSheet.hairlineWidth,
    paddingHorizontal: 12,
    paddingVertical: 4,
  },
  supporting: {
    marginTop: 5,
  },
});
