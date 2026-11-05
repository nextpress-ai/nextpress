import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { isWrittenPost, newPostBody } from '@shared/blog/compose-blog-post';
import type { BlockConfig, Post } from '@shared/schema-types';
import { ThemeProvider } from '@/components/ThemeProvider';
import { TooltipProvider } from '@/components/ui/tooltip';
import { getQueryFn } from '@/lib/queryClient';
import PageBuilderEditor from '@/pages/PageBuilderEditor';
import { setWindowWide } from './docs-editor-harness';
import { installFakeFetch, type FakeCall } from './fixtures/fake-fetch';

vi.setConfig({ testTimeout: 30_000 });
vi.mock('@/hooks/useContentLists', () => ({
  useContentLists: () => ({ pages: [], templates: [], posts: [], pagesLoading: false, templatesLoading: false, postsLoading: false }),
}));
vi.mock('@/hooks/useActiveSite', () => ({
  useActiveSite: () => ({ activeSiteId: 'site-a', sites: [] }),
  useOptionalActiveSite: () => ({ activeSiteId: 'site-a', sites: [] }),
}));
vi.mock('@/components/PageBuilder/EditorBar/BlogMenu', () => ({ BlogMenu: () => null }));
vi.mock('@/components/PageBuilder/EditorBar/PagesMenu', () => ({ PagesMenu: () => <button type="button">Page</button> }));
vi.mock('@/components/PageBuilder/EditorBar/DesignMenu', () => ({ DesignMenu: () => <button type="button">Design</button> }));
vi.mock('@/components/PageBuilder/PublishBlockStyles', () => ({ PublishBlockStyles: () => null }));

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
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

let n = 0;
const post = (): Post =>
  ({
    id: 'p-1',
    title: 'Hello',
    slug: 'hello',
    status: 'draft',
    blogId: 'blog-1',
    authorId: 'u-1',
    excerpt: '',
    featuredImage: '',
    allowComments: true,
    version: 3,
    blocks: newPostBody({ newId: () => `w-${++n}` }),
    other: {},
  }) satisfies Partial<Post> as Post;

const renderPost = () => {
  setWindowWide(true);
  localStorage.clear();
  const saved = post();
  const fake = installFakeFetch({
    'GET /api/posts/p-1': { json: saved },
    'PUT /api/posts/p-1': (call: FakeCall) => ({ json: { ...saved, ...(call.body ?? {}), version: 4 } }),
    'GET /api/blogs/blog-1': { json: { id: 'blog-1', name: 'Field Notes', slug: 'notes', siteId: 'site-a', status: 'publish', settings: { post: { comments: false } } } },
    'GET /api/ai-builder/status*': { json: { enabled: false, canManage: true } },
  });
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false, staleTime: Infinity, queryFn: getQueryFn({ on401: 'throw' }) }, mutations: { retry: false } },
  });
  const user = userEvent.setup();
  render(
    <QueryClientProvider client={queryClient}>
      <ThemeProvider>
        <TooltipProvider>
          <PageBuilderEditor postId="p-1" type="post" />
        </TooltipProvider>
      </ThemeProvider>
    </QueryClientProvider>,
  );
  return { ...fake, user };
};

describe('the blog writing editor', () => {
  it('opens a written post inside its blog look, with Post and Blog settings and only writing blocks', async () => {
    renderPost();
    expect(await screen.findByRole('tab', { name: 'Post', selected: true })).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: 'Blog' })).toBeInTheDocument();

    // The blog look is drawn around the body: comments are off for this blog.
    const canvas = document.querySelector<HTMLElement>('.wp-block-page-shell');
    expect(canvas?.querySelector('.wp-block-post-body')).not.toBeNull();
    expect(canvas?.querySelector('.wp-block-post-title')).not.toBeNull();
    expect(document.querySelector('.wp-block-post-comments')).toBeNull();

    // Page design tools would replace the blocks; a written post takes its look from the blog.
    expect(screen.queryByRole('button', { name: 'Design' })).toBeNull();
    expect(screen.queryByRole('button', { name: 'Page' })).toBeNull();

    const library = screen.getByTestId('blog-block-library');
    const tiles = Array.from(library.querySelectorAll('[data-dnd-debug-id]')).map((tile) => tile.getAttribute('data-dnd-debug-id'));
    expect(tiles).toEqual(expect.arrayContaining(['core/paragraph', 'core/heading', 'core/quote', 'core/image', 'core/code']));
    expect(tiles).not.toContain('core/columns');
  });

  it('adds a block to the body from the list and saves the body alone', async () => {
    const { user, calls } = renderPost();
    const library = await screen.findByTestId('blog-block-library');
    await user.click(within(library).getByRole('button', { name: 'Quote' }));
    await waitFor(() => expect(document.querySelector('.wp-block-post-body .wp-block-quote, .wp-block-post-body blockquote')).not.toBeNull());

    await user.click(screen.getByTestId('button-save'));
    await waitFor(() => expect(calls.some((call) => call.method === 'PUT' && call.url === '/api/posts/p-1')).toBe(true));
    const body = calls.find((call) => call.method === 'PUT' && call.url === '/api/posts/p-1')?.body;
    const blocks = body?.blocks as BlockConfig[];
    expect(isWrittenPost(blocks)).toBe(true);
    expect(blocks[0].children?.map((child) => child.name)).toEqual(['core/paragraph', 'core/quote']);
    expect(body).toMatchObject({ allowComments: true });
  });
});
