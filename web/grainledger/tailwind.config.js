// Preserve opacity modifiers for semantic CSS variable colors (e.g. bg-accent-primary/10).
const themeColor = (name) => `color-mix(in srgb, var(--color-${name}) calc(<alpha-value> * 100%), transparent)`;

/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        surface: {
          canvas: themeColor('surface-canvas'),
          base: themeColor('surface-base'),
          raised: themeColor('surface-raised'),
          overlay: themeColor('surface-overlay'),
        },
        ink: {
          primary: themeColor('ink-primary'),
          secondary: themeColor('ink-secondary'),
          tertiary: themeColor('ink-tertiary'),
          inverse: themeColor('ink-inverse'),
        },
        accent: {
          primary: themeColor('accent-primary'),
          'primary-dim': themeColor('accent-primary-dim'),
          warning: themeColor('accent-warning'),
          danger: themeColor('accent-danger'),
          info: themeColor('accent-info'),
          success: themeColor('accent-success'),
        },
        company: {
          a: themeColor('company-a'),
          b: themeColor('company-b'),
          c: themeColor('company-c'),
          d: themeColor('company-d'),
        },
        functional: {
          'hold-bg': themeColor('hold-bg'),
          'hold-border': themeColor('hold-border'),
          'stale-bg': themeColor('stale-bg'),
          'stale-border': themeColor('stale-border'),
          'balanced-bg': themeColor('balanced-bg'),
          'balanced-border': themeColor('balanced-border'),
          'rejected-bg': themeColor('rejected-bg'),
          'rejected-border': themeColor('rejected-border'),
        }
      },
      fontFamily: {
        sans: ['-apple-system', 'BlinkMacSystemFont', '"SF Pro Display"', '"Inter"', '"Segoe UI"', 'system-ui', 'sans-serif'],
        body: ['-apple-system', 'BlinkMacSystemFont', '"SF Pro Text"', '"Inter"', '"Segoe UI"', 'system-ui', 'sans-serif'],
        display: ['-apple-system', 'BlinkMacSystemFont', '"SF Pro Display"', '"Inter"', '"Segoe UI"', 'system-ui', 'sans-serif'],
        serif: ['"Georgia"', '"Times New Roman"', 'serif'],
        mono: ['"SF Mono"', '"JetBrains Mono"', '"Fira Mono"', 'ui-monospace', 'monospace'],
      },
      borderRadius: {
        sm: '8px',
        md: '12px',
        lg: '16px',
        xl: '24px',
        '2xl': '32px',
      },
      boxShadow: {
        xs: 'var(--shadow-xs)',
        sm: 'var(--shadow-sm)',
        md: 'var(--shadow-md)',
        lg: 'var(--shadow-lg)',
        xl: 'var(--shadow-xl)',
        glow: 'var(--shadow-glow)',
        'apple-card': 'var(--shadow-sm)',
        'apple-hover': 'var(--shadow-md)',
      },
      transitionTimingFunction: {
        spring: 'cubic-bezier(0.22, 1, 0.36, 1)',
        bounce: 'cubic-bezier(0.34, 1.56, 0.64, 1)',
        apple: 'cubic-bezier(0.25, 0.1, 0.25, 1)',
      },
      backdropBlur: {
        glass: '20px',
      },
      backdropSaturate: {
        glass: '1.8',
      },
    },
  },
  plugins: [],
}
