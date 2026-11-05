import { cleanup, screen, within } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { docsPageBlocks, makePage, plainPageBlocks, renderEditor, SITE_ID } from './docs-editor-harness';

vi.mock('@/hooks/usePageSave', () => ({ usePageSave: () => ({ mutate: vi.fn(), isPending: false }) }));
vi.mock('@/hooks/useContentLists', () => ({
  useContentLists: () => ({ pages: [], templates: [], posts: [], pagesLoading: false, templatesLoading: false, postsLoading: false }),
}));
vi.mock('@/hooks/useActiveSite', () => ({
  useActiveSite: () => ({ activeSiteId: SITE_ID, sites: [] }),
  useOptionalActiveSite: () => ({ activeSiteId: SITE_ID, sites: [] }),
}));
vi.mock('@/components/PageBuilder/EditorBar/BlogMenu', () => ({ BlogMenu: () => null }));
vi.mock('@/components/PageBuilder/EditorBar/PagesMenu', () => ({ PagesMenu: () => null }));
vi.mock('@/components/PageBuilder/EditorBar/DesignMenu', () => ({ DesignMenu: () => null }));
// The published-page CSS uses `:has(> …)`, which jsdom's selector engine cannot parse. Not under test here.
vi.mock('@/components/PageBuilder/PublishBlockStyles', () => ({ PublishBlockStyles: () => null }));

beforeEach(() => {
  window.HTMLElement.prototype.scrollIntoView = vi.fn();
});
afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

describe('which editor a page opens in', () => {
  it('opens a page whose page shell holds a docs shell in the docs editor', async () => {
    renderEditor({ page: makePage({ id: 'p-docs', blocks: docsPageBlocks() }) });

    expect(await screen.findByRole('button', { name: /Acme Docs, Install/ })).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: 'Page' })).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: 'Docs' })).toBeInTheDocument();
    // The page builder's own title box and menus are not here.
    expect(screen.queryByLabelText('Page title')).toBeNull();
    expect(screen.queryByRole('button', { name: /Site settings/ })).toBeNull();
  });

  it('opens any other page in the page builder, with the title box and no docs controls', async () => {
    renderEditor({ page: makePage({ id: 'p-plain', title: 'About', slug: 'about', parentId: null, blocks: plainPageBlocks() }) });

    expect(await screen.findByLabelText('Page title')).toHaveValue('About');
    expect(screen.queryByRole('tab', { name: 'Docs' })).toBeNull();
  });

  it('shows no Docs group in the page builder inserter, and no docs block anywhere in it', async () => {
    renderEditor({ page: makePage({ id: 'p-plain', title: 'About', slug: 'about', parentId: null, blocks: plainPageBlocks() }), wide: true });

    await screen.findByLabelText('Page title');
    const library = await screen.findByTestId('builder-library-panel');
    const groups = within(library).getAllByRole('button').map((button) => button.textContent?.trim());
    expect(groups).toEqual(expect.arrayContaining(['Basic', 'Media', 'Layout', 'Advanced']));
    expect(groups).not.toContain('Docs');
    for (const docsOnly of ['Docs heading', 'Callout', 'Code group', 'File tree', 'Parameters', 'Docs shell', 'Docs page']) {
      expect(within(library).queryByText(docsOnly)).toBeNull();
    }
  });
});
