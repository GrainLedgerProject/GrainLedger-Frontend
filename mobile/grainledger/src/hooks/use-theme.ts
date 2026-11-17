/**
 * Learn more about light and dark modes:
 * https://docs.expo.dev/guides/color-schemes/
 */

import { Colors } from '@/constants/theme';
import { useAppTheme } from '@/theme/ThemeProvider';

export function useTheme() {
  return Colors[useAppTheme().theme.scheme];
}
