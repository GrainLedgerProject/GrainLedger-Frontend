import React from "react";
import { StyleSheet, View, type StyleProp, type ViewStyle } from "react-native";
import { spacing } from "../../theme/tokens";

import { useAppTheme } from "../../theme";

interface CardProps {
  children: React.ReactNode;
  style?: StyleProp<ViewStyle>;
  /** @deprecated Content surfaces are intentionally opaque; glass is reserved for app chrome. */
  glass?: boolean;
}

export const Card: React.FC<CardProps> = ({ children, style }) => {
  const theme = useAppTheme();

  return (
    <View
      style={[
        styles.card,
        {
          backgroundColor: theme.colors.surface,
          borderColor: theme.colors.separator,
          borderRadius: theme.radii.lg,
        },
        theme.shadows.subtle,
        style,
      ]}
    >
      {children}
    </View>
  );
};

const createStyles = (Colors: typeof BaseColors) =>
  StyleSheet.create({
    card: {
      borderWidth: StyleSheet.hairlineWidth,
      padding: spacing.lg,
    },
  });
