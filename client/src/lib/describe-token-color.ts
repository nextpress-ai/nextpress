import type { TokenEntry } from '@shared/schema-types';
import { resolveTailwindColorToken } from '@/lib/resolve-tailwind-color-token';

export type ColorSummary = {
  /** Short name shown on the collapsed picker row. */
  label: string;
  /** CSS color for the swatch, or null when nothing is set. */
  swatch: string | null;
  isSet: boolean;
};

/**
 * Names the current color for the collapsed picker row: a palette token (`blue-500`),
 * the hex for a custom color, or "Not set". Plain words so nobody has to open the palette
 * just to learn what is applied.
 */
export function describeTokenColor({
  entry,
  styleValue,
}: {
  entry: TokenEntry | undefined;
  styleValue?: string;
}): ColorSummary {
  const tokenName = entry?.value?.trim();
  if (tokenName) {
    const label = entry?.variant ? `${tokenName}-${entry.variant}` : tokenName;
    return { label, swatch: entry?.style?.trim() || null, isSet: true };
  }

  const hex = entry?.style?.trim() || styleValue?.trim();
  if (!hex) return { label: 'Not set', swatch: null, isSet: false };
  // A page-theme variable, e.g. var(--npb-accent, #007cba): it follows the theme, so say so.
  if (hex.startsWith('var(')) return { label: 'Theme', swatch: hex, isSet: true };

  const token = resolveTailwindColorToken(hex);
  if (token) {
    return {
      label: token.shade ? `${token.family}-${token.shade}` : token.family,
      swatch: hex,
      isSet: true,
    };
  }
  return { label: hex.toUpperCase(), swatch: hex, isSet: true };
}
