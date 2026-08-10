import { renderHook, waitFor } from '@testing-library/react';
import { describe, test, expect, vi, beforeEach } from 'vitest';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useContentLists } from '@/hooks/useContentLists';
import { getQueryFn } from '@/lib/queryClient';
import type { Post, Template, Theme } from '@shared/schema-types';

vi.mock('@/hooks/useActiveSite', () => ({
  useActiveSite: () => ({ activeSiteId: 'site-test-1' }),
}));

// Mock data
const mockPages: Post[] = [
  {
    id: 'page-1',
    title: 'Home Page',
    slug: 'home',
    authorId: 'author-1',
    status: 'published',
    blogId: null,
    excerpt: null,
    password: null,
    createdAt: new Date('2024-01-01'),
    updatedAt: new Date('2024-01-01'),
    other: null,
    publishedAt: null,
    settings: null,
    featuredImage: null,
    templateId: null,
    allowComments: true,
    parentId: null,
    blocks: [],
  },
  {
    id: 'page-2',
    title: 'About Page',
    slug: 'about',
    authorId: 'author-1',
    status: 'draft',
    blogId: null,
    excerpt: null,
    password: null,
    createdAt: new Date('2024-01-02'),
    updatedAt: new Date('2024-01-02'),
    other: null,
    publishedAt: null,
    settings: null,
    featuredImage: null,
    templateId: null,
    allowComments: true,
    parentId: null,
    blocks: [],
  },
];

const mockPosts: Post[] = [
  {
    id: 'post-1',
    title: 'First Post',
    slug: 'first-post',
    authorId: 'author-1',
    status: 'published',
    blogId: 'blog-1',
    excerpt: null,
    password: null,
    createdAt: new Date('2024-01-01'),
    updatedAt: new Date('2024-01-01'),
    other: null,
    publishedAt: null,
    settings: null,
    featuredImage: null,
    templateId: null,
    allowComments: true,
    parentId: null,
    blocks: [],
  },
  {
    id: 'post-2',
    title: 'Second Post',
    slug: 'second-post',
    authorId: 'author-1',
    status: 'published',
    blogId: 'blog-2',
    excerpt: null,
    password: null,
    createdAt: new Date('2024-01-02'),
    updatedAt: new Date('2024-01-02'),
    other: null,
    publishedAt: null,
    settings: null,
    featuredImage: null,
    templateId: null,
    allowComments: true,
    parentId: null,
    blocks: [],
  },
  {
    id: 'post-3',
    title: 'Third Post',
    slug: 'third-post',
    authorId: 'author-1',
    status: 'draft',
    blogId: 'blog-1',
    excerpt: null,
    password: null,
    createdAt: new Date('2024-01-03'),
    updatedAt: new Date('2024-01-03'),
    other: null,
    publishedAt: null,
    settings: null,
    featuredImage: null,
    templateId: null,
    allowComments: true,
    parentId: null,
    blocks: [],
  },
];

const mockTemplates: Template[] = [
  {
    id: 'template-1',
    name: 'Basic Template',
    type: 'page',
    authorId: 'author-1',
    description: 'A basic page template',
    blocks: [],
    settings: null,
    createdAt: new Date('2024-01-01'),
    updatedAt: new Date('2024-01-01'),
    other: null,
  },
];

const mockThemes: Theme[] = [
  {
    id: 'theme-1',
    name: 'Default Theme',
    authorId: 'author-1',
    version: '1.0.0',
    status: 'active',
    createdAt: new Date('2024-01-01'),
    updatedAt: new Date('2024-01-01'),
    other: null,
    description: null,
    settings: null,
    requires: '',
    isPaid: null,
    price: null,
    currency: null,
    renderer: null,
  },
];

describe('useContentLists', () => {
  let queryClient: QueryClient;

  beforeEach(() => {
    queryClient = new QueryClient({
      defaultOptions: {
        queries: {
          queryFn: getQueryFn({ on401: 'throw' }),
          retry: false,
          gcTime: 0,
        },
      },
    });

    // Mock fetch for all API calls
    global.fetch = vi.fn((url: string) => {
      if (url.includes('/api/pages')) {
        return Promise.resolve({
          ok: true,
          json: async () => mockPages,
        } as Response);
      }
      if (url.includes('/api/posts')) {
        return Promise.resolve({
          ok: true,
          json: async () => mockPosts,
        } as Response);
      }
      if (url.includes('/api/templates')) {
        return Promise.resolve({
          ok: true,
          json: async () => mockTemplates,
        } as Response);
      }
      if (url.includes('/api/themes')) {
        return Promise.resolve({
          ok: true,
          json: async () => mockThemes,
        } as Response);
      }
      return Promise.reject(new Error('Unknown endpoint'));
    }) as typeof fetch;
  });

  const wrapper = ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );

  test('fetches and returns all content lists', async () => {
    const { result } = renderHook(() => useContentLists(), { wrapper });

    // Initially loading
    expect(result.current.isLoading).toBe(true);

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    // Check that all data is loaded
    expect(result.current.pages).toHaveLength(2);
    expect(result.current.posts).toHaveLength(3);
    expect(result.current.templates).toHaveLength(1);
    expect(result.current.themes).toHaveLength(1);
  });

  test('returns empty arrays while loading', () => {
    const { result } = renderHook(() => useContentLists(), { wrapper });

    expect(result.current.pages).toEqual([]);
    expect(result.current.posts).toEqual([]);
    expect(result.current.templates).toEqual([]);
    expect(result.current.themes).toEqual([]);
  });

  test('filters posts by blogId when provided', async () => {
    const { result } = renderHook(() => useContentLists({ blogId: 'blog-1' }), {
      wrapper,
    });

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    // Should only return posts with blogId 'blog-1'
    expect(result.current.posts).toHaveLength(2);
    expect(result.current.posts.every((post) => post.blogId === 'blog-1')).toBe(
      true
    );
    expect(result.current.posts.map((p) => p.id)).toEqual([
      'post-1',
      'post-3',
    ]);
  });

  test('returns all posts when blogId is not provided', async () => {
    const { result } = renderHook(() => useContentLists(), { wrapper });

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    // Should return all posts
    expect(result.current.posts).toHaveLength(3);
  });

  test('returns all posts when blogId is null', async () => {
    const { result } = renderHook(() => useContentLists({ blogId: null }), {
      wrapper,
    });

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    // Should return all posts when explicitly null
    expect(result.current.posts).toHaveLength(3);
  });

  test('filters posts correctly for different blogIds', async () => {
    const { result, rerender } = renderHook(
      ({ blogId }: { blogId?: string | null }) => useContentLists({ blogId }),
      {
        wrapper,
        initialProps: { blogId: 'blog-1' },
      }
    );

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.posts).toHaveLength(2);
    expect(result.current.posts.map((p) => p.id)).toEqual([
      'post-1',
      'post-3',
    ]);

    // Change to blog-2
    rerender({ blogId: 'blog-2' });

    await waitFor(() => {
      expect(result.current.posts).toHaveLength(1);
    });

    expect(result.current.posts[0].id).toBe('post-2');
  });

  test('provides individual loading states', async () => {
    const { result } = renderHook(() => useContentLists(), { wrapper });

    expect(result.current.pagesLoading).toBe(true);
    expect(result.current.postsLoading).toBe(true);
    expect(result.current.templatesLoading).toBe(true);
    expect(result.current.themesLoading).toBe(true);

    await waitFor(() => {
      expect(result.current.pagesLoading).toBe(false);
      expect(result.current.postsLoading).toBe(false);
      expect(result.current.templatesLoading).toBe(false);
      expect(result.current.themesLoading).toBe(false);
    });
  });

  test('combined loading state is true if any query is loading', () => {
    const { result } = renderHook(() => useContentLists(), { wrapper });

    // At least one should be loading initially
    expect(result.current.isLoading).toBe(true);
  });

  test('hasError is false when all queries succeed', async () => {
    const { result } = renderHook(() => useContentLists(), { wrapper });

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.hasError).toBe(false);
  });

  test('hasError is true when any query fails', async () => {
    // Mock a failed request
    global.fetch = vi.fn((url: string) => {
      if (url.includes('/api/pages')) {
        return Promise.reject(new Error('Network error'));
      }
      return Promise.resolve({
        ok: true,
        json: async () => [],
      } as Response);
    }) as typeof fetch;

    const { result } = renderHook(() => useContentLists(), { wrapper });

    await waitFor(() => {
      expect(result.current.hasError).toBe(true);
    });
  });

  test('pages are not affected by blogId filter', async () => {
    const { result } = renderHook(() => useContentLists({ blogId: 'blog-1' }), {
      wrapper,
    });

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    // Pages should always return all pages regardless of blogId
    expect(result.current.pages).toHaveLength(2);
  });

  test('templates and themes are not affected by blogId filter', async () => {
    const { result } = renderHook(() => useContentLists({ blogId: 'blog-1' }), {
      wrapper,
    });

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    // Templates and themes should not be affected by blogId
    expect(result.current.templates).toHaveLength(1);
    expect(result.current.themes).toHaveLength(1);
  });

  test('requests non-public content with active-site and API query keys', async () => {
    const { result } = renderHook(() => useContentLists({ blogId: 'blog-1' }), {
      wrapper,
    });

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    const calls = vi.mocked(global.fetch).mock.calls.map(([url]) => String(url));
    const pagesUrl = calls.find((url) => url.includes('/api/pages'));
    const postsUrl = calls.find((url) => url.includes('/api/posts'));

    expect(pagesUrl).toContain('status=any');
    expect(pagesUrl).toContain('per_page=50');
    expect(pagesUrl).toContain('siteId=site-test-1');
    expect(postsUrl).toContain('status=any');
    expect(postsUrl).toContain('per_page=50');
    expect(postsUrl).toContain('blog_id=blog-1');
    expect(postsUrl).toContain('siteId=site-test-1');
    expect(postsUrl).not.toContain('blogId=');
  });

  test('rejects a normalized response carrying another site scope', async () => {
    global.fetch = vi.fn((url: string) => {
      if (url.includes('/api/pages')) {
        return Promise.resolve({
          ok: true,
          json: async () => ({ pages: mockPages, siteId: 'site-other' }),
        } as Response);
      }
      if (url.includes('/api/posts')) {
        return Promise.resolve({
          ok: true,
          json: async () => ({ posts: mockPosts, siteId: 'site-test-1' }),
        } as Response);
      }
      return Promise.resolve({
        ok: true,
        json: async () => [],
      } as Response);
    }) as typeof fetch;

    const { result } = renderHook(() => useContentLists(), { wrapper });

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.pages).toEqual([]);
    expect(result.current.posts).toHaveLength(mockPosts.length);
  });
});
