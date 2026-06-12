import { describe, it, expect } from 'vitest';
import {
  parseColor,
  contrastRatio,
  measureContrast,
  suggestContrastAdjustment,
  nearestTailwindStep,
} from '@/lib/design-contrast';

describe('design-contrast', () => {
  it('parses hex and rgb colors', () => {
    expect(parseColor('#fff')?.hex).toBe('#ffffff');
    expect(parseColor('rgb(24, 24, 27)')?.hex).toBe('#18181b');
  });

  it('computes known WCAG contrast ratios', () => {
    expect(contrastRatio('#ffffff', '#000000')).toBe(21);
    expect(contrastRatio('#767676', '#ffffff')).toBeGreaterThan(4.4);
    expect(contrastRatio('#767676', '#ffffff')).toBeLessThan(4.6);
  });

  it('measures pass/fail against WCAG levels', () => {
    const pass = measureContrast({
      foreground: '#18181b',
      background: '#ffffff',
      level: 'aa-normal',
    });
    expect(pass?.passes).toBe(true);

    const fail = measureContrast({
      foreground: '#d4d4d8',
      background: '#ffffff',
      level: 'aa-normal',
    });
    expect(fail?.passes).toBe(false);
  });

  it('suggests darker foreground for muted text on white', () => {
    const suggestion = suggestContrastAdjustment({
      foreground: '#d4d4d8',
      background: '#ffffff',
      level: 'aa-normal',
    });

    expect(suggestion?.passes).toBe(false);
    expect(suggestion?.adjustRole).toBe('foreground');
    expect(suggestion?.tailwind?.direction).toBe('darker');
    expect(suggestion?.tailwind?.fromStep).toBeGreaterThanOrEqual(200);

    const fixed = measureContrast({
      foreground: suggestion!.suggestedHex,
      background: '#ffffff',
      level: 'aa-normal',
    });
    expect(fixed?.passes).toBe(true);
  });

  it('maps hex to nearest tailwind zinc step', () => {
    const step = nearestTailwindStep({ hex: '#71717a', family: 'zinc' });
    expect(step?.family).toBe('zinc');
    expect(step?.step).toBe(500);
  });
});
