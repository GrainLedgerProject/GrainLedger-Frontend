import React from 'react';
import { SymbolView, type SymbolViewProps } from 'expo-symbols';
import type { ColorValue, StyleProp, ViewStyle } from 'react-native';

import { useAppTheme } from '../../theme';

const symbols = {
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
  AlertOctagon: { ios: 'exclamationmark.octagon', android: 'report', web: 'report' },
  AlertTriangle: { ios: 'exclamationmark.triangle', android: 'warning', web: 'warning' },
  ArrowLeft: { ios: 'chevron.backward', android: 'chevron_left', web: 'chevron_left' },
  ArrowRight: { ios: 'arrow.right', android: 'arrow_forward', web: 'arrow_forward' },
  Building: { ios: 'building.2', android: 'business', web: 'business' },
  Building2: { ios: 'building.2', android: 'business', web: 'business' },
  Check: { ios: 'checkmark', android: 'check', web: 'check' },
  CheckCircle: { ios: 'checkmark.circle', android: 'check_circle', web: 'check_circle' },
  CheckCircle2: { ios: 'checkmark.circle', android: 'check_circle', web: 'check_circle' },
  Cloud: { ios: 'icloud', android: 'cloud', web: 'cloud' },
  FileText: { ios: 'doc.text', android: 'description', web: 'description' },
  FlaskConical: { ios: 'flask', android: 'science', web: 'science' },
  Inbox: { ios: 'tray', android: 'inbox', web: 'inbox' },
  Info: { ios: 'info.circle', android: 'info', web: 'info' },
  KeyRound: { ios: 'key', android: 'key', web: 'key' },
  Lock: { ios: 'lock', android: 'lock', web: 'lock' },
  LogOut: { ios: 'rectangle.portrait.and.arrow.right', android: 'logout', web: 'logout' },
  MapPin: { ios: 'mappin.and.ellipse', android: 'location_on', web: 'location_on' },
  Phone: { ios: 'phone', android: 'call', web: 'call' },
  PlusCircle: { ios: 'plus.circle', android: 'add_circle', web: 'add_circle' },
  QrCode: { ios: 'qrcode', android: 'qr_code', web: 'qr_code' },
  RefreshCw: { ios: 'arrow.clockwise', android: 'refresh', web: 'refresh' },
  Scale: { ios: 'scalemass', android: 'scale', web: 'scale' },
  Search: { ios: 'magnifyingglass', android: 'search', web: 'search' },
  Server: { ios: 'server.rack', android: 'dns', web: 'dns' },
  Share2: { ios: 'square.and.arrow.up', android: 'share', web: 'share' },
  Shield: { ios: 'shield', android: 'shield', web: 'shield' },
  ShieldAlert: { ios: 'exclamationmark.shield', android: 'gpp_maybe', web: 'gpp_maybe' },
  ShieldCheck: { ios: 'checkmark.shield', android: 'verified_user', web: 'verified_user' },
  Sliders: { ios: 'slider.horizontal.3', android: 'tune', web: 'tune' },
  Sparkles: { ios: 'sparkles', android: 'auto_awesome', web: 'auto_awesome' },
  Trash2: { ios: 'trash', android: 'delete', web: 'delete' },
  Truck: { ios: 'truck.box', android: 'local_shipping', web: 'local_shipping' },
  User: { ios: 'person', android: 'person', web: 'person' },
  Warehouse: { ios: 'shippingbox', android: 'warehouse', web: 'warehouse' },
} satisfies Record<string, SymbolViewProps['name']>;

export type AppIconName = keyof typeof symbols;

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
      accessibilityRole={accessibilityLabel ? 'image' : undefined}
      accessibilityElementsHidden={!accessibilityLabel}
      importantForAccessibility={accessibilityLabel ? 'yes' : 'no'}
    />
  );
}
