import { describe, expect, it } from 'vitest';
import { resolveSpacingSides } from '@/lib/resolve-spacing-sides';

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
});
