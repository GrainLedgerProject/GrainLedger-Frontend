import { BlurTargetView } from 'expo-blur';
import { LinearGradient } from 'expo-linear-gradient';
import { Tabs } from 'expo-router/js-tabs';
import { SymbolView } from 'expo-symbols';
import { useEffect, useRef, useState, type ComponentRef } from 'react';
import { AccessibilityInfo, StyleSheet, View } from 'react-native';

import { FloatingTabBar } from '@/components/navigation/FloatingTabBar';
import { appTabs, tabTransitionDuration } from '@/navigation/tabs';
import { useAppTheme } from '@/theme/ThemeProvider';

export default function AppTabLayout() {
  const { theme } = useAppTheme();
  const blurTarget = useRef<ComponentRef<typeof View> | null>(null);
  const [reducedMotion, setReducedMotion] = useState(true);

  useEffect(() => {
    let active = true;
    void AccessibilityInfo.isReduceMotionEnabled().then((value) => { if (active) setReducedMotion(value); }).catch(() => {});
    const subscription = AccessibilityInfo.addEventListener('reduceMotionChanged', setReducedMotion);
    return () => { active = false; subscription.remove(); };
  }, []);

  return (
    <View style={{ flex: 1, backgroundColor: theme.colors.background }}>
      <BlurTargetView ref={blurTarget} pointerEvents="none" accessible={false} style={StyleSheet.absoluteFill}>
        <LinearGradient colors={theme.gradients.ambient} style={StyleSheet.absoluteFill} />
      </BlurTargetView>
      <Tabs backBehavior="history" tabBar={(props) => <FloatingTabBar {...props} blurTarget={blurTarget} />}
        screenOptions={{ headerShown: false, lazy: true, animation: reducedMotion ? 'none' : 'fade',
          transitionSpec: { animation: 'timing', config: { duration: reducedMotion ? 0 : tabTransitionDuration } },
          sceneStyle: { backgroundColor: 'transparent' } }}>
        {appTabs.map((tab) => <Tabs.Screen key={tab.name} name={tab.name} options={{ title: tab.label,
          tabBarLabel: tab.label, tabBarAccessibilityLabel: tab.label, tabBarButtonTestID: `tab-${tab.name}`,
          tabBarIcon: ({ focused, color, size }) => <SymbolView name={focused ? tab.activeIcon : tab.inactiveIcon}
            size={size} tintColor={color} accessible={false} /> }} />)}
      </Tabs>
    </View>
  );
}
