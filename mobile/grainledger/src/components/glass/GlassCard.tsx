import { Text } from 'react-native';

import { useAppTheme } from '@/theme/ThemeProvider';
import { GlassView, type GlassViewProps } from './GlassView';

export type GlassCardProps = GlassViewProps & {
  title?: string;
  description?: string;
};

export function GlassCard({ title, description, children, padding = 'xl', shadow = 'soft',
  contentContainerStyle, ...props }: GlassCardProps) {
  const { theme } = useAppTheme();
  return (
    <GlassView {...props} padding={padding} shadow={shadow}
      contentContainerStyle={[{ gap: theme.spacing.lg }, contentContainerStyle]}>
      {title ? <Text accessibilityRole="header" style={[theme.typography.heading, { color: theme.colors.textPrimary }]}>{title}</Text> : null}
      {description ? <Text style={[theme.typography.body, { color: theme.colors.textSecondary }]}>{description}</Text> : null}
      {children}
    </GlassView>
  );
}
