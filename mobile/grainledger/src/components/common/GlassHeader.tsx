import { spacing } from '../../theme/tokens';
import React from 'react';
import { Pressable, StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';
import { useRouter } from 'expo-router';

import { useAppTheme } from '../../theme';
import { AppIcon } from '../ui/AppIcon';
import { AppText } from '../ui/AppText';
import { GlassSurface } from '../ui/GlassSurface';

export interface GlassHeaderProps {
  title: string;
  subtitle?: string;
  showBack?: boolean;
  rightAction?: React.ReactNode;
  style?: StyleProp<ViewStyle>;
}

export const GlassHeader: React.FC<GlassHeaderProps> = ({
  title,
  subtitle,
  showBack = false,
  rightAction,
  style,
}) => {
  const router = useRouter();
  const theme = useAppTheme();

  return (
    <GlassSurface variant="regular" radius={0} style={[styles.surface, style]}>
      <View style={styles.toolbar}>
        {showBack ? (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Trở lại"
            hitSlop={8}
            onPress={() => router.back()}
            style={({ pressed }) => [styles.back, pressed && styles.pressed]}
          >
            <AppIcon name="back" size={20} color={theme.colors.accent} />
            <AppText variant="body" color="accent" maxFontSizeMultiplier={1.35}>
              Trở lại
            </AppText>
          </Pressable>
        ) : (
          <View />
        )}
        {rightAction}
      </View>
      <AppText variant="largeTitle" maxFontSizeMultiplier={1.35}>
        {title}
      </AppText>
      {subtitle ? (
        <AppText variant="subheadline" color="secondaryLabel" style={styles.subtitle}>
          {subtitle}
        </AppText>
      ) : null}
    </GlassSurface>
  );
};

const styles = StyleSheet.create({
  back: {
    alignItems: 'center',
    flexDirection: 'row',
    minHeight: 44,
    paddingRight: spacing.md,
  },
  pressed: {
    opacity: 0.55,
  },
  subtitle: {
    marginTop: spacing.xs,
  },
  surface: {
    paddingBottom: spacing.lg,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.sm,
  },
  toolbar: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
    minHeight: 44,
  },
});
