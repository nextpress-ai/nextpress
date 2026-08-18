import { describe, expect, it } from 'vitest';
import { formatMenuPosition, movePageToMenuPosition } from '@/lib/page-menu-order';

describe('page-menu-order', () => {
  it('formats zero-based menuOrder for display', () => {
    expect(formatMenuPosition(0)).toBe(1);
    expect(formatMenuPosition(4)).toBe(5);
    expect(formatMenuPosition(null)).toBe(1);
  });

  it('moves a page to a one-based target slot', () => {
    const pages = [
      { id: 'a', title: 'A' },
      { id: 'b', title: 'B' },
      { id: 'c', title: 'C' },
    ] as const;

    const next = movePageToMenuPosition({
      pages: [...pages],
      pageId: 'c',
      targetPosition: 1,
    });

    expect(next.map((page) => page.id)).toEqual(['c', 'a', 'b']);
  });
});
