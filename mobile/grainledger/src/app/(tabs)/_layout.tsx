import { spacing } from '../../theme/tokens';
import React from 'react';
import { StyleSheet, type ColorValue } from 'react-native';
import { Tabs } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { AppIcon, type AppIconName } from '../../components/ui/AppIcon';
import { GlassSurface } from '../../components/ui/GlassSurface';
import { useAppTheme } from '../../theme';

function createTabIcon(name: AppIconName) {
  function TabIcon({ color, focused }: { color: ColorValue; focused: boolean }) {
    return <AppIcon name={name} color={color} size={focused ? 23 : 21} />;
  }

  return TabIcon;
}

export default function TabLayout() {
  const insets = useSafeAreaInsets();
  const theme = useAppTheme();

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        sceneStyle: { backgroundColor: theme.colors.background },
        tabBarActiveTintColor: theme.colors.accent,
        tabBarInactiveTintColor: theme.colors.secondaryLabel,
        tabBarActiveBackgroundColor: theme.colors.accentMuted,
        tabBarItemStyle: styles.item,
        tabBarHideOnKeyboard: true,
        tabBarBackground: () => (
          <GlassSurface
            variant="regular"
            radius={theme.radii.sheet}
            style={StyleSheet.absoluteFill}
          />
        ),
        tabBarStyle: [
          styles.tabBar,
          {
            bottom: Math.max(insets.bottom, 10),
            borderRadius: theme.radii.sheet,
            height: theme.layout.tabBarHeight,
            shadowColor: theme.colors.shadow,
          },
        ],
        tabBarLabelStyle: [theme.typography.captionStrong, styles.label],
      }}
    >
      <Tabs.Screen
        name="index"
        options={{ title: 'Tổng quan', tabBarIcon: createTabIcon('home') }}
      />
      <Tabs.Screen
        name="field"
        options={{ title: 'Thực địa', tabBarIcon: createTabIcon('field') }}
      />
      <Tabs.Screen
        name="mill"
        options={{ title: 'Nhà máy', tabBarIcon: createTabIcon('mill') }}
      />
      <Tabs.Screen
        name="compliance"
        options={{ title: 'Tuân thủ', tabBarIcon: createTabIcon('compliance') }}
      />
      <Tabs.Screen
        name="trace"
        options={{ title: 'Truy xuất', tabBarIcon: createTabIcon('trace') }}
      />
      <Tabs.Screen
        name="profile"
        options={{ title: 'Cá nhân', href: null, tabBarIcon: createTabIcon('profile') }}
      />
    </Tabs>
  );
}

const styles = StyleSheet.create({
  item: {
    borderRadius: 24,
    marginHorizontal: spacing.xxs,
  },
  label: {
    marginTop: spacing.zero,
  },
  tabBar: {
    backgroundColor: 'transparent',
    borderTopWidth: 0,
    elevation: 12,
    left: 12,
    paddingBottom: spacing.xs,
    paddingTop: spacing.xs,
    position: 'absolute',
    right: 12,
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.1,
    shadowRadius: 18,
  },
});
