import type { Config } from 'tailwindcss';

/* Design system "Signal" — see CONTEXT.md §4.
 *
 * Every color resolves through a CSS custom property holding space-separated
 * RGB channels. Two consequences, both deliberate:
 *   1. Opacity modifiers still work: `bg-accent-500/10`.
 *   2. Settings -> accent color can repaint the whole app at runtime by writing
 *      three variables (see lib/tokens.ts applyAccent), with no rebuild.
 */
const withVar = (name: string) => `rgb(var(--color-${name}) / <alpha-value>)`;

export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        ink: {
          900: withVar('ink-900'),
          700: withVar('ink-700'),
          500: withVar('ink-500'),
          300: withVar('ink-300'),
          150: withVar('ink-150'),
          100: withVar('ink-100'),
        },
        accent: {
          600: withVar('accent-600'),
          500: withVar('accent-500'),
          100: withVar('accent-100'),
        },
        positive: {
          600: withVar('positive-600'),
          500: withVar('positive-500'),
          100: withVar('positive-100'),
        },
        warn: {
          500: withVar('warn-500'),
          100: withVar('warn-100'),
        },
        danger: {
          600: withVar('danger-600'),
          100: withVar('danger-100'),
        },
        surface: {
          app: withVar('surface-app'),
          card: withVar('surface-card'),
          sunken: withVar('surface-sunken'),
        },
      },
      fontFamily: {
        display: ['"Space Grotesk"', 'system-ui', 'sans-serif'],
        sans: ['"IBM Plex Sans"', 'system-ui', '-apple-system', 'sans-serif'],
        mono: ['"IBM Plex Mono"', 'ui-monospace', 'SFMono-Regular', 'monospace'],
      },
      fontSize: {
        // CONTEXT.md §4: 11 · 12 · 13 · 14 · 16 · 20 · 26 · 34 · 44
        '2xs': ['0.6875rem', { lineHeight: '1rem', letterSpacing: '0.04em' }], // 11
        xs: ['0.75rem', { lineHeight: '1.125rem' }], // 12
        sm: ['0.8125rem', { lineHeight: '1.25rem' }], // 13 — table rows
        base: ['0.875rem', { lineHeight: '1.45' }], // 14 — base UI
        md: ['1rem', { lineHeight: '1.45' }], // 16
        lg: ['1.25rem', { lineHeight: '1.3' }], // 20
        xl: ['1.625rem', { lineHeight: '1.15' }], // 26
        '2xl': ['2.125rem', { lineHeight: '1.15' }], // 34
        '3xl': ['2.75rem', { lineHeight: '1.1' }], // 44
      },
      spacing: {
        // 4px base; the scale is 4 8 12 16 24 32 48 64 and Tailwind's defaults
        // already cover it (1 2 3 4 6 8 12 16). Only additions live here.
        18: '4.5rem',
        22: '5.5rem',
        rail: '4rem', // collapsed sidebar width
        sidebar: '15rem',
      },
      borderRadius: {
        DEFAULT: '4px', // inputs
        card: '8px',
        overlay: '12px',
      },
      boxShadow: {
        // Two shadows only.
        sm: '0 1px 2px 0 rgb(23 25 28 / 0.06), 0 1px 3px 0 rgb(23 25 28 / 0.06)',
        lg: '0 12px 32px -8px rgb(23 25 28 / 0.18), 0 4px 12px -4px rgb(23 25 28 / 0.10)',
      },
      transitionDuration: { DEFAULT: '150ms' },
      keyframes: {
        'fade-in': { from: { opacity: '0' }, to: { opacity: '1' } },
        'slide-up': {
          from: { opacity: '0', transform: 'translateY(6px)' },
          to: { opacity: '1', transform: 'translateY(0)' },
        },
        'slide-in-right': {
          from: { transform: 'translateX(100%)' },
          to: { transform: 'translateX(0)' },
        },
        shimmer: { from: { backgroundPosition: '200% 0' }, to: { backgroundPosition: '-200% 0' } },
      },
      animation: {
        'fade-in': 'fade-in 150ms ease-out',
        'slide-up': 'slide-up 180ms cubic-bezier(0.2, 0.8, 0.2, 1)',
        'slide-in-right': 'slide-in-right 220ms cubic-bezier(0.2, 0.8, 0.2, 1)',
        shimmer: 'shimmer 1.4s linear infinite',
      },
    },
  },
  plugins: [],
} satisfies Config;
