import { cleanup, fireEvent, screen, waitFor, within } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { BLOCK_CATALOG } from '@shared/block-catalog';
import { buildBlockLibraryCategories, DOCS_FRAME_BLOCKS } from '@/components/PageBuilder/BlockLibrary';
import { blockRegistry } from '@/components/PageBuilder/blocks';
import { buildDocsLibraryCategories, groupDocsBlocks } from '@/components/PageBuilder/docs-mode/docs-library';
import { docsBlockLabel } from '@/components/PageBuilder/docs-mode/docs-block-labels';
import { docsPageBlocks, makePage, renderEditor, SITE_ID } from './docs-editor-harness';

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

/** The block list scrolls in a panel that watches its size; `restoreAllMocks` below would empty the setup's mock, so each test gets its own. */
class ResizeObserverStub {
  observe(): void {}
  unobserve(): void {}
  disconnect(): void {}
}

beforeEach(() => {
  window.HTMLElement.prototype.scrollIntoView = vi.fn();
  vi.stubGlobal('ResizeObserver', ResizeObserverStub);
});
afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

/** The docs group as the shared catalog states it: blocks of the `docs` category and blocks that list themselves in it, minus the frame. */
const catalogDocsGroup = (): string[] =>
  BLOCK_CATALOG.filter((entry) => entry.category === 'docs' || entry.alsoIn?.includes('docs'))
    .map((entry) => entry.name as string)
    .filter((name) => !DOCS_FRAME_BLOCKS.has(name) && name in blockRegistry);

describe('the library builder', () => {
  it('lists exactly the docs group, and only that, for the docs editor', () => {
    const groups = buildBlockLibraryCategories({ mode: 'docs' });

    expect(groups.map((group) => group.id)).toEqual(['docs']);
    expect(groups[0].blocks.map((block) => block.id).sort()).toEqual(catalogDocsGroup().sort());
  });

  it('never offers the docs frame (page shell, docs shell, docs page), in either editor', () => {
    const everywhere = [...buildBlockLibraryCategories({ mode: 'docs' }), ...buildBlockLibraryCategories({ mode: 'page' })].flatMap((group) => group.blocks.map((block) => block.id));

    for (const frame of ['docs/shell', 'docs/page', 'core/docs-layout']) expect(everywhere).not.toContain(frame);
  });

  it('keeps the Docs group and every docs block out of the page builder', () => {
    const groups = buildBlockLibraryCategories({ mode: 'page' });
    const names = groups.flatMap((group) => group.blocks.map((block) => block.id));

    expect(groups.map((group) => group.id)).not.toContain('docs');
    expect(names.filter((name) => name.startsWith('docs/'))).toEqual([]);
    expect(buildBlockLibraryCategories().map((group) => group.id)).toEqual(groups.map((group) => group.id));
  });
});

describe('the docs sections', () => {
  const blocks = buildBlockLibraryCategories({ mode: 'docs' })[0].blocks;

  it('puts every docs block in exactly one section, in a fixed order', () => {
    const sections = groupDocsBlocks(blocks);
    const placed = sections.flatMap((section) => section.blocks.map((block) => block.id));

    expect(placed.sort()).toEqual(blocks.map((block) => block.id).sort());
    expect(new Set(placed).size).toBe(placed.length);
    expect(sections.map((section) => section.id)).toEqual(expect.arrayContaining(['writing', 'callouts', 'code', 'structure']));
    expect(sections[0].id).toBe('writing');
  });

  it('shows a block nobody sorted yet under More, so a new docs block is usable at once', () => {
    const unsorted = { ...blocks[0], id: 'docs/brand-new', label: 'Brand new' };
    const sections = groupDocsBlocks([...blocks, unsorted]);

    expect(sections[sections.length - 1]).toMatchObject({ id: 'more' });
    expect(sections[sections.length - 1].blocks.map((block) => block.id)).toContain('docs/brand-new');
  });

  it('uses the short names of the mockup, as the groups of the shared block list', () => {
    const heading = blocks.find((block) => block.id === 'core/heading')!;
    expect(docsBlockLabel(heading)).toBe('Heading');

    const categories = buildDocsLibraryCategories();
    expect(categories.map((category) => category.id)).toEqual(groupDocsBlocks(blocks).map((section) => section.id));
    const labels = categories.flatMap((category) => category.blocks.map((block) => block.label));
    expect(labels).toEqual(expect.arrayContaining(['Heading', 'Text', 'List', 'Divider', 'Example']));
    expect(labels).not.toContain('Docs text');
    // Only the label changes: each block keeps its own id, so dragging and adding work as before.
    expect(categories.flatMap((category) => category.blocks.map((block) => block.id)).sort()).toEqual(blocks.map((block) => block.id).sort());
  });
});

/** The rail opens on Pages; the blocks are one tab over. */
const openBlocks = async (user: ReturnType<typeof renderEditor>['user']): Promise<HTMLElement> => {
  await user.click(await screen.findByRole('tab', { name: 'Blocks' }));
  return screen.findByTestId('docs-block-library');
};

/** The section headers of the list (each opens and closes, so it carries aria-expanded). */
const sectionNames = (library: HTMLElement): string[] =>
  Array.from(library.querySelectorAll('button[aria-expanded]')).map((button) => button.textContent?.trim() ?? '');

/** The names on the block tiles (each tile is one draggable). */
const tileNames = (library: HTMLElement): string[] =>
  Array.from(library.querySelectorAll('[data-dnd-debug-id]')).map((tile) => tile.textContent?.trim() ?? '');

describe('the inserter in the docs editor', () => {
  it('shows the docs group in foldable sections, as the page builder shows its groups, and no block outside it', async () => {
    const { user } = renderEditor({ page: makePage({ id: 'p-docs', blocks: docsPageBlocks() }) });
    const library = await openBlocks(user);

    const shown = tileNames(library);
    const expected = buildBlockLibraryCategories({ mode: 'docs' })[0].blocks.map((block) => docsBlockLabel(block));
    expect(shown.sort()).toEqual(expected.sort());
    for (const outside of ['Button', 'Columns', 'Form', 'Spacer', 'Docs shell', 'Docs page', 'Post title', 'Header']) {
      expect(shown).not.toContain(outside);
    }
    expect(sectionNames(library)).toEqual(expect.arrayContaining(['Writing', 'Callouts', 'Code', 'Structure']));

    // The rail's "fold all" closes every section, as in the page builder.
    await user.click(screen.getByRole('button', { name: 'Collapse all block groups' }));
    await waitFor(() => expect(tileNames(library)).toEqual([]));
    await user.click(screen.getByRole('button', { name: 'Expand all block groups' }));
    await waitFor(() => expect(tileNames(library).length).toBe(expected.length));
  });

  it('narrows to the blocks that match what is typed, and says so when none do', async () => {
    const { user } = renderEditor({ page: makePage({ id: 'p-docs', blocks: docsPageBlocks() }) });
    const library = await openBlocks(user);

    await user.type(within(library).getByLabelText('Search blocks'), 'table');
    expect(tileNames(library)).toEqual(['Table']);

    await user.clear(within(library).getByLabelText('Search blocks'));
    await user.type(within(library).getByLabelText('Search blocks'), 'zzzz');
    expect(within(library).getByText(/No blocks match/)).toBeInTheDocument();
  });

  it('adds a block when it is clicked, so the keyboard can add blocks too, and picks it', async () => {
    const { user } = renderEditor({ page: makePage({ id: 'p-docs', blocks: docsPageBlocks() }) });
    const library = await openBlocks(user);
    expect(document.querySelector('.wp-block-callout')).toBeNull();

    await user.click(within(library).getByRole('button', { name: 'Callout' }));

    await waitFor(() => expect(document.querySelector('.wp-block-callout')).not.toBeNull());
    expect(screen.getByRole('tab', { name: 'Block', selected: true })).toBeInTheDocument();
  });

  it('lets a block be dragged into the page column but not into the frame around it', async () => {
    const { user } = renderEditor({ page: makePage({ id: 'p-docs', blocks: docsPageBlocks() }) });
    const library = await openBlocks(user);
    const handle = within(library).getByRole('button', { name: 'Callout' });
    const droppable = (name: string) => {
      const frameBlock = document.querySelector(`.wp-block-${name}`);
      if (!frameBlock) throw new Error(`no ${name} on the canvas`);
      return frameBlock.querySelector<HTMLElement>('[data-rfd-droppable-id]');
    };
    const dragOnto = (target: Element | null) => {
      if (!target) throw new Error('nothing to drop on');
      vi.spyOn(document, 'elementFromPoint').mockReturnValue(target);
      fireEvent.mouseDown(handle, { clientX: 5, clientY: 5 });
      fireEvent.mouseMove(document, { clientX: 300, clientY: 300 });
      fireEvent.mouseUp(document, { clientX: 300, clientY: 300 });
    };

    // The docs shell holds the docs page: dropping on it would put a block beside the page, so it takes nothing.
    const shellColumn = document.querySelector<HTMLElement>('.wp-block-docs-shell [data-rfd-droppable-id]');
    dragOnto(shellColumn);
    await new Promise((resolve) => setTimeout(resolve, 0));
    expect(document.querySelector('.wp-block-callout')).toBeNull();

    // The docs page's column takes it.
    dragOnto(droppable('docs-page') ?? null);
    await waitFor(() => expect(document.querySelector('.wp-block-callout')).not.toBeNull());
  });
});
