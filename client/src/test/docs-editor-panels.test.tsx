import { cleanup, fireEvent, screen, waitFor, within } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { DocsTree } from '@shared/docs';
import { findNavItemByHref, previewPagesFromTree } from '@/components/PageBuilder/docs-mode/docs-nav-model';
import { buildPagePaths } from '@shared/page-paths';
import { docsPageBlocks, docsSummary, docsTree, makePage, renderEditor, SITE_ID, treeItem } from './docs-editor-harness';

vi.setConfig({ testTimeout: 30_000 });
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
vi.mock('@/components/PageBuilder/PublishBlockStyles', () => ({ PublishBlockStyles: () => null }));

class ResizeObserverStub {
  observe(): void {}
  unobserve(): void {}
  disconnect(): void {}
}

beforeEach(() => {
  window.HTMLElement.prototype.scrollIntoView = vi.fn();
  vi.stubGlobal('ResizeObserver', ResizeObserverStub);
  window.history.replaceState(null, '', '/admin/page-builder/page/p-docs');
});
afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

/**
 * Acme Docs with the page being edited (Quickstart) in it, next to Install. Address parts match the
 * addresses, as they always do in real docs: the canvas builds its links from the parts.
 */
const treeWithQuickstart = (): DocsTree => {
  const tree = docsTree();
  const group = tree.home.children[0];
  return {
    ...tree,
    home: {
      ...tree.home,
      slug: 'docs',
      children: [
        {
          ...group,
          slug: 'getting-started',
          children: [treeItem({ id: 'p-docs', title: 'Quickstart', slug: 'quickstart', parentId: 'group-1', path: '/docs/getting-started/quickstart' }), ...group.children],
        },
        ...tree.home.children.slice(1),
      ],
    },
  };
};

const openQuickstart = (routes = {}) =>
  renderEditor({ page: makePage({ id: 'p-docs', title: 'Quickstart', blocks: docsPageBlocks() }), tree: treeWithQuickstart(), routes });

describe('the Pages tab', () => {
  it('is the tab the rail opens on, with the docs it belongs to and its pages, the open one marked', async () => {
    openQuickstart();
    const pages = await screen.findByTestId('docs-pages-panel');

    expect(screen.getByRole('tab', { name: 'Pages', selected: true })).toBeInTheDocument();
    expect(await within(pages).findByRole('button', { name: /Acme Docs\. Switch docs or set up new docs/ })).toBeInTheDocument();
    await within(pages).findByRole('button', { name: 'Install' });
    expect(within(pages).getByRole('button', { name: 'Quickstart' })).toHaveAttribute('aria-current', 'page');
    expect(within(pages).getByRole('button', { name: 'Install' })).not.toHaveAttribute('aria-current');
    expect(within(pages).getByRole('button', { name: 'Page' })).toBeInTheDocument();
    expect(within(pages).getByRole('button', { name: 'Group' })).toBeInTheDocument();
  });

  it('remembers the tab chosen last, in this browser', async () => {
    const first = openQuickstart();
    await first.user.click(await screen.findByRole('tab', { name: 'Blocks' }));
    expect(localStorage.getItem('npb:docs-editor:rail-tab')).toBe('blocks');
  });

  it('opens a page of the tree in the editor', async () => {
    const { user } = openQuickstart();
    const pages = await screen.findByTestId('docs-pages-panel');

    await user.click(await within(pages).findByRole('button', { name: 'Install' }));

    expect(window.location.pathname).toBe('/admin/page-builder/page/install');
  });

  it('lists the other docs of the site and offers to set up new ones', async () => {
    const { user } = openQuickstart({
      'GET /api/docs?*': { json: { docs: [docsSummary(), docsSummary({ homeId: 'home-2', name: 'API Reference', path: '/api' })] } },
    });
    const pages = await screen.findByTestId('docs-pages-panel');

    await user.click(within(pages).getByRole('button', { name: /Switch docs or set up new docs/ }));
    const menu = await screen.findByRole('menu');
    expect(within(menu).getByRole('menuitem', { name: /Acme Docs/ })).toBeInTheDocument();
    expect(within(menu).getByRole('menuitem', { name: 'Set up new docs' })).toBeInTheDocument();

    await user.click(within(menu).getByRole('menuitem', { name: 'API Reference' }));
    expect(window.location.pathname).toBe('/admin/page-builder/page/home-2');
  });
});

describe('the docs frame on the canvas', () => {
  const sidebarLink = (title: string): HTMLAnchorElement => {
    const link = Array.from(document.querySelectorAll<HTMLAnchorElement>('.np-docs__sidebar a[href]')).find((anchor) => anchor.textContent?.trim() === title);
    if (!link) throw new Error(`no sidebar link ${title}`);
    return link;
  };

  it('opens a page when its link in the sidebar is clicked, as it would for a visitor', async () => {
    openQuickstart();
    // The docs' pages have arrived once the Pages tab lists them.
    await within(await screen.findByTestId('docs-pages-panel')).findByRole('button', { name: 'Install' });
    await waitFor(() => sidebarLink('Install'));

    fireEvent.click(sidebarLink('Install'));

    expect(window.location.pathname).toBe('/admin/page-builder/page/install');
  });

  it('opens Docs → Header when the top bar is clicked, and the Pages tab when the sidebar around the links is', async () => {
    const { user } = openQuickstart();
    await user.click(await screen.findByRole('tab', { name: 'Blocks' }));
    await waitFor(() => expect(document.querySelector('.np-dshell__bar')).not.toBeNull());

    fireEvent.click(document.querySelector('.np-dshell__bar')!);
    expect(await screen.findByRole('tab', { name: 'Docs', selected: true })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Header' })).toHaveAttribute('aria-expanded', 'true');

    fireEvent.click(document.querySelector('.np-docs__sidebar')!);
    expect(await screen.findByRole('tab', { name: 'Pages', selected: true })).toBeInTheDocument();
  });

  it('marks where a dragged block lands with a line, and leaves the page where it is', async () => {
    const { user } = openQuickstart();
    await user.click(await screen.findByRole('tab', { name: 'Blocks' }));
    const library = await screen.findByTestId('docs-block-library');
    const column = document.querySelector<HTMLElement>('.wp-block-docs-page [data-rfd-droppable-id]');
    if (!column) throw new Error('no docs page column');
    vi.spyOn(document, 'elementFromPoint').mockReturnValue(column);

    fireEvent.mouseDown(within(library).getByRole('button', { name: 'Callout' }), { clientX: 5, clientY: 5 });
    fireEvent.mouseMove(document, { clientX: 300, clientY: 300 });

    await waitFor(() => expect(column.querySelectorAll('[data-drop-line]')).toHaveLength(1));
    // No bar is put between the blocks, so nothing on the page moves while the pointer does.
    expect(column.querySelector('.border-dashed')).toBeNull();
    fireEvent.mouseUp(document, { clientX: 300, clientY: 300 });
  });
});

describe('the right panel', () => {
  it('has Page and Docs; Docs holds the docs-wide settings and no second copy of the page tree', async () => {
    const { user } = openQuickstart();

    expect(await screen.findByRole('tab', { name: 'Page', selected: true })).toBeInTheDocument();
    expect(screen.getByRole('textbox', { name: 'Title' })).toHaveValue('Quickstart');

    await user.click(screen.getByRole('tab', { name: 'Docs' }));
    const docsTab = screen.getByRole('tabpanel', { name: 'Docs' });
    for (const section of ['Header', 'Search', 'Features', 'Address']) {
      expect(within(docsTab).getByRole('button', { name: section })).toBeInTheDocument();
    }
    expect(within(docsTab).queryByRole('button', { name: 'Navigation' })).toBeNull();
  });
});

describe('the canvas sidebar of docs on an address of their own', () => {
  it('links pages from the site root, as the published page does', () => {
    const home = { ...treeWithQuickstart().home, ownAddress: true };
    const pages = previewPagesFromTree(home);
    expect(buildPagePaths(pages).get('p-docs')).toBe('getting-started/quickstart');
  });
});

describe('finding the page a canvas link points to', () => {
  const home = treeWithQuickstart().home;

  it('matches by address, with or without a closing slash or the site in front', () => {
    expect(findNavItemByHref({ home, href: '/docs/getting-started/install' })?.id).toBe('install');
    expect(findNavItemByHref({ home, href: '/docs/getting-started/install/' })?.id).toBe('install');
    expect(findNavItemByHref({ home, href: 'https://acme.com/docs/getting-started/quickstart' })?.id).toBe('p-docs');
    expect(findNavItemByHref({ home, href: '/docs' })?.id).toBe('home-1');
  });

  it('finds nothing for a group or a link that leaves the docs', () => {
    expect(findNavItemByHref({ home, href: '/docs/group-1' })).toBeNull();
    expect(findNavItemByHref({ home, href: '/pricing' })).toBeNull();
  });
});

describe('writing in the docs editor', () => {
  it('types like a document: the field opens focused, "## " makes a heading, Enter a new paragraph, "/" a block', async () => {
    const { user } = openQuickstart();
    const paragraph = await waitFor(() => {
      const found = document.querySelector<HTMLElement>('.np-docs__content .wp-block-paragraph');
      if (!found) throw new Error('no paragraph on the canvas yet');
      return found;
    });

    await user.dblClick(paragraph);
    const field = await screen.findByRole('textbox', { name: 'Paragraph text' });
    await waitFor(() => expect(field).toHaveFocus());

    await user.clear(field);
    await user.keyboard('## ');
    // The heading's settings panel has a field of the same name; the one that is typed in sits in the page.
    const headingField = await within(document.querySelector<HTMLElement>('.np-docs__content') as HTMLElement).findByRole('textbox', { name: 'Heading text' });
    await waitFor(() => expect(headingField).toHaveFocus());
    await user.keyboard('Setup');
    expect(headingField).toHaveValue('Setup');

    await user.keyboard('{Enter}');
    const next = await screen.findByRole('textbox', { name: 'Paragraph text' });
    await waitFor(() => expect(next).toHaveFocus());

    await user.keyboard('/call');
    const menu = await screen.findByRole('listbox', { name: 'Docs blocks' });
    expect(within(menu).getByRole('option', { name: /Callout/, selected: true })).toBeInTheDocument();
    await user.keyboard('{Enter}');

    await waitFor(() => expect(document.querySelector('.np-docs__content .wp-block-callout')).not.toBeNull());
    expect(document.querySelector('.np-docs__content h2')?.textContent).toContain('Setup');
  });
});
