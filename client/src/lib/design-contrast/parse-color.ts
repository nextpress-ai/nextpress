import type { ParsedColor, Rgb } from './types';

const HEX_SHORT = /^#?([a-f\d])([a-f\d])([a-f\d])$/i;
const HEX_FULL = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i;
const RGB_FUNC = /^rgba?\(\s*([\d.]+)\s*,\s*([\d.]+)\s*,\s*([\d.]+)/i;

const clampChannel = (value: number): number =>
  Math.min(255, Math.max(0, Math.round(value)));

/** Normalizes arbitrary CSS color strings to hex + RGB channels. */
export const parseColor = (input: string): ParsedColor | null => {
  const trimmed = input.trim();
  if (!trimmed) return null;

  const short = trimmed.match(HEX_SHORT);
  if (short) {
    const r = parseInt(short[1] + short[1], 16);
    const g = parseInt(short[2] + short[2], 16);
    const b = parseInt(short[3] + short[3], 16);
    return toParsed({ r, g, b });
  }

  const full = trimmed.match(HEX_FULL);
  if (full) {
    const r = parseInt(full[1], 16);
    const g = parseInt(full[2], 16);
    const b = parseInt(full[3], 16);
    return toParsed({ r, g, b });
  }

  const rgb = trimmed.match(RGB_FUNC);
  if (rgb) {
    return toParsed({
      r: clampChannel(Number(rgb[1])),
      g: clampChannel(Number(rgb[2])),
      b: clampChannel(Number(rgb[3])),
    });
  }

  return null;
};

const toParsed = ({ r, g, b }: Rgb): ParsedColor => ({
  rgb: { r, g, b },
  hex: `#${[r, g, b].map((c) => c.toString(16).padStart(2, '0')).join('')}`,
});

/** Euclidean RGB distance — used to map arbitrary hex to nearest Tailwind step. */
export const colorDistance = (a: Rgb, b: Rgb): number =>
  Math.sqrt((a.r - b.r) ** 2 + (a.g - b.g) ** 2 + (a.b - b.b) ** 2);
