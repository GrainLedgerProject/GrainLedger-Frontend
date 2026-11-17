import type { BottomTabBarProps } from 'expo-router/js-tabs';

/** Shared navigation preview only. Role-specific workspaces are added with real auth later. */
export const appTabs = [
  { name: 'home', label: 'Home', href: '/home',
    activeIcon: { ios: 'house.fill', android: 'home', web: 'home' },
    inactiveIcon: { ios: 'house', android: 'home', web: 'home' } },
  { name: 'stock', label: 'Stock', href: '/stock',
    activeIcon: { ios: 'shippingbox.fill', android: 'inventory_2', web: 'inventory_2' },
    inactiveIcon: { ios: 'shippingbox', android: 'inventory_2', web: 'inventory_2' } },
  { name: 'settings', label: 'Account', href: '/settings/profile',
    activeIcon: { ios: 'person.crop.circle.fill', android: 'account_circle', web: 'account_circle' },
    inactiveIcon: { ios: 'person.crop.circle', android: 'account_circle', web: 'account_circle' } },
] as const;

export const tabTransitionDuration = 160;


/** Preserve preventDefault and re-selection behavior using the SDK 58 navigator contract. */
export function activateTab(routeKey: string, selected: boolean,
  { emitter, navigateToTab }: Pick<BottomTabBarProps, 'emitter' | 'navigateToTab'>) {
  const event = emitter.emit({ type: 'tabPress', target: routeKey, canPreventDefault: true });
  if (!selected && !event.defaultPrevented) navigateToTab(routeKey);
}

export function tabBarPadding(insets: Pick<BottomTabBarProps['insets'], 'bottom' | 'left' | 'right'>,
  spacing: { sm: number; md: number; lg: number }) {
  return { paddingTop: spacing.sm, paddingBottom: insets.bottom + spacing.md,
    paddingLeft: insets.left + spacing.lg, paddingRight: insets.right + spacing.lg };
}
