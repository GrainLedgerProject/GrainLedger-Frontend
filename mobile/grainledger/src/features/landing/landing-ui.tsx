import { useState, type ReactNode } from 'react';
import { Pressable, StyleSheet, Text, View, type PressableProps, type StyleProp, type ViewStyle } from 'react-native';

import { useAppTheme } from '@/theme/ThemeProvider';

// Landing-only presentation: the rest of the application keeps its Glass design.
export function useLandingAppearance() {
  const { theme } = useAppTheme();
  const dark = theme.scheme === 'dark';
  return { theme, palette: {
    background: dark ? '#000000' : '#F2F2F7', surface: dark ? '#1C1C1E' : '#FFFFFF',
    grouped: dark ? '#2C2C2E' : '#E5E5EA', text: dark ? '#F2F2F7' : '#1C1C1E',
    secondary: dark ? '#AEAEB2' : '#636366', separator: dark ? '#38383A' : '#D1D1D6',
  } };
}

type ControlProps = Omit<PressableProps, 'style' | 'children'> & { label: string; kind?: 'primary' | 'plain' | 'choice';
  selected?: boolean; style?: StyleProp<ViewStyle> };
export function LandingControl({ label, kind = 'plain', selected = false, style, accessibilityState, ...props }: ControlProps) {
  const { theme, palette: p } = useLandingAppearance();
  const [focused, setFocused] = useState(false);
  return <Pressable {...props} accessibilityRole="button" accessibilityState={{ ...accessibilityState, selected }}
    onFocus={() => setFocused(true)} onBlur={() => setFocused(false)}
    style={({ pressed }) => [ui.control, { opacity: pressed ? 0.65 : 1,
      backgroundColor: kind === 'primary' ? theme.colors.primary : kind === 'choice' && selected ? p.surface : 'transparent',
      ...(focused ? { outlineWidth: 2, outlineOffset: 2, outlineColor: theme.colors.focus } : {}) }, style]}>
    <Text style={[ui.controlLabel, { color: kind === 'primary' ? theme.colors.onPrimary
      : kind === 'choice' && !selected ? p.secondary : theme.colors.primary }]}>{label}</Text>
  </Pressable>;
}

export function LandingPanel({ title, description, children, style }: { title?: string; description?: string;
  children: ReactNode; style?: StyleProp<ViewStyle> }) {
  const { palette: p, theme } = useLandingAppearance();
  return <View style={[ui.panel, { backgroundColor: p.surface }, style]}>
    {title ? <Text accessibilityRole="header" style={[theme.typography.heading, { color: p.text }]}>{title}</Text> : null}
    {description ? <Text style={[theme.typography.body, { color: p.secondary }]}>{description}</Text> : null}
    {children}
  </View>;
}

export function LandingDisclosure({ title, children, initiallyExpanded = false, last = false }: {
  title: string; children: ReactNode; initiallyExpanded?: boolean; last?: boolean;
}) {
  const { palette: p, theme } = useLandingAppearance();
  const [expanded, setExpanded] = useState(initiallyExpanded);
  const [focused, setFocused] = useState(false);
  return <View style={{ paddingVertical: 8, borderBottomWidth: last ? 0 : StyleSheet.hairlineWidth, borderBottomColor: p.separator }}>
    <Pressable accessibilityRole="button" accessibilityState={{ expanded }} onPress={() => setExpanded(!expanded)}
      onFocus={() => setFocused(true)} onBlur={() => setFocused(false)}
      style={({ pressed }) => [ui.disclosure, { opacity: pressed ? 0.65 : 1,
        ...(focused ? { outlineWidth: 2, outlineColor: theme.colors.focus, outlineOffset: 2 } : {}) }]}>
      <Text style={[theme.typography.body, { color: p.text, fontWeight: '600', flex: 1 }]}>{title}</Text>
      <Text accessible={false} style={{ fontSize: 22, color: p.secondary }}>{expanded ? '−' : '+'}</Text>
    </Pressable>
    {expanded ? <View style={{ gap: 12, paddingTop: 8, paddingBottom: 16 }}>{children}</View> : null}
  </View>;
}

const ui = StyleSheet.create({
  control: { minHeight: 48, minWidth: 48, paddingVertical: 12, paddingHorizontal: 14, justifyContent: 'center', alignItems: 'center',
    borderRadius: 12, borderCurve: 'continuous', maxWidth: '100%' },
  controlLabel: { fontSize: 15, lineHeight: 21, fontWeight: '600', textAlign: 'center', flexShrink: 1 },
  panel: { borderRadius: 20, borderCurve: 'continuous', padding: 20, gap: 16 },
  disclosure: { minHeight: 48, flexDirection: 'row', alignItems: 'center', gap: 16, borderRadius: 4 },
});
