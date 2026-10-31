import React from 'react';
import { type StyleProp, type TextStyle, type ViewStyle } from 'react-native';

import { Button } from './Button';

export interface GlassButtonProps {
  title: string;
  onPress: () => void;
  variant?: 'primary' | 'glass' | 'secondary' | 'danger' | 'success';
  size?: 'small' | 'medium' | 'large';
  icon?: React.ReactNode;
  loading?: boolean;
  disabled?: boolean;
  style?: StyleProp<ViewStyle>;
  textStyle?: StyleProp<TextStyle>;
  fullWidth?: boolean;
}

/**
 * Compatibility wrapper. Ordinary actions use opaque/tinted HIG buttons;
 * liquid glass remains reserved for floating navigation and compact controls.
 */
export const GlassButton: React.FC<GlassButtonProps> = ({
  variant = 'glass',
  fullWidth = false,
  style,
  ...props
}) => (
  <Button
    {...props}
    variant={
      variant === 'danger'
        ? 'danger'
        : variant === 'primary' || variant === 'success'
          ? 'primary'
          : 'secondary'
    }
    style={[fullWidth && { alignSelf: 'stretch' }, style]}
  />
);
