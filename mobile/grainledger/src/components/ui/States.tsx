import { spacing } from '../../theme/tokens';
import React from 'react';
import { ActivityIndicator, StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';

import { useAppTheme } from '../../theme';
import { Button } from '../common/Button';
import { AppIcon, type AppIconName } from './AppIcon';
import { AppText } from './AppText';

interface StateProps {
  title: string;
  message?: string;
  icon?: AppIconName;
  actionLabel?: string;
  onAction?: () => void;
  style?: StyleProp<ViewStyle>;
}

function StateView({
  title,
  message,
  icon = 'info',
  actionLabel,
  onAction,
  style,
}: StateProps) {
  const theme = useAppTheme();

  return (
    <View style={[styles.state, style]}>
      <View
        style={[
          styles.icon,
          { backgroundColor: theme.colors.accentMuted, borderRadius: theme.radii.lg },
        ]}
      >
        <AppIcon name={icon} size={28} color={theme.colors.accent} />
      </View>
      <AppText variant="headline" align="center">
        {title}
      </AppText>
      {message ? (
        <AppText variant="subheadline" color="secondaryLabel" align="center">
          {message}
        </AppText>
      ) : null}
      {actionLabel && onAction ? (
        <Button title={actionLabel} variant="secondary" onPress={onAction} />
      ) : null}
    </View>
  );
}

export function EmptyState(props: StateProps) {
  return <StateView {...props} />;
}

export function ErrorState(props: StateProps) {
  return <StateView icon="error" {...props} />;
}

export function LoadingState({ label = 'Đang tải dữ liệu' }: { label?: string }) {
  const theme = useAppTheme();

  return (
    <View accessibilityLabel={label} accessibilityRole="progressbar" style={styles.loading}>
      <ActivityIndicator color={theme.colors.accent} />
      <View style={styles.loadingCopy}>
        <View
          style={[
            styles.skeletonWide,
            { backgroundColor: theme.colors.surfaceSecondary, borderRadius: theme.radii.xs },
          ]}
        />
        <View
          style={[
            styles.skeletonNarrow,
            { backgroundColor: theme.colors.surfaceSecondary, borderRadius: theme.radii.xs },
          ]}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  icon: {
    alignItems: 'center',
    height: 56,
    justifyContent: 'center',
    width: 56,
  },
  loading: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: spacing.md,
    minHeight: 72,
    padding: spacing.lg,
  },
  loadingCopy: {
    flex: 1,
    gap: spacing.sm,
  },
  skeletonNarrow: {
    height: 12,
    width: '62%',
  },
  skeletonWide: {
    height: 16,
    width: '88%',
  },
  state: {
    alignItems: 'center',
    gap: spacing.md,
    padding: spacing.xl,
  },
});
