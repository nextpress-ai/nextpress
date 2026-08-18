import { tokenColors } from '@/lib/tailwind-tokens';

const COLOR_FAMILIES = [
  'slate',
  'gray',
  'zinc',
  'neutral',
  'stone',
  'red',
  'orange',
  'amber',
  'yellow',
  'lime',
  'green',
  'emerald',
  'teal',
  'cyan',
  'sky',
  'blue',
  'indigo',
  'violet',
  'purple',
  'fuchsia',
  'pink',
  'rose',
] as const;

const SHADE_KEYS = ['50', '100', '200', '300', '400', '500', '600', '700', '800', '900', '950'] as const;

const SPECIAL_COLORS = ['white', 'black', 'transparent'] as const;

export type TailwindColorToken = {
  family: string;
  shade: string | null;
};

/** Normalizes user hex input for stable palette matching. */
export const normalizeHexColor = (raw: string): string | null => {
  const trimmed = raw.trim().toLowerCase();
  if (!trimmed) return null;
  if (trimmed === 'transparent') return 'transparent';

  const withHash = trimmed.startsWith('#') ? trimmed : `#${trimmed}`;
  const short = withHash.match(/^#([0-9a-f]{3})$/);
  if (short) {
    const [r, g, b] = short[1]!.split('');
    return `#${r}${r}${g}${g}${b}${b}`;
  }

  if (/^#[0-9a-f]{6}$/.test(withHash)) return withHash;
  return null;
};

const readTokenHex = (family: string, shade?: string): string | null => {
  const colorGroup = (tokenColors as Record<string, unknown>)[family];
  if (!colorGroup) return null;
  if (typeof colorGroup === 'string') return colorGroup;
  if (shade && typeof colorGroup === 'object' && colorGroup !== null) {
    const shadeValue = (colorGroup as Record<string, unknown>)[shade];
    if (typeof shadeValue === 'string' && !shadeValue.startsWith('var(')) return shadeValue;
  }
  return null;
};

/**
 * Maps a stored hex back to a Tailwind palette family and shade for swatch highlighting.
 */
export const resolveTailwindColorToken = (hex: string | undefined): TailwindColorToken | null => {
  const normalized = normalizeHexColor(hex ?? '');
  if (!normalized) return null;

  for (const name of SPECIAL_COLORS) {
    const candidate = readTokenHex(name);
    if (candidate && normalizeHexColor(candidate) === normalized) {
      return { family: name, shade: null };
    }
  }

  for (const family of COLOR_FAMILIES) {
    for (const shade of SHADE_KEYS) {
      const candidate = readTokenHex(family, shade);
      if (candidate && normalizeHexColor(candidate) === normalized) {
        return { family, shade };
      }
    }
  }

  return null;
};
