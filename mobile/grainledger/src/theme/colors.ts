import { useColorScheme } from '../hooks/use-color-scheme';
export const Colors = {
  primary: '#205E40',
  onPrimary: '#FFFFFF',
  primaryLight: '#1B5E47',
  primaryDark: '#0A261C',
  primarySurface: '#E8F5E9',

  accent: '#D97706',
  accentLight: '#FEF3C7',
  accentDark: '#B45309',

  emerald: '#10B981',
  emeraldLight: '#D1FAE5',
  emeraldDark: '#047857',

  amber: '#F59E0B',
  amberLight: '#FEF3C7',

  red: '#EF4444',
  redLight: '#FEE2E2',

  blue: '#3B82F6',
  blueLight: '#DBEAFE',

  purple: '#8B5CF6',
  purpleLight: '#EDE9FE',

  // Neutrals
  background: '#FFFFFF',
  card: '#F5F5F7',
  cardSubtle: '#F1F5F9',
  border: '#E2E8F0',
  borderLight: '#F8FAFC',
  divider: '#E2E8F0',

  text: '#0F172A',
  textSecondary: '#475569',
  textMuted: '#66666B',
  textInverse: '#FFFFFF',

  // Status colors
  statusCommitted: '#10B981',
  statusPending: '#F59E0B',
  statusHold: '#EF4444',
  statusInProcess: '#3B82F6',
  statusAvailable: '#10B981',
};

export const Shadows = {
  small: {
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  medium: {
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.08,
    shadowRadius: 6,
    elevation: 3,
  },
  large: {
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.12,
    shadowRadius: 12,
    elevation: 6,
  },
};

const darkColors: typeof Colors = { ...Colors, background: '#101010', card: '#1D1D1F', cardSubtle: '#28282A', border: '#343436', borderLight: '#222224', divider: '#343436', text: '#F5F5F7', textSecondary: '#BEBEC3', textMuted: '#A0A0A5', primary: '#79BC8D', onPrimary: '#102217', primarySurface: '#203027' };
export function usePalette(): typeof Colors { return useColorScheme() === 'dark' ? darkColors : Colors; }
