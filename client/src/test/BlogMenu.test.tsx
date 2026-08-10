import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, test, expect, vi, beforeEach } from 'vitest';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { BlogMenu } from '@/components/PageBuilder/EditorBar/BlogMenu';

// Mock wouter's useLocation hook
const mockSetLocation = vi.fn();
vi.mock('wouter', () => ({
  useLocation: () => ['/', mockSetLocation],
}));

// Mock useContentLists hook
const mockUseContentLists = vi.hoisted(() => vi.fn());
vi.mock('@/hooks/useContentLists', () => ({
  useContentLists: mockUseContentLists,
}));

// Mock CreateContentDialog
vi.mock('@/components/PageBuilder/EditorBar/CreateContentDialog', () => ({
  CreateContentDialog: ({ open, onOpenChange, type }: any) =>
    open ? (
      <div data-testid="create-dialog" data-type={type}>
        Create Dialog
        <button onClick={() => onOpenChange(false)}>Close</button>
      </div>
    ) : null,
}));

describe('BlogMenu', () => {
  let queryClient: QueryClient;
  let user: ReturnType<typeof userEvent.setup>;

  const mockPosts = [
    { id: 'post-1', title: 'First Blog Post', status: 'publish' },
    { id: 'post-2', title: 'Second Blog Post', status: 'draft' },
    { id: 'post-3', title: 'Third Blog Post', status: 'publish' },
  ];

  beforeEach(() => {
    mockSetLocation.mockClear();
    mockUseContentLists.mockReturnValue({
      posts: mockPosts,
      postsLoading: false,
    });
    queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false } },
    });
    user = userEvent.setup();
    // jsdom missing scrollIntoView used by cmdk
    (window.HTMLElement.prototype as any).scrollIntoView = vi.fn();
  });

  const renderBlogMenu = (props = {}) => {
    return render(
      <QueryClientProvider client={queryClient}>
        <BlogMenu {...props}>
          <button>Blog</button>
        </BlogMenu>
      </QueryClientProvider>
    );
  };

  test('renders trigger button', () => {
    renderBlogMenu();
    expect(screen.getByText('Blog')).toBeInTheDocument();
  });

  test('opens dropdown menu on trigger click', async () => {
    renderBlogMenu();
    const trigger = screen.getByText('Blog');
    await user.click(trigger);

    expect(await screen.findByText('Browse Posts')).toBeInTheDocument();
    expect(screen.getByText('Create New Post')).toBeInTheDocument();
  });

  test('opens command palette when Browse Posts is clicked', async () => {
    renderBlogMenu();
    
    const trigger = screen.getByText('Blog');
    await user.click(trigger);

    const browseItem = screen.getByText('Browse Posts');
    await user.click(browseItem);

    // Command palette should be visible with posts
    await waitFor(() => {
      expect(screen.getByText('First Blog Post')).toBeInTheDocument();
    });
    expect(screen.getByText('Second Blog Post')).toBeInTheDocument();
    expect(screen.getByText('Third Blog Post')).toBeInTheDocument();
  });

  test('navigates to post edit view when post is selected', async () => {
    renderBlogMenu();
    
    const trigger = screen.getByText('Blog');
    await user.click(trigger);

    const browseItem = screen.getByText('Browse Posts');
    await user.click(browseItem);

    await waitFor(() => {
      expect(screen.getByText('First Blog Post')).toBeInTheDocument();
    });

    const postItem = screen.getByText('First Blog Post');
    await user.click(postItem);

    expect(mockSetLocation).toHaveBeenCalledWith('/admin/page-builder/post/post-1');
  });

  test('opens create dialog when Create New Post is clicked', async () => {
    renderBlogMenu();
    
    const trigger = screen.getByText('Blog');
    await user.click(trigger);

    const createItem = screen.getByText('Create New Post');
    await user.click(createItem);

    const dialog = screen.getByTestId('create-dialog');
    expect(dialog).toBeInTheDocument();
    expect(dialog).toHaveAttribute('data-type', 'post');
  });

  test('highlights current post in command palette', async () => {
    renderBlogMenu({ currentPostId: 'post-2' });
    
    const trigger = screen.getByText('Blog');
    await user.click(trigger);

    const browseItem = screen.getByText('Browse Posts');
    await user.click(browseItem);

    await waitFor(() => {
      expect(screen.getByText('Second Blog Post')).toBeInTheDocument();
    });

    const currentPostItem = screen.getByText('Second Blog Post').closest('[role]');
    expect(currentPostItem).toHaveClass('bg-accent');
  });

  test('displays post status in command palette', async () => {
    renderBlogMenu();
    
    const trigger = screen.getByText('Blog');
    await user.click(trigger);

    const browseItem = screen.getByText('Browse Posts');
    await user.click(browseItem);

    const firstPost = await screen.findByText('First Blog Post');
    const firstPostRow = firstPost.closest('[role]') as HTMLElement | null;
    expect(within(firstPostRow!).getByText('Published')).toBeInTheDocument();

    const secondPost = screen.getByText('Second Blog Post');
    const secondPostRow = secondPost.closest('[role]') as HTMLElement | null;
    expect(within(secondPostRow!).getByText('Draft')).toBeInTheDocument();
  });

  test('shows "All Posts" heading when no blogId is provided', async () => {
    renderBlogMenu();
    
    const trigger = screen.getByText('Blog');
    await user.click(trigger);

    const browseItem = screen.getByText('Browse Posts');
    await user.click(browseItem);

    await waitFor(() => {
      expect(screen.getByText('All Posts')).toBeInTheDocument();
    });
  });

  test('shows "Blog Posts" heading when blogId is provided', async () => {
    renderBlogMenu({ blogId: 'blog-123' });
    
    const trigger = screen.getByText('Blog');
    await user.click(trigger);

    const browseItem = screen.getByText('Browse Posts');
    await user.click(browseItem);

    await waitFor(() => {
      expect(screen.getByText('Blog Posts')).toBeInTheDocument();
    });
  });

  test('passes blogId to useContentLists for filtering', () => {
    renderBlogMenu({ blogId: 'blog-123' });
    
    expect(mockUseContentLists).toHaveBeenCalledWith({ blogId: 'blog-123' });
  });

  test('calls useContentLists without blogId when not provided', () => {
    renderBlogMenu();
    
    expect(mockUseContentLists).toHaveBeenCalledWith({ blogId: undefined });
  });

  test('displays loading state when posts are loading', async () => {
    mockUseContentLists.mockReturnValue({
      posts: [],
      postsLoading: true,
    });

    renderBlogMenu();
    
    const trigger = screen.getByText('Blog');
    await user.click(trigger);

    const browseItem = screen.getByText('Browse Posts');
    await user.click(browseItem);

    await waitFor(() => {
      expect(screen.getByText('Loading posts...')).toBeInTheDocument();
    });
  });

  test('displays "No posts found" when posts array is empty', async () => {
    mockUseContentLists.mockReturnValue({
      posts: [],
      postsLoading: false,
    });

    renderBlogMenu();
    
    const trigger = screen.getByText('Blog');
    await user.click(trigger);

    const browseItem = screen.getByText('Browse Posts');
    await user.click(browseItem);

    await waitFor(() => {
      expect(screen.getByText('No posts found.')).toBeInTheDocument();
    });
  });
});
