import { BottomTabBarHeightCallbackContext, type BottomTabBarProps } from 'expo-router/js-tabs';
import { useContext, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { GlassView, type GlassViewProps } from '@/components/glass/GlassView';
import { useAppTheme } from '@/theme/ThemeProvider';
import { activateTab, tabBarPadding } from '@/navigation/tabs';

type FloatingTabBarProps = BottomTabBarProps & { blurTarget?: GlassViewProps['blurTarget'] };

export function FloatingTabBar({ state, descriptors, emitter, navigateToTab, insets, blurTarget }: FloatingTabBarProps) {
  const { theme } = useAppTheme();
  const [focusedKey, setFocusedKey] = useState<string | null>(null);
  const onHeightChange = useContext(BottomTabBarHeightCallbackContext);
  const { colors: c, spacing: s } = theme;

  // Normal-flow layout reserves the complete measured bar height, including large labels.
  // The pill floats visually; no screen content is covered or given a guessed bottom offset.
  return (
    <View style={tabBarPadding(insets, s)} onLayout={(event) => onHeightChange?.(event.nativeEvent.layout.height)}>
      <GlassView blurTarget={blurTarget} shadow="raised" cornerRadius="sheet" padding="sm"
        style={styles.bar} contentContainerStyle={styles.row}>
        {state.routes.map((route, index) => {
          const { options } = descriptors[route.key];
          const selected = state.index === index;
          const label = typeof options.tabBarLabel === 'string' ? options.tabBarLabel : options.title ?? route.name;
          const color = selected ? c.primary : c.textSecondary;

          return (
            <Pressable key={route.key} accessibilityRole="tab" accessibilityState={{ selected }}
              accessibilityLabel={options.tabBarAccessibilityLabel ?? `${label}, tab ${index + 1} of ${state.routes.length}`}
              testID={options.tabBarButtonTestID}
              onPress={() => activateTab(route.key, selected, { emitter, navigateToTab })}
              onLongPress={() => emitter.emit({ type: 'tabLongPress', target: route.key })}
              onFocus={() => setFocusedKey(route.key)} onBlur={() => setFocusedKey(null)}
              style={({ pressed }) => [styles.tab, { minHeight: theme.layout.minTouchTarget,
                borderRadius: theme.radius.control, paddingVertical: s.sm, paddingHorizontal: s.xs,
                backgroundColor: selected ? c.selectedSurface : pressed ? c.surfaceRaised : 'transparent' },
                focusedKey === route.key ? { outlineWidth: 2, outlineOffset: 2, outlineColor: c.focus } : null]}>
              <View pointerEvents="none" accessible={false}>
                {options.tabBarIcon?.({ focused: selected, color, size: 24 })}
              </View>
              <Text style={[theme.typography.caption, styles.label, { color, fontWeight: selected ? '700' : '500' }]}>{label}</Text>
            </Pressable>
          );
        })}
      </GlassView>
    </View>
  );
}

const styles = StyleSheet.create({
  bar: { width: '100%', maxWidth: 520, alignSelf: 'center' },
  row: { flexDirection: 'row', gap: 4 },
  tab: { flex: 1, minWidth: 0, alignItems: 'center', justifyContent: 'center', gap: 4, borderCurve: 'continuous' },
  label: { textAlign: 'center', flexShrink: 1 },
});
