import React from 'react';
import { Pressable, StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';

import { useAppTheme } from '../../theme';
import { AppIcon } from './AppIcon';
import { AppText } from './AppText';

export interface ListRowProps {
  title: string;
  subtitle?: string;
  leading?: React.ReactNode;
  trailing?: React.ReactNode;
  onPress?: () => void;
  showSeparator?: boolean;
  style?: StyleProp<ViewStyle>;
}

export function ListRow({
  title,
  subtitle,
  leading,
  trailing,
  onPress,
  showSeparator = true,
  style,
}: ListRowProps) {
  const theme = useAppTheme();
  const content = (
    <>
      {leading}
      <View style={styles.copy}>
        <AppText variant="body" maxFontSizeMultiplier={1.5}>
          {title}
        </AppText>
        {subtitle ? (
          <AppText variant="footnote" color="secondaryLabel" style={styles.subtitle}>
            {subtitle}
          </AppText>
        ) : null}
      </View>
      {trailing}
      {onPress && !trailing ? (
        <AppIcon name="forward" size={15} color={theme.colors.tertiaryLabel} />
      ) : null}
    </>
  );

  const rowStyle = [
    styles.row,
    showSeparator && {
      borderBottomColor: theme.colors.separator,
      borderBottomWidth: StyleSheet.hairlineWidth,
    },
    style,
  ];

  if (!onPress) return <View style={rowStyle}>{content}</View>;

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={subtitle ? `${title}. ${subtitle}` : title}
      onPress={onPress}
      style={({ pressed }) => [
        rowStyle,
        pressed && { backgroundColor: theme.colors.surfaceSecondary },
      ]}
    >
      {content}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  copy: { flex: 1 },
  row: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 12,
    minHeight: 56,
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  subtitle: { marginTop: 2 },
});
