/* TS mirror of the token layer in index.css / tailwind.config.ts.
 *
 * Anything that needs a token *value* (Recharts series colors, the heat ramp,
 * inline SVG fills) reads it from here rather than hardcoding a hex, so a fork
 * retunes the palette in one place. Tailwind class names stay the default path;
 * this is the escape hatch for code that cannot use classes.
 */

export const tokens = {
  ink: {
    900: '#17191C',
    700: '#2A2E33',
    500: '#545B63',
    300: '#8A9199',
    150: '#C8CDD2',
    100: '#E1E5E9',
  },
  accent: { 600: '#E5402D', 500: '#FF4E3A', 100: '#FFE9E5' },
  positive: { 600: '#0B6362', 500: '#0E7C7B', 100: '#DCEFEE' },
  warn: { 500: '#B8730B', 100: '#FBEEDA' },
  danger: { 600: '#A4231A', 100: '#F9E0DE' },
  surface: { app: '#F1F3F5', card: '#FFFFFF', sunken: '#EAEDF0' },
} as const;

/** Chart series order. Accent leads; nothing else competes with it. */
export const chartSeries = [
  tokens.accent[500],
  tokens.positive[500],
  tokens.ink[500],
  tokens.warn[500],
  tokens.ink[300],
  tokens.accent[600],
] as const;

/* --- color math -------------------------------------------------------- */

export type RGB = { r: number; g: number; b: number };

const clamp255 = (n: number) => Math.max(0, Math.min(255, Math.round(n)));

export function hexToRgb(hex: string): RGB | null {
  const m = /^#?([0-9a-f]{3}|[0-9a-f]{6})$/i.exec(hex.trim());
  if (!m) return null;
  let h = m[1];
  if (h.length === 3) h = h[0] + h[0] + h[1] + h[1] + h[2] + h[2];
  const int = parseInt(h, 16);
  return { r: (int >> 16) & 255, g: (int >> 8) & 255, b: int & 255 };
}

export function rgbToHex({ r, g, b }: RGB): string {
  return '#' + [r, g, b].map((c) => clamp255(c).toString(16).padStart(2, '0')).join('').toUpperCase();
}

/** CSS-var channel form: "255 78 58". */
export function rgbToChannels({ r, g, b }: RGB): string {
  return `${clamp255(r)} ${clamp255(g)} ${clamp255(b)}`;
}

/** Linear blend. amount 0 = a, 1 = b. */
export function mix(a: RGB, b: RGB, amount: number): RGB {
  const t = Math.max(0, Math.min(1, amount));
  return {
    r: a.r + (b.r - a.r) * t,
    g: a.g + (b.g - a.g) * t,
    b: a.b + (b.b - a.b) * t,
  };
}

/** Ramp across an ordered list of stops. position 0..1. */
export function rampAt(stops: RGB[], position: number): RGB {
  if (stops.length === 0) throw new Error('rampAt needs at least one stop');
  if (stops.length === 1) return stops[0];
  const t = Math.max(0, Math.min(1, position)) * (stops.length - 1);
  const i = Math.min(Math.floor(t), stops.length - 2);
  return mix(stops[i], stops[i + 1], t - i);
}

/** Relative luminance, per WCAG 2.x. */
export function luminance({ r, g, b }: RGB): number {
  const channel = (c: number) => {
    const s = c / 255;
    return s <= 0.03928 ? s / 12.92 : Math.pow((s + 0.055) / 1.055, 2.4);
  };
  return 0.2126 * channel(r) + 0.7152 * channel(g) + 0.0722 * channel(b);
}

export function contrastRatio(a: RGB, b: RGB): number {
  const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x);
  return (hi + 0.05) / (lo + 0.05);
}

/** Pick black or white text for a filled swatch. */
export function readableTextOn(hex: string): '#FFFFFF' | '#17191C' {
  const rgb = hexToRgb(hex);
  if (!rgb) return '#17191C';
  const ink = hexToRgb(tokens.ink[900])!;
  const white = { r: 255, g: 255, b: 255 };
  return contrastRatio(rgb, white) >= contrastRatio(rgb, ink) ? '#FFFFFF' : '#17191C';
}

/* --- runtime accent (the client customization hook, CONTEXT.md §4) ------- */

const WHITE: RGB = { r: 255, g: 255, b: 255 };
const BLACK: RGB = { r: 0, g: 0, b: 0 };

/**
 * Derive the 600/500/100 accent ramp from a single client hex and write it to
 * :root. Settings -> accent color calls this; buttons, focus rings and the hot
 * end of the heat ramp all follow with no rebuild.
 *
 * Returns the derived hexes so Settings can preview them.
 */
export function applyAccent(
  hex: string,
  target: HTMLElement | null = typeof document === 'undefined' ? null : document.documentElement,
): { 600: string; 500: string; 100: string } | null {
  const base = hexToRgb(hex);
  if (!base) return null;

  const shade600 = mix(base, BLACK, 0.14);
  const tint100 = mix(base, WHITE, 0.88);

  if (target) {
    target.style.setProperty('--color-accent-500', rgbToChannels(base));
    target.style.setProperty('--color-accent-600', rgbToChannels(shade600));
    target.style.setProperty('--color-accent-100', rgbToChannels(tint100));
  }

  return { 600: rgbToHex(shade600), 500: rgbToHex(base), 100: rgbToHex(tint100) };
}

/** Read the live accent (respects a runtime override) as hex. */
export function currentAccent(): string {
  if (typeof document === 'undefined') return tokens.accent[500];
  const raw = getComputedStyle(document.documentElement)
    .getPropertyValue('--color-accent-500')
    .trim();
  const parts = raw.split(/[\s,]+/).map(Number);
  if (parts.length < 3 || parts.some(Number.isNaN)) return tokens.accent[500];
  return rgbToHex({ r: parts[0], g: parts[1], b: parts[2] });
}
