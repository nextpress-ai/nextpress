import { tokenColors } from '@/lib/tailwind-tokens';
import { colorDistance, parseColor } from './parse-color';
import type { TailwindScaleAdjustment, TailwindScaleStep } from './types';

/** Families used for contrast suggestions (neutral + accent). */
export const CONTRAST_SCALE_FAMILIES = ['zinc', 'gray', 'slate', 'blue'] as const;

const SCALE_STEPS = [50, 100, 200, 300, 400, 500, 600, 700, 800, 900, 950] as const;

/** Flat list of Tailwind palette steps resolved from the project config. */
export const buildTailwindScale = (): TailwindScaleStep[] => {
  const steps: TailwindScaleStep[] = [];

  for (const family of CONTRAST_SCALE_FAMILIES) {
    const group = (tokenColors as unknown as Record<string, Record<string, string> | string>)[family];
    if (!group || typeof group === 'string') continue;

    for (const step of SCALE_STEPS) {
      const hex = group[String(step)];
      if (typeof hex === 'string' && hex.startsWith('#')) {
        steps.push({ family, step, hex: hex.toLowerCase() });
      }
    }
  }

  return steps;
};

/** Finds the nearest Tailwind step for a hex color within optional family filter. */
export const nearestTailwindStep = ({
  hex,
  family,
  scale = buildTailwindScale(),
}: {
  hex: string;
  family?: string;
  scale?: TailwindScaleStep[];
}): TailwindScaleStep | null => {
  const parsed = parseColor(hex);
  if (!parsed) return null;

  const candidates = family ? scale.filter((s) => s.family === family) : scale;
  if (candidates.length === 0) return null;

  let best: TailwindScaleStep | null = null;
  let bestDistance = Infinity;

  for (const candidate of candidates) {
    const candidateRgb = parseColor(candidate.hex);
    if (!candidateRgb) continue;
    const distance = colorDistance(parsed.rgb, candidateRgb.rgb);
    if (distance < bestDistance) {
      bestDistance = distance;
      best = candidate;
    }
  }

  return best;
};

/** Steps along a single family until `meetsRatio` returns true or scale ends. */
export const stepTailwindUntilContrast = ({
  family,
  fromStep,
  direction,
  meetsRatio,
  scale = buildTailwindScale(),
}: {
  family: string;
  fromStep: number;
  direction: 'lighter' | 'darker';
  meetsRatio: (hex: string) => boolean;
  scale?: TailwindScaleStep[];
}): { toStep: number; hex: string; stepsMoved: number } | null => {
  const familySteps = scale
    .filter((s) => s.family === family)
    .sort((a, b) => a.step - b.step);

  const startIndex = familySteps.findIndex((s) => s.step === fromStep);
  if (startIndex === -1) return null;

  const indices =
    direction === 'lighter'
      ? familySteps.map((_, i) => i).filter((i) => i <= startIndex).reverse()
      : familySteps.map((_, i) => i).filter((i) => i >= startIndex);

  for (const index of indices) {
    const entry = familySteps[index];
    if (meetsRatio(entry.hex)) {
      return {
        toStep: entry.step,
        hex: entry.hex,
        stepsMoved: Math.abs(index - startIndex),
      };
    }
  }

  return null;
};

export const formatTailwindAdjustment = (
  adjustment: TailwindScaleAdjustment
): string => {
  const sign = adjustment.direction === 'lighter' ? 'lighter' : 'darker';
  return `${adjustment.family}-${adjustment.fromStep} → ${adjustment.family}-${adjustment.toStep} (${sign} by ${adjustment.steps} step${adjustment.steps === 1 ? '' : 's'})`;
};
