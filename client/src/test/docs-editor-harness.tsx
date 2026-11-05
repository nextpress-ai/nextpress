import { render } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { vi } from 'vitest';
import type { DocsTree } from '@shared/docs';
import { buildDocsPageBlocks } from '@shared/docs/docs-page-frame';
import { createDefaultBlock } from '@shared/block-catalog/create-default-block';
import type { BlockConfig, Page, PageOther } from '@shared/schema-types';
import { ThemeProvider } from '@/components/ThemeProvider';
import { TooltipProvider } from '@/components/ui/tooltip';
import { getQueryFn } from '@/lib/queryClient';
import PageBuilderEditor from '@/pages/PageBuilderEditor';
import { docsSummary, docsTree, treeItem } from './fixtures/docs-fixtures';
import { installFakeFetch, type FakeCall, type FakeRoutes } from './fixtures/fake-fetch';

/**
 * The docs editor's tests mount the real editor page (header, builder, rails) and answer its
 * requests from a table. Everything a test asserts on is set up here or in the test: no test reads
 * a server, a database or a saved page it did not make itself.
 */

export const SITE_ID = 'site-a';

/** Makes ids `b1`, `b2`, … so a block can be named in a test before it exists. */
export const idMaker = (): (() => string) => {
  let count = 0;
  return () => `b${++count}`;
};

/** The page's own blocks: a paragraph, a heading and a list, made from the same blocks every page uses. */
const made = ({ name, id, newId }: { name: string; id: string; newId: () => string }): BlockConfig => {
  const block = createDefaultBlock({ name, id, newId });
  if (!block) throw new Error(`No block named ${name}`);
  return block;
};

const proseBlocks = ({ words, newId }: { words: string; newId: () => string }): BlockConfig[] => {
  const paragraph = made({ name: 'core/paragraph', id: newId(), newId });
  const withWords = { ...paragraph, content: { kind: 'text', value: words, dropCap: false, anchor: '', className: '' } } as BlockConfig;
  if (words !== DEFAULT_WORDS) return [withWords];
  const heading = { ...made({ name: 'core/heading', id: newId(), newId }), content: { kind: 'text', value: 'Requirements', level: 2, anchor: '', className: '' } } as BlockConfig;
  const list = { ...made({ name: 'core/list', id: newId(), newId }), content: { kind: 'structured', data: { ordered: false, values: '<li>Node 20 or later</li><li>A Postgres database</li>', marker: 'default', anchor: '', className: '' } } } as BlockConfig;
  return [withWords, heading, list];
};

export const DEFAULT_WORDS = 'Acme runs on Node 20 or later.';

/** The blocks of one docs page: page shell, docs shell, docs page, then the page's own blocks. */
export const docsPageBlocks = ({ home = false, words = DEFAULT_WORDS, shellData = {} }: { home?: boolean; words?: string; shellData?: Record<string, object | string | boolean | number> } = {}): BlockConfig[] => {
  const newId = idMaker();
  const frame = buildDocsPageBlocks({
    newId,
    home,
    settings: home ? { title: 'Acme Docs', search: { show: true, label: 'Search', placeholder: 'Search the docs' } } : undefined,
    children: proseBlocks({ words, newId }),
  });
  if (Object.keys(shellData).length === 0) return frame;
  const [pageShell] = frame;
  const [shell] = pageShell.children ?? [];
  const content = shell.content && shell.content.kind === 'structured' ? shell.content.data : {};
  return [{ ...pageShell, children: [{ ...shell, content: { kind: 'structured', data: { ...content, ...shellData } } }] }];
};

/** A page as the server sends it. */
export const makePage = (changes: Partial<Page> & Pick<Page, 'id'>): Page =>
  ({
    siteId: SITE_ID,
    title: 'Install',
    slug: 'install',
    status: 'draft',
    version: 3,
    parentId: 'group-1',
    menuOrder: 0,
    history: [],
    other: {} as PageOther,
    blocks: docsPageBlocks(),
    createdAt: '2026-10-01T10:00:00.000Z',
    updatedAt: '2026-10-02T10:00:00.000Z',
    ...changes,
  }) as unknown as Page;

/** An ordinary page: a page shell holding a paragraph, nothing from the docs. */
export const plainPageBlocks = (): BlockConfig[] => {
  const newId = idMaker();
  const [shell] = buildDocsPageBlocks({ newId, home: false, children: proseBlocks({ words: 'Just a page.', newId }) });
  const [docsShell] = shell.children ?? [];
  const [docsPage] = docsShell.children ?? [];
  return [{ ...shell, children: (docsPage.children ?? []).map((child) => ({ ...child, parentId: shell.id })) }];
};

/** Pretends the window is wide (the three-column editor) or narrow (one tabbed rail). */
export const setWindowWide = (wide: boolean): void => {
  Object.defineProperty(window, 'matchMedia', {
    writable: true,
    value: vi.fn().mockImplementation((query: string) => ({
      matches: wide && query.includes('min-width: 1280px'),
      media: query,
      onchange: null,
      addListener: vi.fn(),
      removeListener: vi.fn(),
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      dispatchEvent: vi.fn(),
    })),
  });
};

/** The tree the docs editor reads for `pageId`'s docs: the fixture's Acme Docs, with this page found in it. */
export const treeFor = (changes: Partial<DocsTree> = {}): DocsTree => ({ ...docsTree(), ...changes });
export { docsSummary, docsTree, treeItem };

/** Answers every request the editor makes on its own, so a test only adds the ones it is about. */
export const baseRoutes = ({ page, tree = docsTree() }: { page: Page; tree?: DocsTree }): FakeRoutes => ({
  [`GET /api/docs/items/${page.id}`]: () => ({ json: tree }),
  // The docs on the site: the Pages tab and the page switcher list them.
  'GET /api/docs?*': { json: { docs: [docsSummary({ homeId: tree.home.id, name: tree.settings.title })] } },
  [`GET /api/pages/${page.id}`]: () => ({ json: page }),
  [`PUT /api/pages/${page.id}`]: (call: FakeCall) => ({ json: { ...page, ...(call.body ?? {}), version: (page.version ?? 0) + 1 } }),
  'GET /api/ai-builder/status*': { json: { enabled: false, canManage: true } },
});

type RenderParams = { page: Page; routes?: FakeRoutes; tree?: DocsTree; wide?: boolean };

/** Mounts the real editor page for `page`, with its requests answered by `routes` on top of the base ones. */
export function renderEditor({ page, routes = {}, tree, wide = true }: RenderParams) {
  setWindowWide(wide);
  localStorage.clear();
  const fake = installFakeFetch({ ...baseRoutes({ page, tree }), ...routes });
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false, staleTime: Infinity, queryFn: getQueryFn({ on401: 'throw' }) }, mutations: { retry: false } },
  });
  queryClient.setQueryData([`/api/pages/${page.id}`], page);
  const user = userEvent.setup();
  const view = render(
    <QueryClientProvider client={queryClient}>
      <ThemeProvider>
        <TooltipProvider>
          <PageBuilderEditor postId={page.id} />
        </TooltipProvider>
      </ThemeProvider>
    </QueryClientProvider>,
  );
  return { ...fake, queryClient, user, ...view };
}
