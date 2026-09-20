import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import type { BlockConfig } from '@shared/schema-types';
import { DEFAULT_HEADER_CONTENT } from '@shared/header-model';
// Load the renderer entry first: the header, page shell and block table import each other, and
// the app always enters through the block table.
import { getBlockComponent } from '../../../renderer/react/render-helpers';
import { HeaderBlock } from '../../../renderer/react/layout/header';

const button = (id: string, label: string): BlockConfig => ({
  id,
  name: 'core/button',
  type: 'block',
  label: 'Button',
  category: 'basic',
  content: { kind: 'text', value: label, url: '/go' } as BlockConfig['content'],
  settings: {},
  parentId: 'header-1',
});

const header = (variant: string, children: BlockConfig[] = []): BlockConfig => ({
  id: 'header-1',
  name: 'core/header',
  type: 'container',
  label: 'Header',
  category: 'layout',
  content: { kind: 'structured', data: { ...DEFAULT_HEADER_CONTENT, variant } } as BlockConfig['content'],
  settings: {},
  parentId: null,
  children,
});

describe('header on the published page', () => {
  it('paints child blocks on the right in the blocks layout, with no menu button', () => {
    const html = renderToStaticMarkup(
      <HeaderBlock {...header('brand-and-blocks', [button('b1', 'Contact us'), button('b2', 'Book a call')])} />,
    );
    const right = html.slice(html.indexOf('wp-block-header__slot is-right'));
    expect(right).toContain('wp-block-header__blocks');
    expect(right).toContain('Contact us');
    expect(right).toContain('Book a call');
    expect(right.indexOf('Contact us')).toBeLessThan(right.indexOf('Book a call'));
    expect(html).not.toContain('wp-block-header__mobile-panel');
    expect(html).not.toContain('wp-block-header__burger');
    expect(html).not.toContain('wp-block-header__nav');
  });

  it('shows an empty right side (still no menu) when nothing has been dropped in yet', () => {
    const html = renderToStaticMarkup(<HeaderBlock {...header('brand-and-blocks')} />);
    expect(html).toContain('wp-block-header__blocks');
    expect(html).not.toContain('wp-block-header__burger');
  });

  it('does not paint hidden child blocks in the other layouts, but keeps the menu for links', () => {
    const html = renderToStaticMarkup(
      <HeaderBlock {...header('links-and-actions', [button('b1', 'Stray child')])} />,
    );
    expect(html).not.toContain('Stray child');
    expect(html).toContain('wp-block-header__mobile-panel');
  });

  it('keeps the buttons-only layout menu-free on the live page too', () => {
    const html = renderToStaticMarkup(<HeaderBlock {...header('actions-only')} />);
    expect(html).not.toContain('wp-block-header__burger');
    expect(html).toContain('wp-block-header__actions');
  });

  it('is registered under the name the page tree uses, so SSR finds it', () => {
    expect(getBlockComponent('core/header')).toBeDefined();
    expect(getBlockComponent('core/button')).toBeDefined();
  });
});
