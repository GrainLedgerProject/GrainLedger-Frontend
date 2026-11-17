import { Link } from 'expo-router';
import type { ReactNode } from 'react';
import { ScrollView, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { GlassCard } from '@/components/glass/GlassCard';
import { useAppTheme } from '@/theme/ThemeProvider';

type NavigationPlaceholderProps = { title: string; path: string; description: string; children?: ReactNode };

export function NavigationPlaceholder({ title, path, description, children }: NavigationPlaceholderProps) {
  const { theme } = useAppTheme();
  const { colors: c, typography: t, spacing: s } = theme;
  return (
    <SafeAreaView edges={['top', 'left', 'right']} style={{ flex: 1 }}>
      <ScrollView contentContainerStyle={{ flexGrow: 1, padding: s.page, gap: s.xl,
        width: '100%', maxWidth: theme.layout.maxContentWidth, alignSelf: 'center' }}>
        <Text style={[t.caption, { color: c.textSecondary }]}>GRAINLEDGER · NAVIGATION PREVIEW</Text>
        <Text accessibilityRole="header" style={[t.title, { color: c.textPrimary }]}>{title}</Text>
        <GlassCard title="A place for what's next." description={description} opaque>
          <Text style={[t.body, { color: c.textSecondary }]}>This is a temporary route placeholder. Business features are not migrated and no domain data is requested.</Text>
          <Text selectable style={[t.mono, { color: c.textSecondary }]}>{path}</Text>
        </GlassCard>
        {children}
        <View style={{ gap: s.md }}>
          <Link href="/theme-demo" style={[t.label, { color: c.primary, paddingVertical: s.md }]}>Open the theme & component studio →</Link>
          <Link href="/" style={[t.label, { color: c.textSecondary, paddingVertical: s.md }]}>Back to welcome</Link>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
