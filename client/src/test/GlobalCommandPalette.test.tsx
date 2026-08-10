import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi, beforeEach } from 'vitest';
import { GlobalCommandPalette } from '@/components/admin/global-command-palette';

const mockSetLocation = vi.hoisted(() => vi.fn());
const mockUseContentLists = vi.hoisted(() => vi.fn());

vi.mock('wouter', () => ({
  useLocation: () => ['/admin/dashboard', mockSetLocation],
}));

vi.mock('@/hooks/useContentLists', () => ({
  useContentLists: mockUseContentLists,
}));

vi.mock('@/hooks/useActiveSite', () => ({
  useOptionalActiveSite: () => ({
    activeSiteId: 'site-2',
    isLoading: false,
    error: null,
  }),
}));

describe('GlobalCommandPalette', () => {
  beforeEach(() => {
    mockSetLocation.mockClear();
    HTMLElement.prototype.scrollIntoView = vi.fn();
    mockUseContentLists.mockReturnValue({
      pages: [{ id: 'page-1', title: 'About Page', slug: 'about' }],
      posts: [{ id: 'post-1', title: 'Launch Post', slug: 'launch' }],
      pagesLoading: false,
      postsLoading: false,
      pagesError: null,
      postsError: null,
    });
  });

  it('opens from Ctrl+K and navigates to content', () => {
    render(<GlobalCommandPalette />);

    fireEvent.keyDown(window, { key: 'k', ctrlKey: true });

    expect(screen.getByPlaceholderText('Search pages, posts, and actions...')).toBeInTheDocument();
    fireEvent.click(screen.getByText('About Page'));

    expect(mockSetLocation).toHaveBeenCalledWith('/admin/page-builder/page/page-1');
  });

  it('does not steal Ctrl+K from editable fields', () => {
    render(<GlobalCommandPalette />);
    const input = document.createElement('input');
    document.body.appendChild(input);

    fireEvent.keyDown(input, { key: 'k', ctrlKey: true });

    expect(screen.queryByPlaceholderText('Search pages, posts, and actions...')).not.toBeInTheDocument();
    input.remove();
  });

  it('opens the active site through the public site hint', () => {
    render(<GlobalCommandPalette />);

    fireEvent.keyDown(window, { key: 'k', ctrlKey: true });
    fireEvent.click(screen.getByText('View site'));

    expect(mockSetLocation).toHaveBeenCalledWith('/?siteId=site-2');
  });

  it('includes every loaded page in the palette', () => {
    mockUseContentLists.mockReturnValue({
      pages: [
        { id: 'page-0', title: 'Page 0', slug: 'page-0' },
        { id: 'page-29', title: 'Page 29', slug: 'page-29' },
      ],
      posts: [],
      pagesLoading: false,
      postsLoading: false,
      pagesError: null,
      postsError: null,
    });

    render(<GlobalCommandPalette />);
    fireEvent.keyDown(window, { key: 'k', ctrlKey: true });

    expect(screen.getByText('Page 0')).toBeInTheDocument();
    expect(screen.getByText('Page 29')).toBeInTheDocument();
  });
});

