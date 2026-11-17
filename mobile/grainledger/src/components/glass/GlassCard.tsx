import { Text } from 'react-native';

import { useAppTheme } from '@/theme/ThemeProvider';
import { GlassView, type GlassViewProps } from './GlassView';

export type GlassCardProps = GlassViewProps & {
  title?: string;
  description?: string;
};

export function GlassCard({ title, description, children, padding = 'lg', shadow = 'none', opaque = true,
  contentContainerStyle, style, ...props }: GlassCardProps) {
  const { theme } = useAppTheme();
  return (
    <GlassView {...props} padding={padding} shadow={shadow} opaque={opaque}
      style={[{ borderColor: theme.colors.border }, style]}
      contentContainerStyle={[{ gap: theme.spacing.md }, contentContainerStyle]}>
      {title ? <Text accessibilityRole="header" style={[theme.typography.heading, { color: theme.colors.textPrimary }]}>{title}</Text> : null}
      {description ? <Text style={[theme.typography.body, { color: theme.colors.textSecondary }]}>{description}</Text> : null}
      {children}
    </GlassView>
  );
}
