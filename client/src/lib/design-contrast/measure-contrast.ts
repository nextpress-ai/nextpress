import { parseColor } from './parse-color';
import type {
  ColorRole,
  ContrastLevel,
  ContrastMeasurement,
  MeasureContrastParams,
  Rgb,
} from './types';

const LEVEL_TARGETS: Record<ContrastLevel, number> = {
  'aa-normal': 4.5,
  'aa-large': 3,
  'aa-ui': 3,
};

const linearize = (channel: number): number => {
  const c = channel / 255;
  return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
};

/** WCAG 2.1 relative luminance for sRGB. */
export const relativeLuminance = ({ r, g, b }: Rgb): number =>
  0.2126 * linearize(r) + 0.7152 * linearize(g) + 0.0722 * linearize(b);

/** Contrast ratio between two colors (always >= 1). */
export const contrastRatio = (a: string, b: string): number | null => {
  const colorA = parseColor(a);
  const colorB = parseColor(b);
  if (!colorA || !colorB) return null;

  const lumA = relativeLuminance(colorA.rgb);
  const lumB = relativeLuminance(colorB.rgb);
  const lighter = Math.max(lumA, lumB);
  const darker = Math.min(lumA, lumB);

  return (lighter + 0.05) / (darker + 0.05);
};

export const measureContrast = ({
  foreground,
  background,
  level = 'aa-normal',
}: MeasureContrastParams): ContrastMeasurement | null => {
  const ratio = contrastRatio(foreground, background);
  if (ratio === null) return null;

  const fg = parseColor(foreground);
  const bg = parseColor(background);
  if (!fg || !bg) return null;

  const fgLum = relativeLuminance(fg.rgb);
  const bgLum = relativeLuminance(bg.rgb);
  const targetRatio = LEVEL_TARGETS[level];

  return {
    ratio: Number(ratio.toFixed(2)),
    passes: ratio >= targetRatio,
    targetRatio,
    level,
    lighter: fgLum >= bgLum ? 'foreground' : 'background',
    darker: fgLum >= bgLum ? 'background' : 'foreground',
  };
};

/** Picks which color to adjust for readable UI given contrast direction. */
export const pickAdjustRole = ({
  preferAdjust,
  level,
}: {
  preferAdjust: ColorRole | 'auto';
  level: ContrastLevel;
}): ColorRole => {
  if (preferAdjust !== 'auto') return preferAdjust;
  return level === 'aa-ui' ? 'background' : 'foreground';
};
