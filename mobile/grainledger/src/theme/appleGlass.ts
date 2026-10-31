/**
 * Apple Design Language & Liquid Glassmorphism Design Tokens
 * Conforms to Apple Human Interface Guidelines (HIG) with Liquid Glass optical parameters
 */

export const AppleGlass = {
  // Apple Materials / Glass Tints
  materials: {
    ultraThin: 'rgba(255, 255, 255, 0.45)',
    thin: 'rgba(255, 255, 255, 0.60)',
    regular: 'rgba(255, 255, 255, 0.86)',
    thick: 'rgba(255, 255, 255, 0.88)',
    chrome: 'rgba(255, 255, 255, 0.94)',
    
    // Darker / Scrim variants for high-contrast cards
    scrimLight: 'rgba(15, 23, 42, 0.04)',
    scrimMedium: 'rgba(15, 23, 42, 0.08)',
    
    // Tinted glass for brand & status
    emeraldGlass: 'rgba(16, 185, 129, 0.12)',
    amberGlass: 'rgba(245, 158, 11, 0.12)',
    redGlass: 'rgba(239, 68, 68, 0.12)',
    blueGlass: 'rgba(59, 130, 246, 0.12)',
    purpleGlass: 'rgba(139, 92, 246, 0.12)',
  },

  // Apple System Colors
  colors: {
    systemGreen: '#34C759',
    systemOrange: '#FF9500',
    systemRed: '#FF3B30',
    systemBlue: '#007AFF',
    systemIndigo: '#5856D6',
    systemTeal: '#30B0C7',
    systemMint: '#00C7BE',
    
    // GrainLedger Brand Accents
    brandGreen: '#0D3828',
    brandEmerald: '#10B981',
    brandGold: '#D97706',
    brandSand: '#F5EEDB',

    // Apple Neutral Palette
    label: '#000000',
    secondaryLabel: '#55665E', // 60% opacity
    tertiaryLabel: '#64736B',  // 30% opacity
    quaternaryLabel: '#3C3C432E',// 18% opacity

    systemBackground: '#EEF3EF',
    secondarySystemBackground: '#FFFFFF',
    groupedBackground: '#EEF3EF',
    
    // Apple Glass borders (Subtle 0.5 - 1px highlights)
    glassBorderLight: 'rgba(255, 255, 255, 0.65)',
    glassBorderDark: 'rgba(0, 0, 0, 0.08)',
    glassDivider: 'rgba(60, 60, 67, 0.12)',
  },

  // Apple Squircle Border Radii
  radii: {
    xs: 8,
    sm: 12,
    md: 16,
    lg: 24,
    xl: 32,
    pill: 9999,
  },

  // Apple-grade Soft Diffused Shadows
  shadows: {
    glassSubtle: {
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.04,
      shadowRadius: 10,
      elevation: 2,
    },
    glassFloating: {
      shadowColor: '#0F172A',
      shadowOffset: { width: 0, height: 8 },
      shadowOpacity: 0.08,
      shadowRadius: 20,
      elevation: 5,
    },
    glassElevated: {
      shadowColor: '#0F172A',
      shadowOffset: { width: 0, height: 16 },
      shadowOpacity: 0.12,
      shadowRadius: 32,
      elevation: 8,
    },
  },

  // Optical Defaults for LiquidGlassView
  opticalPresets: {
    card: {
      preset: 'frosted' as const,
      variant: 'regular' as const,
      tintColor: 'rgba(255, 255, 255, 0.82)',
      blurRadius: 16,
      rim: true,
      specular: true,
      thickness: 1,
    },
    cardTinted: (tint: string) => ({
      preset: 'frosted' as const,
      variant: 'regular' as const,
      tintColor: tint,
      blurRadius: 18,
      rim: true,
      specular: true,
      thickness: 1,
    }),
    header: {
      preset: 'navigationBar' as const,
      variant: 'regular' as const,
      tintColor: 'rgba(255, 255, 255, 0.85)',
      blurRadius: 20,
      rim: false,
      specular: false,
    },
    tabBar: {
      preset: 'floatingTabBar' as const,
      variant: 'regular' as const,
      tintColor: 'rgba(255, 255, 255, 0.88)',
      blurRadius: 24,
      rim: true,
      specular: true,
    },
    button: {
      preset: 'compactControl' as const,
      variant: 'regular' as const,
      tintColor: 'rgba(255, 255, 255, 0.90)',
      blurRadius: 12,
      rim: true,
      specular: true,
      interactive: true,
    },
  },
};
