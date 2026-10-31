import React from 'react';
import { SymbolView, type SymbolViewProps } from 'expo-symbols';
import type { ColorValue, StyleProp, ViewStyle } from 'react-native';

import { useAppTheme } from '../../theme';

export type AppIconName =
  | 'home'
  | 'field'
  | 'mill'
  | 'compliance'
  | 'trace'
  | 'profile'
  | 'back'
  | 'forward'
  | 'sync'
  | 'offline'
  | 'add'
  | 'search'
  | 'warning'
  | 'success'
  | 'error'
  | 'info'
  | 'settings'
  | 'logout'
  | 'visible'
  | 'hidden';

const symbols: Record<AppIconName, SymbolViewProps['name']> = {
  home: { ios: 'house.fill', android: 'home', web: 'home' },
  field: { ios: 'leaf.fill', android: 'grass', web: 'grass' },
  mill: { ios: 'building.2.fill', android: 'factory', web: 'factory' },
  compliance: { ios: 'checkmark.shield.fill', android: 'verified_user', web: 'verified_user' },
  trace: { ios: 'qrcode.viewfinder', android: 'qr_code_scanner', web: 'qr_code_scanner' },
  profile: { ios: 'person.crop.circle.fill', android: 'account_circle', web: 'account_circle' },
  back: { ios: 'chevron.backward', android: 'chevron_left', web: 'chevron_left' },
  forward: { ios: 'chevron.forward', android: 'chevron_right', web: 'chevron_right' },
  sync: { ios: 'arrow.trianglehead.2.clockwise.rotate.90', android: 'sync', web: 'sync' },
  offline: { ios: 'icloud.slash.fill', android: 'cloud_off', web: 'cloud_off' },
  add: { ios: 'plus', android: 'add', web: 'add' },
  search: { ios: 'magnifyingglass', android: 'search', web: 'search' },
  warning: { ios: 'exclamationmark.triangle.fill', android: 'warning', web: 'warning' },
  success: { ios: 'checkmark.circle.fill', android: 'check_circle', web: 'check_circle' },
  error: { ios: 'xmark.circle.fill', android: 'error', web: 'error' },
  info: { ios: 'info.circle.fill', android: 'info', web: 'info' },
  settings: { ios: 'gearshape.fill', android: 'settings', web: 'settings' },
  logout: { ios: 'rectangle.portrait.and.arrow.right', android: 'logout', web: 'logout' },
  visible: { ios: 'eye.fill', android: 'visibility', web: 'visibility' },
  hidden: { ios: 'eye.slash.fill', android: 'visibility_off', web: 'visibility_off' },
};

export interface AppIconProps {
  name: AppIconName;
  size?: number;
  color?: ColorValue;
  style?: StyleProp<ViewStyle>;
  accessibilityLabel?: string;
}

export function AppIcon({ name, size = 22, color, style, accessibilityLabel }: AppIconProps) {
  const theme = useAppTheme();

  return (
    <SymbolView
      name={symbols[name]}
      size={size}
      tintColor={color ?? theme.colors.label}
      weight="semibold"
      style={style}
      accessibilityLabel={accessibilityLabel}
    />
  );
}
