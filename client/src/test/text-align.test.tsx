import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import type { BlockConfig } from '@shared/schema-types';
// Load the renderer entry first: the renderer modules import each other through the block table.
import { getBlockComponent } from '../../../renderer/react/render-helpers';
import {
  moveTextAlignToStyles,
  moveTextAlignToStylesInBlocks,
  readTextAlign,
} from '@shared/text-align';
import { stripVisualContentFromBlocks } from '@shared/strip-visual-content-from-blocks';
import { validateContentForSave } from '@shared/validate-content-save';

const textBlock = ({
  id,
  name,
  content,
  styles,
}: {
  id: string;
  name: string;
  content: Record<string, string | number>;
  styles?: BlockConfig['styles'];
}): BlockConfig => ({
  id,
  name,
  type: 'block',
  parentId: null,
  label: name,
  category: 'basic',
  content: { kind: 'text', value: 'Hello', ...content } as BlockConfig['content'],
  styles: styles ?? {},
  settings: {},
});

const renderPublished = (block: BlockConfig): string => {
  const Component = getBlockComponent(block.name);
  if (!Component) throw new Error(`No published renderer for ${block.name}`);
  return renderToStaticMarkup(<Component {...block} />);
};

describe('readTextAlign', () => {
  it('prefers the style over the old content value', () => {
    expect(
      readTextAlign({ styles: { textAlign: 'center' }, content: { textAlign: 'left' } }),
    ).toBe('center');
  });

  it('falls back to the old content value for pages saved before the move', () => {
    expect(readTextAlign({ styles: {}, content: { textAlign: 'right' } })).toBe('right');
  });

  it('ignores values that are not alignments', () => {
    expect(readTextAlign({ styles: { textAlign: 'sideways' }, content: { textAlign: 'middle' } })).toBeUndefined();
  });
});

describe('moveTextAlignToStyles', () => {
  it('moves the old value into styles and drops it from content', () => {
    const next = moveTextAlignToStyles(
      textBlock({ id: 'h', name: 'core/heading', content: { level: 2, textAlign: 'center' } }),
    );
    expect(next.styles?.textAlign).toBe('center');
    expect(next.content).not.toHaveProperty('textAlign');
    expect(next.content).toMatchObject({ kind: 'text', value: 'Hello', level: 2 });
  });

  it('keeps an alignment already set in the Style tab', () => {
    const next = moveTextAlignToStyles(
      textBlock({
        id: 'p',
        name: 'core/paragraph',
        content: { textAlign: 'left' },
        styles: { textAlign: 'right' },
      }),
    );
    expect(next.styles?.textAlign).toBe('right');
    expect(next.content).not.toHaveProperty('textAlign');
  });

  it('leaves non-text blocks alone', () => {
    const markdown: BlockConfig = {
      ...textBlock({ id: 'm', name: 'core/markdown', content: {} }),
      content: { kind: 'markdown', value: '# Hi', textAlign: 'center' },
    };
    expect(moveTextAlignToStyles(markdown)).toBe(markdown);
  });

  it('walks nested children', () => {
    const group: BlockConfig = {
      ...textBlock({ id: 'g', name: 'core/group', content: {} }),
      type: 'container',
      content: { kind: 'structured', data: {} },
      children: [textBlock({ id: 'q', name: 'core/quote', content: { textAlign: 'center' } })],
    };
    const [next] = moveTextAlignToStylesInBlocks([group]);
    expect(next.children?.[0].styles?.textAlign).toBe('center');
    expect(next.children?.[0].content).not.toHaveProperty('textAlign');
  });
});

describe('saving moves alignment into styles', () => {
  it('server save check returns moved blocks', () => {
    const result = validateContentForSave({
      blocks: [textBlock({ id: 'h', name: 'core/heading', content: { level: 1, textAlign: 'center' } })],
      other: {},
      contentType: 'page',
    });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.blocks[0].styles?.textAlign).toBe('center');
    expect(result.blocks[0].content).not.toHaveProperty('textAlign');
  });

  it('editor save cleanup moves a pullquote value instead of dropping it', () => {
    const [next] = stripVisualContentFromBlocks([
      textBlock({ id: 'pq', name: 'core/pullquote', content: { textAlign: 'right' } }),
    ]);
    expect(next.styles?.textAlign).toBe('right');
    expect(next.content).not.toHaveProperty('textAlign');
  });
});

describe('published pages follow the Style tab', () => {
  it('a heading centred in the Style tab publishes centred, even with an old "left" on content', () => {
    const html = renderPublished(
      textBlock({
        id: 'h',
        name: 'core/heading',
        content: { level: 2, textAlign: 'left' },
        styles: { textAlign: 'center' },
      }),
    );
    expect(html).toContain('text-align:center');
    expect(html).not.toContain('text-align:left');
  });

  it('an old page with alignment only on content still publishes aligned', () => {
    const html = renderPublished(
      textBlock({ id: 'p', name: 'core/paragraph', content: { textAlign: 'right' } }),
    );
    expect(html).toContain('text-align:right');
  });

  it('a quote aligned by its own setting publishes aligned', () => {
    const html = renderPublished({
      ...textBlock({ id: 'q', name: 'core/quote', content: {} }),
      content: { value: '<p>Said</p>', textAlign: 'center' } as BlockConfig['content'],
    });
    expect(html).toContain('text-align:center');
  });
});
