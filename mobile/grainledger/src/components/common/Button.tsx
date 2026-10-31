import { spacing } from '../../theme/tokens';
import React from 'react';
import {
  ActivityIndicator,
  Platform,
  Pressable,
  StyleSheet,
  View,
  type StyleProp,
  type TextStyle,
  type ViewStyle,
} from 'react-native';
import Animated, {
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withSpring,
} from 'react-native-reanimated';

import { useAppTheme } from '../../theme';
import { haptics } from '../../utils/haptics';
import { AppText } from '../ui/AppText';

interface ButtonProps {
  title: string;
  onPress: () => void;
  variant?: 'primary' | 'secondary' | 'accent' | 'outline' | 'danger';
  size?: 'small' | 'medium' | 'large';
  loading?: boolean;
  disabled?: boolean;
  icon?: React.ReactNode;
  style?: StyleProp<ViewStyle>;
  textStyle?: StyleProp<TextStyle>;
}

export const Button: React.FC<ButtonProps> = ({
  title,
  onPress,
  variant = 'primary',
  size = 'medium',
  loading = false,
  disabled = false,
  icon,
  style,
  textStyle,
}) => {
  const theme = useAppTheme();
  const reduceMotion = useReducedMotion();
  const scale = useSharedValue(1);
  const isDisabled = disabled || loading;
  const isPrimary = variant === 'primary' || variant === 'accent' || variant === 'danger';

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  const backgroundColor =
    variant === 'danger'
      ? theme.colors.destructive
      : variant === 'primary' || variant === 'accent'
        ? theme.colors.accent
        : variant === 'secondary'
          ? theme.colors.accentMuted
          : 'transparent';

  const foregroundColor = variant === 'danger' ? theme.colors.onDestructive : isPrimary
    ? theme.colors.onAccent
    : variant === 'secondary'
      ? theme.colors.accent
      : theme.colors.label;

  const minHeight = size === 'small' ? (Platform.OS === 'android' ? 48 : 44) : size === 'large' ? 54 : 48;
  const horizontalPadding = size === 'small' ? theme.spacing.md : theme.spacing.xl;

  const setPressed = (pressed: boolean) => {
    scale.set(
      reduceMotion ? 1 : withSpring(pressed ? 0.97 : 1, theme.motion.spring),
    );
  };

  const handlePress = () => {
    void haptics.selection();
    onPress();
  };

  return (
    <Animated.View style={[styles.animated, animatedStyle, style]}>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={title}
        accessibilityState={{ disabled: isDisabled, busy: loading }}
        disabled={isDisabled}
        hitSlop={4}
        onPress={handlePress}
        onPressIn={() => setPressed(true)}
        onPressOut={() => setPressed(false)}
        style={({ pressed }) => [
          styles.button,
          {
            minHeight,
            paddingHorizontal: horizontalPadding,
            borderRadius: theme.radii.pill,
            backgroundColor,
            borderColor: variant === 'outline' ? theme.colors.separator : 'transparent',
            opacity: isDisabled ? 0.45 : pressed ? 0.86 : 1,
          },
        ]}
      >
        {loading ? (
          <ActivityIndicator size="small" color={foregroundColor} />
        ) : (
          <View style={styles.content}>
            {icon}
            <AppText
              variant={size === 'small' ? 'subheadline' : 'headline'}
              style={[{ color: foregroundColor }, textStyle]}
              maxFontSizeMultiplier={1.4}
            >
              {title}
            </AppText>
          </View>
        )}
      </Pressable>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  animated: {
    alignSelf: 'auto',
  },
  button: {
    alignItems: 'center',
    borderWidth: StyleSheet.hairlineWidth,
    justifyContent: 'center',
  },
  content: {
    flexShrink: 1,
    alignItems: 'center',
    flexDirection: 'row',
    gap: spacing.sm,
    justifyContent: 'center',
  },
});
