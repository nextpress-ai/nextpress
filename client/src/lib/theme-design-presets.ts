import type { ThemeSettings } from '@shared/theme-settings';
import { DEFAULT_THEME_SETTINGS } from '@shared/theme-settings';

export type ColorPalettePreset = {
  id: string;
  label: string;
  swatch: readonly [string, string, string, string];
  colors: NonNullable<ThemeSettings['colors']>;
};

export type TypeScalePreset = {
  id: string;
  label: string;
  typography: NonNullable<ThemeSettings['typography']>;
};

export type ShapePreset = {
  id: string;
  label: string;
  shape: NonNullable<ThemeSettings['shape']>;
  shadows: NonNullable<ThemeSettings['shadows']>;
};

const mergeColors = (
  patch: Partial<NonNullable<ThemeSettings['colors']>>,
): NonNullable<ThemeSettings['colors']> => ({
  ...DEFAULT_THEME_SETTINGS.colors!,
  ...patch,
});

/** Curated palettes — apply as a starting point, then tweak individual tokens. */
export const COLOR_PALETTE_PRESETS: readonly ColorPalettePreset[] = [
  {
    id: 'classic',
    label: 'Classic',
    swatch: ['#3b82f6', '#ffffff', '#18181b', '#f3f4f6'],
    colors: mergeColors({}),
  },
  {
    id: 'slate',
    label: 'Slate',
    swatch: ['#475569', '#ffffff', '#0f172a', '#f1f5f9'],
    colors: mergeColors({
      accent: '#475569',
      accentHover: '#334155',
      primary: '#475569',
    }),
  },
  {
    id: 'forest',
    label: 'Forest',
    swatch: ['#15803d', '#f8faf8', '#14532d', '#ecfdf5'],
    colors: mergeColors({
      background: '#f8faf8',
      foreground: '#14532d',
      muted: '#ecfdf5',
      mutedForeground: '#3f6212',
      accent: '#15803d',
      accentHover: '#166534',
      primary: '#15803d',
      secondary: '#dcfce7',
      border: 'rgb(21 128 61 / 0.12)',
    }),
  },
  {
    id: 'sunset',
    label: 'Sunset',
    swatch: ['#ea580c', '#fffbf5', '#431407', '#ffedd5'],
    colors: mergeColors({
      background: '#fffbf5',
      foreground: '#431407',
      muted: '#ffedd5',
      mutedForeground: '#9a3412',
      accent: '#ea580c',
      accentHover: '#c2410c',
      primary: '#ea580c',
      secondary: '#fed7aa',
      border: 'rgb(234 88 12 / 0.12)',
    }),
  },
  {
    id: 'ink',
    label: 'Ink',
    swatch: ['#38bdf8', '#0f172a', '#f8fafc', '#1e293b'],
    colors: mergeColors({
      background: '#0f172a',
      foreground: '#f8fafc',
      muted: '#1e293b',
      mutedForeground: '#94a3b8',
      accent: '#38bdf8',
      accentHover: '#0ea5e9',
      accentForeground: '#0f172a',
      primary: '#38bdf8',
      primaryForeground: '#0f172a',
      secondary: '#334155',
      border: 'rgb(148 163 184 / 0.2)',
    }),
  },
] as const;

const mergeTypography = (
  patch: Partial<NonNullable<ThemeSettings['typography']>>,
): NonNullable<ThemeSettings['typography']> => ({
  ...DEFAULT_THEME_SETTINGS.typography!,
  ...patch,
});

/** Adjusts heading and body scale without exposing every size field upfront. */
export const TYPE_SCALE_PRESETS: readonly TypeScalePreset[] = [
  {
    id: 'compact',
    label: 'Compact',
    typography: mergeTypography({
      title: { ...DEFAULT_THEME_SETTINGS.typography!.title, fontSize: '1.875rem' },
      subheading: { ...DEFAULT_THEME_SETTINGS.typography!.subheading, fontSize: '1.25rem' },
      body: { ...DEFAULT_THEME_SETTINGS.typography!.body, fontSize: '0.9375rem' },
      small: { ...DEFAULT_THEME_SETTINGS.typography!.small, fontSize: '0.8125rem' },
    }),
  },
  {
    id: 'default',
    label: 'Default',
    typography: mergeTypography({}),
  },
  {
    id: 'editorial',
    label: 'Editorial',
    typography: mergeTypography({
      title: { ...DEFAULT_THEME_SETTINGS.typography!.title, fontSize: '3rem', lineHeight: '1.1' },
      subheading: { ...DEFAULT_THEME_SETTINGS.typography!.subheading, fontSize: '1.75rem' },
      body: { ...DEFAULT_THEME_SETTINGS.typography!.body, fontSize: '1.0625rem', lineHeight: '1.6' },
      small: { ...DEFAULT_THEME_SETTINGS.typography!.small, fontSize: '0.875rem' },
    }),
  },
] as const;

export const SHAPE_PRESETS: readonly ShapePreset[] = [
  {
    id: 'sharp',
    label: 'Sharp',
    shape: { radius: '0' },
    shadows: {
      sm: 'none',
      md: '0 1px 2px 0 rgb(0 0 0 / 0.06)',
      lg: '0 4px 6px -1px rgb(0 0 0 / 0.08)',
    },
  },
  {
    id: 'soft',
    label: 'Soft',
    shape: DEFAULT_THEME_SETTINGS.shape!,
    shadows: DEFAULT_THEME_SETTINGS.shadows!,
  },
  {
    id: 'round',
    label: 'Round',
    shape: { radius: '1rem' },
    shadows: DEFAULT_THEME_SETTINGS.shadows!,
  },
] as const;

export const ESSENTIAL_COLOR_KEYS = [
  'background',
  'foreground',
  'accent',
  'accentHover',
  'muted',
  'border',
] as const satisfies readonly (keyof NonNullable<ThemeSettings['colors']>)[];

export const ADVANCED_COLOR_KEYS = [
  'mutedForeground',
  'accentForeground',
  'primary',
  'secondary',
  'destructive',
] as const satisfies readonly (keyof NonNullable<ThemeSettings['colors']>)[];

export const COLOR_FIELD_LABELS: Record<
  keyof NonNullable<ThemeSettings['colors']>,
  string
> = {
  background: 'Page background',
  foreground: 'Text',
  muted: 'Muted surface',
  mutedForeground: 'Muted text',
  accent: 'Accent',
  accentHover: 'Accent hover',
  accentForeground: 'Accent text',
  primary: 'Primary',
  primaryForeground: 'Primary text',
  secondary: 'Secondary',
  border: 'Border',
  destructive: 'Destructive',
  text: 'Text (legacy)',
};
