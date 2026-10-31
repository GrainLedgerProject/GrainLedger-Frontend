import { radii, spacing } from '../../theme/tokens';
import React from 'react';
import { Pressable, StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';

import { useAppTheme } from '../../theme';
import { haptics } from '../../utils/haptics';
import { AppText } from '../ui/AppText';
import { GlassSurface } from '../ui/GlassSurface';

export interface SegmentItem {
  id: string;
  label: string;
  count?: number;
}

export interface GlassSegmentedControlProps {
  segments: SegmentItem[];
  activeId: string;
  onSelect: (id: string) => void;
  style?: StyleProp<ViewStyle>;
}

export const GlassSegmentedControl: React.FC<GlassSegmentedControlProps> = ({
  segments,
  activeId,
  onSelect,
  style,
}) => {
  const theme = useAppTheme();

  return (
    <GlassSurface
      variant="clear"
      radius={theme.radii.pill}
      style={[styles.surface, style]}
    >
      <View style={styles.row}>
        {segments.map((item) => {
          const active = item.id === activeId;

          return (
            <Pressable
              key={item.id}
              accessibilityRole="tab"
              accessibilityState={{ selected: active }}
              accessibilityLabel={
                typeof item.count === 'number' ? `${item.label}, ${item.count}` : item.label
              }
              hitSlop={2}
              onPress={() => {
                void haptics.selection();
                onSelect(item.id);
              }}
              style={({ pressed }) => [
                styles.segment,
                {
                  backgroundColor: active ? theme.colors.elevatedSurface : 'transparent',
                  borderRadius: theme.radii.pill,
                  opacity: pressed ? 0.72 : 1,
                },
                active && theme.shadows.subtle,
              ]}
            >
              <AppText
                variant="subheadline"
                maxFontSizeMultiplier={1.3}
                style={{
                  color: active ? theme.colors.accent : theme.colors.secondaryLabel,
                  fontWeight: active ? '600' : '500',
                }}
              >
                {item.label}
              </AppText>
              {typeof item.count === 'number' && item.count > 0 ? (
                <View
                  style={[
                    styles.count,
                    {
                      backgroundColor: active
                        ? theme.colors.accentMuted
                        : theme.colors.surfaceSecondary,
                    },
                  ]}
                >
                  <AppText
                    variant="captionStrong"
                    maxFontSizeMultiplier={1.2}
                    style={{ color: active ? theme.colors.accent : theme.colors.secondaryLabel }}
                  >
                    {item.count}
                  </AppText>
                </View>
              ) : null}
            </Pressable>
          );
        })}
      </View>
    </GlassSurface>
  );
};

const styles = StyleSheet.create({
  count: {
    borderRadius: radii.xs,
    minWidth: 20,
    paddingHorizontal: spacing.xs,
    paddingVertical: spacing.zero,
  },
  row: {
    alignItems: 'stretch',
    flexDirection: 'row',
    gap: spacing.xs,
  },
  segment: {
    alignItems: 'center',
    flex: 1,
    flexDirection: 'row',
    gap: spacing.xs,
    justifyContent: 'center',
    minHeight: 44,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.sm,
  },
  surface: {
    padding: spacing.xs,
  },
});
