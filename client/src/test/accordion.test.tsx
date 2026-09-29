import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { render, screen, fireEvent } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import type { BlockConfig } from '@shared/schema-types';
// Load the renderer entry first: the renderer modules import each other through the block table.
import { getBlockComponent } from '../../../renderer/react/render-helpers';
import {
  buildAccordionCss,
  buildFaqJsonLd,
  readAccordionContent,
  resolveAccordionIcons,
} from '@shared/accordion-model';
import { blockExtraCss } from '@shared/block-extra-css';
import { validateContentForSave } from '@shared/validate-content-save';
import { BlockActionsProvider, type BlockActionsContextValue } from '@/components/PageBuilder/BlockActionsContext';
import { blockRegistry, getDefaultBlock } from '@/components/PageBuilder/blocks';
import { AccordionSettings } from '@/components/PageBuilder/blocks/accordion/accordion-settings';

const stubActions: BlockActionsContextValue = {
  selectedBlockId: null,
  editingBlockId: null,
  hoveredBlockId: null,
  onSelect: () => {},
  onStartEditing: () => {},
  onStopEditing: () => {},
  onHoverBlock: () => {},
  onDuplicate: () => {},
  onDelete: () => {},
  hoverHighlight: null,
};

const paragraph = (id: string, text: string, parentId: string): BlockConfig => ({
  id,
  name: 'core/paragraph',
  type: 'block',
  parentId,
  label: 'Paragraph',
  category: 'basic',
  content: { kind: 'text', value: text },
  styles: {},
  settings: {},
});

const item = (id: string, title: string, answer: string, open = false): BlockConfig => ({
  id,
  name: 'core/accordion-item',
  type: 'container',
  parentId: 'acc',
  label: 'Accordion item',
  category: 'layout',
  content: { kind: 'structured', data: { title, open } },
  styles: {},
  settings: {},
  children: [paragraph(`${id}-p`, answer, id)],
});

const accordion = (data: Record<string, string | boolean | object>, children: BlockConfig[]): BlockConfig => ({
  id: 'acc',
  name: 'core/accordion',
  type: 'container',
  parentId: null,
  label: 'Accordion',
  category: 'layout',
  content: { kind: 'structured', data },
  styles: {},
  settings: {},
  children,
});

const renderPublished = (block: BlockConfig): string => {
  const Component = getBlockComponent(block.name);
  if (!Component) throw new Error(`No published renderer for ${block.name}`);
  return renderToStaticMarkup(<Component {...block} />);
};

const faqItems = [
  item('q1', 'How does NextPress work?', 'It rebuilds WordPress in JavaScript.'),
  item('q2', 'Is it free?', 'Yes, hosting is not.'),
];

describe('accordion model', () => {
  it('fills defaults and drops unsafe values', () => {
    const content = readAccordionContent({
      kind: 'structured',
      data: { look: 'neon', gap: '1px;}body{', itemBackground: 'url(evil)', titleWeight: '650', icon: { size: '24px' } },
    });
    expect(content.look).toBe('cards');
    expect(content.gap).toBe('12px');
    expect(content.itemBackground).toBeUndefined();
    expect(content.titleWeight).toBe('500');
    expect(content.icon.size).toBe('24px');
    expect(content.openMode).toBe('one');
  });

  it('turns a single custom icon and swaps a pair', () => {
    const closed = { iconSet: 'lucide', iconName: 'circle' };
    const open = { iconSet: 'lucide', iconName: 'x' };
    const base = readAccordionContent(undefined).icon;
    expect(resolveAccordionIcons({ ...base, preset: 'custom', closed }).motion).toBe('turn');
    expect(resolveAccordionIcons({ ...base, preset: 'custom', closed, open }).motion).toBe('swap');
    expect(resolveAccordionIcons({ ...base, preset: 'chevron' })).toMatchObject({ motion: 'turn', turn: 180 });
  });

  it('writes CSS that works on both the canvas and the published page', () => {
    const css = buildAccordionCss({ blockId: 'acc', content: readAccordionContent(undefined) });
    expect(css).toContain(':is(.block-acc.np-accordion,.block-acc .np-accordion)');
    expect(css).toContain('.np-accordion__item:is([open],[data-open="true"]) .np-accordion__icon-closed');
    expect(css).toContain('::-webkit-details-marker{display:none}');
    expect(blockExtraCss(accordion({}, []))).toContain('.np-accordion__title');
  });

  it('builds FAQ data that cannot break out of its script tag', () => {
    const json = buildFaqJsonLd([item('x', 'What about </script>?', 'Safe <b>answer</b>')]);
    expect(json).not.toContain('</script>');
    const parsed = JSON.parse(json.replace(/\\u003c/g, '<'));
    expect(parsed.mainEntity[0]).toMatchObject({ name: 'What about </script>?', acceptedAnswer: { text: 'Safe answer' } });
  });

  it('is accepted when saving a page', () => {
    const result = validateContentForSave({ blocks: [accordion({}, faqItems)], other: {}, contentType: 'page' });
    expect(result.ok).toBe(true);
  });
});

describe('published accordion', () => {
  it('uses details and summary, opens the first item and groups them for one-at-a-time', () => {
    const html = renderPublished(accordion({}, faqItems));
    expect(html.match(/<details/g)).toHaveLength(2);
    expect(html).toContain('name="np-accordion-acc"');
    expect(html).toMatch(/<details[^>]*open=""[^>]*>.*How does NextPress work\?/);
    expect(html).toContain('<summary class="np-accordion__title">');
    expect(html).toContain('It rebuilds WordPress in JavaScript.');
    expect(html).not.toContain('application/ld+json');
  });

  it('lets many open when asked, and adds FAQ data only when switched on', () => {
    const html = renderPublished(accordion({ openMode: 'many', firstOpen: false, faqSchema: true }, faqItems));
    expect(html).not.toContain('name="np-accordion-acc"');
    expect(html).not.toMatch(/<details[^>]*open=""/);
    expect(html).toContain('<script type="application/ld+json">');
    expect(html).toContain('"name":"Is it free?"');
  });

  it('keeps any other block dropped into the accordion', () => {
    const html = renderPublished(accordion({}, [...faqItems, paragraph('extra', 'A note under the questions', 'acc')]));
    expect(html).toContain('A note under the questions');
  });
});

describe('accordion in the editor', () => {
  it('starts with three items, each with an answer', () => {
    const block = getDefaultBlock('core/accordion', 'new-acc');
    expect(block?.children).toHaveLength(3);
    expect(block?.children?.[0]).toMatchObject({ name: 'core/accordion-item', parentId: 'new-acc' });
    expect(block?.children?.[0].children?.[0]).toMatchObject({ name: 'core/paragraph' });
  });

  it('shows the first answer open and opens another from its icon', () => {
    const Component = blockRegistry['core/accordion'].component as React.ComponentType<{
      value: BlockConfig;
      onChange: (next: BlockConfig) => void;
      isPreview?: boolean;
    }>;
    render(
      <BlockActionsProvider value={stubActions}>
        <Component value={accordion({}, faqItems)} onChange={() => {}} isPreview />
      </BlockActionsProvider>,
    );
    expect(screen.getByText('It rebuilds WordPress in JavaScript.')).toBeInTheDocument();
    expect(screen.queryByText('Yes, hosting is not.')).not.toBeInTheDocument();
    fireEvent.click(screen.getAllByRole('button', { name: 'Open this item on the canvas' })[0]);
    expect(screen.getByText('Yes, hosting is not.')).toBeInTheDocument();
  });

  it('adds an item from the settings panel', () => {
    const onUpdate = vi.fn();
    render(<AccordionSettings block={accordion({}, faqItems)} onUpdate={onUpdate} />);
    fireEvent.click(screen.getByRole('button', { name: /Add item/ }));
    const children = onUpdate.mock.calls[0][0].children as BlockConfig[];
    expect(children).toHaveLength(3);
    expect(children[2]).toMatchObject({ name: 'core/accordion-item', parentId: 'acc' });
  });
});
