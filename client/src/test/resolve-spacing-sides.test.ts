import { describe, expect, it } from 'vitest';
import { resolveSpacingSides, spacingOverlayLength, hasNonZeroSpacing } from '@/lib/resolve-spacing-sides';

describe('resolveSpacingSides', () => {
  it('prefers longhand padding values over shorthand', () => {
    const sides = resolveSpacingSides({
      styles: {
        padding: '8px',
        paddingTop: '24px',
        paddingLeft: '12px',
      },
      prefix: 'padding',
    });

    expect(sides.top).toBe('24px');
    expect(sides.right).toBe('8px');
    expect(sides.bottom).toBe('8px');
    expect(sides.left).toBe('12px');
  });

  it('normalizes empty spacing for canvas overlays', () => {
    expect(spacingOverlayLength('')).toBe('0px');
    expect(spacingOverlayLength('0')).toBe('0px');
    expect(spacingOverlayLength('  24px ')).toBe('24px');
    expect(hasNonZeroSpacing({ top: '', right: '', bottom: '', left: '' })).toBe(false);
    expect(hasNonZeroSpacing({ top: '1rem', right: '', bottom: '', left: '' })).toBe(true);
  });
});
