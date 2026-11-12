import { Tabs } from "expo-router";
import {
  Pressable,
  StyleSheet,
  View,
  type ColorValue,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { radii } from "../../theme/tokens";

import { AppIcon, type AppIconName } from "../../components/ui/AppIcon";
import { GlassSurface } from "../../components/ui/GlassSurface";
import { useAppTheme } from "../../theme";

function TabIcon({
  name,
  color,
  focused,
}: {
  name: AppIconName;
  color: ColorValue;
  focused: boolean;
}) {
  const theme = useAppTheme();

  return (
    <View
      style={[
        styles.iconWrapper,
        focused && {
          backgroundColor: theme.dark
            ? "rgba(120, 188, 131, 0.20)"
            : "rgba(47, 107, 58, 0.12)",
          borderColor: theme.dark
            ? "rgba(120, 188, 131, 0.35)"
            : "rgba(47, 107, 58, 0.18)",
        },
      ]}
    >
      <AppIcon name={name} color={color} size={focused ? 23 : 21} />
    </View>
  );
}

function createTabIcon(name: AppIconName) {
  function ScreenTabIcon({
    color,
    focused,
  }: {
    color: ColorValue;
    focused: boolean;
  }) {
    return <TabIcon name={name} color={color} focused={focused} />;
  }

  return ScreenTabIcon;
}

export default function TabLayout() {
  const insets = useSafeAreaInsets();
  const theme = useAppTheme();

  // Chiều cao chuẩn dock Apple HIG & bo tròn hoàn toàn hai đầu
  const tabBarHeight = theme.layout.tabBarHeight;
  const tabBarRadius = theme.radii.sheet;

  return (
    <Tabs
      safeAreaInsets={{ bottom: 0, top: 0, left: 0, right: 0 }}
      screenOptions={{
        headerShown: false,
        tabBarShowLabel: false,

        sceneStyle: {
          backgroundColor: theme.colors.background,
        },

        tabBarActiveTintColor: theme.colors.accent,
        tabBarInactiveTintColor: theme.colors.secondaryLabel,

        tabBarButton: (props) => {
          const { ref: _ref, style, ...rest } = props as any;
          return (
            <Pressable
              {...rest}
              style={[
                style,
                styles.tabButton,
              ]}
            />
          );
        },

        tabBarItemStyle: styles.item,
        tabBarHideOnKeyboard: true,

        tabBarBackground: () => (
          <GlassSurface
            variant="regular"
            radius={tabBarRadius}
            style={StyleSheet.absoluteFill}
          />
        ),

        tabBarStyle: [
          styles.tabBar,
          {
            bottom: Math.max(insets.bottom, 12),
            height: tabBarHeight,
            borderRadius: tabBarRadius,
            shadowColor: theme.colors.shadow,
          },
        ],
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: "Tổng quan",
          tabBarIcon: createTabIcon("home"),
        }}
      />

      <Tabs.Screen
        name="field"
        options={{
          title: "Thực địa",
          tabBarIcon: createTabIcon("field"),
        }}
      />

      <Tabs.Screen
        name="mill"
        options={{
          title: "Nhà máy",
          tabBarIcon: createTabIcon("mill"),
        }}
      />

      <Tabs.Screen
        name="compliance"
        options={{
          title: "Tuân thủ",
          tabBarIcon: createTabIcon("compliance"),
        }}
      />

      <Tabs.Screen
        name="trace"
        options={{
          title: "Truy xuất",
          tabBarIcon: createTabIcon("trace"),
        }}
      />

      <Tabs.Screen
        name="profile"
        options={{
          title: "Cá nhân",
          href: null,
          tabBarIcon: createTabIcon("profile"),
        }}
      />
    </Tabs>
  );
}

const styles = StyleSheet.create({
  iconWrapper: {
    alignItems: "center",
    borderColor: "transparent",
    borderRadius: radii.pill,
    borderWidth: 1,
    height: 38,
    justifyContent: "center",
    width: 52,
  },

  item: {
    alignItems: "center",
    flex: 1,
    height: "100%",
    justifyContent: "center",
    margin: 0,
    padding: 0,
  },

  tabBar: {
    backgroundColor: "transparent",
    borderTopWidth: 0,
    elevation: 12,
    left: 12,
    paddingHorizontal: 8,
    paddingVertical: 0,
    position: "absolute",
    right: 12,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.12,
    shadowRadius: 20,
  },

  tabButton: {
    alignItems: "center",
    flex: 1,
    height: "100%",
    justifyContent: "center",
    padding: 0,
  },
});
