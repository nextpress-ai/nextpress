import { describe, it, expect } from 'vitest';
import {
  getEntryAnimationAttributes,
  generateBlockAnimationCSS,
  generateHoverAnimationCSS,
  generateLoopAnimationCSS,
} from '@shared/animation-utils';
import type { BlockAnimation, EntryAnimation } from '@shared/schema-types';

describe('Shared Animation Utils', () => {
  it('getEntryAnimationAttributes generates scroll observer attributes', () => {
    const entry: EntryAnimation = { name: 'fadeInUp', duration: 800, delay: 200, once: false };
    const attrs = getEntryAnimationAttributes(entry);
    expect(attrs).toEqual({
      'data-np-entry': 'fadeInUp',
      'data-np-entry-duration': '800',
      'data-np-entry-delay': '200',
      'data-np-entry-once': 'false',
    });
  });

  it('generateBlockAnimationCSS generates combined hover+loop CSS', () => {
    const animation: BlockAnimation = {
      entry: { name: 'fadeIn' },
      hover: { name: 'tada' },
      loop: { name: 'heartBeat' },
    };
    const css = generateBlockAnimationCSS('abc', animation);
    expect(css).toContain('.block-abc:hover');
    expect(css).toContain('tada');
    expect(css).toContain('.block-abc.np-entry-played');
    expect(css).toContain('heartBeat');
    expect(css).toContain('infinite');
  });

  it('generateHoverAnimationCSS generates correct rule', () => {
    expect(generateHoverAnimationCSS('x', { name: 'wobble' })).toBe(
      '.block-x:hover { animation: wobble 1s both; }'
    );
  });

  it('generateLoopAnimationCSS scopes to np-entry-played when hasEntry', () => {
    expect(generateLoopAnimationCSS('y', { name: 'swing' }, true)).toBe(
      '.block-y.np-entry-played { animation: swing 1s infinite both; }'
    );
  });

  it('generateBlockAnimationCSS can disable loop scoping for editor canvas', () => {
    const animation: BlockAnimation = {
      entry: { name: 'fadeIn' },
      loop: { name: 'heartBeat' },
    };
    const css = generateBlockAnimationCSS('abc', animation, {
      scopeLoopAfterEntry: false,
    });
    expect(css).toContain('.block-abc { animation: heartBeat 1s infinite both; }');
    expect(css).not.toContain('.np-entry-played');
  });
});
