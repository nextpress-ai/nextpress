import { measureContrast, pickAdjustRole, relativeLuminance } from './measure-contrast';
import { parseColor } from './parse-color';
import {
  buildTailwindScale,
  formatTailwindAdjustment,
  nearestTailwindStep,
  stepTailwindUntilContrast,
} from './tailwind-scales';
import type {
  ColorRole,
  ContrastSuggestion,
  SuggestContrastParams,
} from './types';

const nudgeHex = ({
  hex,
  direction,
  amount = 18,
}: {
  hex: string;
  direction: 'lighter' | 'darker';
  amount?: number;
}): string | null => {
  const parsed = parseColor(hex);
  if (!parsed) return null;

  const factor = direction === 'lighter' ? amount : -amount;
  const next = {
    r: parsed.rgb.r + factor,
    g: parsed.rgb.g + factor,
    b: parsed.rgb.b + factor,
  };

  return parseColor(
    `rgb(${Math.min(255, Math.max(0, next.r))}, ${Math.min(255, Math.max(0, next.g))}, ${Math.min(255, Math.max(0, next.b))})`
  )?.hex ?? null;
};

const roleColor = ({
  role,
  foreground,
  background,
}: {
  role: ColorRole;
  foreground: string;
  background: string;
}): string => (role === 'foreground' ? foreground : background);

const otherRole = (role: ColorRole): ColorRole =>
  role === 'foreground' ? 'background' : 'foreground';

/**
 * Given foreground + background, returns which color to adjust, a suggested hex,
 * and an optional Tailwind scale step (e.g. gray-400 → gray-600).
 */
export const suggestContrastAdjustment = ({
  foreground,
  background,
  level = 'aa-normal',
  preferAdjust = 'auto',
}: SuggestContrastParams): ContrastSuggestion | null => {
  const measurement = measureContrast({ foreground, background, level });
  if (!measurement) return null;

  if (measurement.passes) {
    return {
      ...measurement,
      adjustRole: pickAdjustRole({ preferAdjust, level }),
      currentHex: foreground,
      suggestedHex: foreground,
      tailwind: null,
      message: `Contrast ${measurement.ratio}:1 meets WCAG ${level} (≥ ${measurement.targetRatio}:1).`,
    };
  }

  const adjustRole = pickAdjustRole({ preferAdjust, level });
  const fixedRole = otherRole(adjustRole);
  const currentHex = roleColor({ role: adjustRole, foreground, background });
  const fixedHex = roleColor({ role: fixedRole, foreground, background });

  const scale = buildTailwindScale();
  const nearest = nearestTailwindStep({ hex: currentHex, scale });

  const meetsRatio = (candidateHex: string): boolean => {
    const fg = adjustRole === 'foreground' ? candidateHex : fixedHex;
    const bg = adjustRole === 'background' ? candidateHex : fixedHex;
    const result = measureContrast({ foreground: fg, background: bg, level });
    return result?.passes ?? false;
  };

  let suggestedHex: string | null = null;
  let tailwind = null;

  const adjustParsed = parseColor(currentHex);
  const fixedParsed = parseColor(fixedHex);

  if (nearest && adjustParsed && fixedParsed) {
    const adjustLum = relativeLuminance(adjustParsed.rgb);
    const fixedLum = relativeLuminance(fixedParsed.rgb);
    const direction: 'lighter' | 'darker' =
      adjustRole === 'foreground'
        ? adjustLum > fixedLum
          ? 'lighter'
          : 'darker'
        : adjustLum > fixedLum
          ? 'darker'
          : 'lighter';

    const stepped = stepTailwindUntilContrast({
      family: nearest.family,
      fromStep: nearest.step,
      direction,
      meetsRatio,
      scale,
    });

    if (stepped) {
      suggestedHex = stepped.hex;
      tailwind = {
        family: nearest.family,
        fromStep: nearest.step,
        toStep: stepped.toStep,
        direction,
        steps: stepped.stepsMoved,
      };
    }
  }

  if (!suggestedHex) {
    const direction: 'lighter' | 'darker' =
      adjustRole === 'foreground' ? 'darker' : 'lighter';
    for (let i = 1; i <= 12; i += 1) {
      const candidate = nudgeHex({
        hex: currentHex,
        direction,
        amount: direction === 'lighter' ? 14 * i : 14 * i,
      });
      if (candidate && meetsRatio(candidate)) {
        suggestedHex = candidate;
        break;
      }
    }
  }

  if (!suggestedHex) {
    suggestedHex = currentHex;
  }

  const tailwindHint = tailwind ? formatTailwindAdjustment(tailwind) : null;
  const message = tailwindHint
    ? `Contrast ${measurement.ratio}:1 fails WCAG ${level}. Adjust ${adjustRole}: ${tailwindHint} (≈ ${suggestedHex}).`
    : `Contrast ${measurement.ratio}:1 fails WCAG ${level}. Adjust ${adjustRole} toward ${suggestedHex}.`;

  return {
    ...measurement,
    adjustRole,
    currentHex,
    suggestedHex,
    tailwind,
    message,
  };
};
