import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { render, screen, fireEvent } from '@testing-library/react';
import { afterEach, beforeAll, describe, expect, it, vi } from 'vitest';
import type { BlockConfig } from '@shared/schema-types';
// Load the renderer entry first: the renderer modules import each other through the block table.
import { getBlockComponent } from '../../../renderer/react/render-helpers';
import {
  buildPopupCss,
  collectPopups,
  readPopupContent,
  readPopupSlugFromHref,
  slugifyPopupName,
} from '@shared/popup-model';
import { initPopups, openPopup } from '@shared/popup-runtime';
import { validateContentForSave } from '@shared/validate-content-save';
import { getDefaultBlock } from '@/components/PageBuilder/blocks';
import { EditorPopupsProvider, PopupLinkPicker } from '@/components/PageBuilder/popup-links';
import { PopupSettings } from '@/components/PageBuilder/blocks/popup/popup-settings';

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

const popup = (id: string, data: Record<string, string | number | boolean>, children: BlockConfig[] = []): BlockConfig => ({
  id,
  name: 'core/popup',
  type: 'container',
  parentId: null,
  label: 'Popup',
  category: 'layout',
  content: { kind: 'structured', data },
  styles: { padding: '0', display: 'flex', flexDirection: 'column', alignItems: 'center' },
  settings: {},
  children,
});

const renderPublished = (block: BlockConfig): string => {
  const Component = getBlockComponent(block.name);
  if (!Component) throw new Error(`No published renderer for ${block.name}`);
  return renderToStaticMarkup(<Component {...block} />);
};

beforeAll(() => {
  // jsdom has <dialog> but not its modal methods; stand-ins keep the real open/close contract.
  HTMLDialogElement.prototype.showModal = function showModal(this: HTMLDialogElement) {
    this.setAttribute('open', '');
  };
  HTMLDialogElement.prototype.close = function close(this: HTMLDialogElement) {
    this.removeAttribute('open');
    this.dispatchEvent(new Event('close'));
  };
});

describe('popup model', () => {
  it('makes link names from popup names and keeps only safe ones', () => {
    expect(slugifyPopupName('Get updates!')).toBe('get-updates');
    expect(slugifyPopupName('***')).toBe('popup');
    expect(readPopupContent({ kind: 'structured', data: { name: 'Get updates', slug: 'Bad Slug' } }).slug).toBe('get-updates');
    expect(readPopupSlugFromHref('#popup-get-updates')).toBe('get-updates');
    expect(readPopupSlugFromHref('/contact')).toBeUndefined();
  });

  it('drops unsafe looks and clamps the blur', () => {
    const content = readPopupContent({
      kind: 'structured',
      data: { background: 'red;}body{', radius: 'calc(1px)', backdropBlur: 99, size: 'huge' },
    });
    expect(content).toMatchObject({ background: undefined, radius: '12px', backdropBlur: 24, size: 'md' });
  });

  it('styles the dialog like the editor dialog and respects reduced motion', () => {
    const css = buildPopupCss({ blockId: 'p1', content: readPopupContent(undefined) });
    expect(css).toContain('dialog.np-popup.block-p1::backdrop{background:rgb(0 0 0 / 0.5);}');
    expect(css).toContain('width:min(32rem,calc(100vw - 2rem))');
    expect(css).toContain('@media (prefers-reduced-motion: no-preference){');
    expect(css).toContain('np-popup-in-scale 200ms');
  });

  it('lists every popup in the tree and is accepted on save', () => {
    const tree = [{ ...popup('outer', {}), children: [popup('inner', { name: 'Get updates' })] }];
    expect(collectPopups(tree).map((p) => p.slug)).toEqual(['popup', 'get-updates']);
    expect(validateContentForSave({ blocks: tree, other: {}, contentType: 'page' }).ok).toBe(true);
  });
});

describe('published popup', () => {
  it('is a closed dialog named for screen readers, with the block styles on the card', () => {
    const html = renderPublished(popup('p1', { name: 'Get updates', slug: 'get-updates' }, [paragraph('t', 'Join us', 'p1')]));
    expect(html).toMatch(/^<dialog class="np-popup[^"]*block-p1/);
    expect(html).toContain('data-np-popup="get-updates"');
    expect(html).toContain('aria-label="Get updates"');
    expect(html).not.toContain(' open=');
    // Layout goes on the card; the block's own padding does not override the popup's padding setting.
    expect(html).toContain('<div class="np-popup__panel" style="display:flex;flex-direction:column;align-items:center">');
    expect(html).toContain('aria-label="Close"');
    expect(html).toContain('Join us');
  });

  it('can leave out the close button', () => {
    expect(renderPublished(popup('p2', { closeButton: false }))).not.toContain('np-popup__close');
  });
});

describe('opening and closing', () => {
  let stop: () => void = () => {};
  afterEach(() => {
    stop();
    document.body.innerHTML = '';
    history.replaceState(null, '', '/');
  });

  const mount = () => {
    document.body.innerHTML = `
      <a href="#popup-get-updates" id="trigger">Get updates</a>
      <a href="#popup-missing" id="missing">Missing</a>
      <dialog class="np-popup" data-np-popup="get-updates" data-close-on-backdrop="true">
        <div class="np-popup__panel"><button data-np-popup-close>x</button><p>Inside</p></div>
      </dialog>`;
    stop = initPopups();
    return document.querySelector('dialog') as HTMLDialogElement;
  };

  it('opens from its link, stops the page scrolling, and closes from the close button', () => {
    const dialog = mount();
    const click = new MouseEvent('click', { bubbles: true, cancelable: true });
    document.getElementById('trigger')?.dispatchEvent(click);
    expect(click.defaultPrevented).toBe(true);
    expect(dialog.open).toBe(true);
    expect(document.documentElement.style.overflow).toBe('hidden');

    (document.querySelector('[data-np-popup-close]') as HTMLElement).click();
    expect(dialog.open).toBe(false);
  });

  it('lets the page scroll again once closed, even without a close event', async () => {
    const dialog = mount();
    openPopup('get-updates');
    expect(document.documentElement.style.overflow).toBe('hidden');
    dialog.removeAttribute('open');
    await Promise.resolve();
    expect(document.documentElement.style.overflow).toBe('');
  });

  it('closes from a click on the backdrop but not from a click inside the card', () => {
    const dialog = mount();
    openPopup('get-updates');
    (document.querySelector('.np-popup__panel p') as HTMLElement).click();
    expect(dialog.open).toBe(true);
    dialog.click();
    expect(dialog.open).toBe(false);
  });

  it('leaves links to popups that do not exist alone', () => {
    mount();
    const click = new MouseEvent('click', { bubbles: true, cancelable: true });
    document.getElementById('missing')?.dispatchEvent(click);
    expect(click.defaultPrevented).toBe(false);
  });

  it('opens when the page address ends with the popup link', () => {
    history.replaceState(null, '', '/#popup-get-updates');
    const dialog = mount();
    expect(dialog.open).toBe(true);
  });
});

describe('popups in the editor', () => {
  it('starts with a heading and a line of text', () => {
    const block = getDefaultBlock('core/popup', 'new-popup');
    expect(block?.children?.map((child) => child.name)).toEqual(['core/heading', 'core/paragraph']);
  });

  it('offers the page popups under a link field and writes the link', () => {
    const onChange = vi.fn();
    const blocks = [popup('p1', { name: 'Get updates', slug: 'get-updates' })];
    const { rerender } = render(
      <EditorPopupsProvider blocks={blocks}>
        <PopupLinkPicker id="link" value="#popup-gone" onChange={onChange} />
      </EditorPopupsProvider>,
    );
    expect(screen.getByText(/No popup on this page is called/)).toBeInTheDocument();
    rerender(
      <EditorPopupsProvider blocks={[]}>
        <PopupLinkPicker id="link" value="" onChange={onChange} />
      </EditorPopupsProvider>,
    );
    expect(screen.queryByText('Or open a popup')).not.toBeInTheDocument();
  });

  it('warns when two popups share a link, and the link follows the name', () => {
    const onUpdate = vi.fn();
    const first = popup('p1', { name: 'Get updates', slug: 'get-updates' });
    const second = popup('p2', { name: 'Other', slug: 'get-updates' });
    render(
      <EditorPopupsProvider blocks={[first, second]}>
        <PopupSettings block={first} onUpdate={onUpdate} />
      </EditorPopupsProvider>,
    );
    expect(screen.getByText(/Another popup on this page uses this link/)).toBeInTheDocument();
    fireEvent.change(screen.getByLabelText('Name'), { target: { value: 'Join the list' } });
    const data = (onUpdate.mock.calls.at(-1)?.[0].content as { data: { slug: string } }).data;
    expect(data.slug).toBe('join-the-list');
  });
});

describe('popup padding', () => {
  it('accepts CSS-style padding with up to four sides', () => {
    expect(readPopupContent({ kind: 'structured', data: { padding: '36px 28px 28px' } }).padding).toBe('36px 28px 28px');
    expect(readPopupContent({ kind: 'structured', data: { padding: '1px 2px 3px 4px 5px' } }).padding).toBe('24px');
  });
});
