import React, { type PropsWithChildren } from 'react';
import { StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';

import { useAppTheme } from '../../theme';

export interface SheetSurfaceProps extends PropsWithChildren {
  style?: StyleProp<ViewStyle>;
  showGrabber?: boolean;
}

export function SheetSurface({ children, style, showGrabber = true }: SheetSurfaceProps) {
  const theme = useAppTheme();

  return (
    <View
      style={[
        styles.sheet,
        {
          backgroundColor: theme.colors.elevatedSurface,
          borderColor: theme.colors.separator,
          borderTopLeftRadius: theme.radii.sheet,
          borderTopRightRadius: theme.radii.sheet,
        },
        style,
      ]}
    >
      {showGrabber ? (
        <View
          accessibilityElementsHidden
          style={[
            styles.grabber,
            { backgroundColor: theme.colors.tertiaryLabel, borderRadius: theme.radii.pill },
          ]}
        />
      ) : null}
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  grabber: {
    alignSelf: 'center',
    height: 5,
    marginBottom: 12,
    opacity: 0.45,
    width: 36,
  },
  sheet: {
    borderTopWidth: StyleSheet.hairlineWidth,
    paddingBottom: 24,
    paddingHorizontal: 20,
    paddingTop: 8,
  },
});
