import { render, screen } from '@testing-library/react';
import { describe, test, expect, vi, beforeEach } from 'vitest';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import Dashboard from '@/pages/Dashboard';
import { getQueryFn } from '@/lib/queryClient';

vi.mock('@/hooks/useActiveSite', () => ({
  useActiveSite: () => ({ activeSiteId: 'site-1' }),
}));

vi.mock('@/components/AdminLayout', () => ({
  AdminLayout: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}));

vi.mock('@/components/themes/theme-color-preview', () => ({
  ThemeColorPreview: () => <div data-testid="theme-preview" />,
}));

describe('Dashboard recent posts', () => {
  beforeEach(() => {
    global.fetch = vi.fn((url: string) => {
      if (url.includes('/api/dashboard/stats')) {
        return Promise.resolve({
          ok: true,
          json: async () => ({ posts: 1, pages: 1, comments: 0, users: 1 }),
        } as Response);
      }
      if (url.includes('/api/posts')) {
        return Promise.resolve({
          ok: true,
          json: async () => ({
            posts: [
              {
                id: 'post-abc',
                title: 'Hello World',
                createdAt: '2024-01-01T00:00:00.000Z',
                status: 'publish',
              },
            ],
          }),
        } as Response);
      }
      if (url.includes('/api/site')) {
        return Promise.resolve({
          ok: true,
          json: async () => ({ status: true, data: { activeThemeId: null } }),
        } as Response);
      }
      if (url.includes('/api/themes')) {
        return Promise.resolve({
          ok: true,
          json: async () => [],
        } as Response);
      }
      return Promise.reject(new Error(`Unknown endpoint: ${url}`));
    }) as typeof fetch;
  });

  test('links recent post titles to the page builder editor', async () => {
    const queryClient = new QueryClient({
      defaultOptions: {
        queries: {
          queryFn: getQueryFn({ on401: 'throw' }),
          retry: false,
        },
      },
    });

    render(
      <QueryClientProvider client={queryClient}>
        <Dashboard />
      </QueryClientProvider>,
    );

    const titleLink = await screen.findByRole('link', { name: 'Hello World' });
    expect(titleLink).toHaveAttribute('href', '/admin/page-builder/post/post-abc');

    const editButton = screen.getByRole('button', { name: 'Edit Hello World' });
    expect(editButton.closest('a')).toHaveAttribute('href', '/admin/page-builder/post/post-abc');
  });
});
