import { render, screen, waitFor, within } from '@testing-library/react';
import { describe, test, expect, vi, beforeEach } from 'vitest';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { PagesMenu } from '@/components/PageBuilder/EditorBar/PagesMenu';

// Mock wouter's useLocation hook
const mockSetLocation = vi.fn();
vi.mock('wouter', () => ({
  useLocation: () => ['/', mockSetLocation],
}));

// Mock useContentLists hook
vi.mock('@/hooks/useContentLists', () => ({
  useContentLists: vi.fn(() => ({
    pages: [
      { id: 'page-1', title: 'Home Page', status: 'published' },
      { id: 'page-2', title: 'About Page', status: 'draft' },
      { id: 'page-3', title: 'Contact Page', status: 'published' },
    ],
    pagesLoading: false,
  })),
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

describe('PagesMenu', () => {
  let queryClient: QueryClient;

  beforeEach(() => {
    mockSetLocation.mockClear();
    queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false } },
    });
    // jsdom missing scrollIntoView
    (window.HTMLElement.prototype as any).scrollIntoView = vi.fn();
  });

  const renderPagesMenu = (props = {}) => {
    return render(
      <QueryClientProvider client={queryClient}>
        <PagesMenu {...props}>
          <button>Pages</button>
        </PagesMenu>
      </QueryClientProvider>
    );
  };

  test('renders trigger button', () => {
    renderPagesMenu();
    expect(screen.getByText('Pages')).toBeInTheDocument();
  });

  test('opens dropdown menu on trigger click', async () => {
    const user = userEvent.setup();
    renderPagesMenu();
    const trigger = screen.getByText('Pages');
    await user.click(trigger);

    expect(screen.getByText('Browse Pages')).toBeInTheDocument();
    expect(screen.getByText('Create New Page')).toBeInTheDocument();
  });

  test('opens command palette when Browse Pages is clicked', async () => {
    const user = userEvent.setup();
    renderPagesMenu();
    
    const trigger = screen.getByText('Pages');
    await user.click(trigger);

    const browseItem = screen.getByText('Browse Pages');
    await user.click(browseItem);

    // Command palette should be visible with pages
    await waitFor(() => {
      expect(screen.getByText('Home Page')).toBeInTheDocument();
    });
    expect(screen.getByText('About Page')).toBeInTheDocument();
    expect(screen.getByText('Contact Page')).toBeInTheDocument();
  });

  test('navigates to page edit view when page is selected', async () => {
    const user = userEvent.setup();
    renderPagesMenu();
    
    const trigger = screen.getByText('Pages');
    await user.click(trigger);

    const browseItem = screen.getByText('Browse Pages');
    await user.click(browseItem);

    await waitFor(() => {
      expect(screen.getByText('Home Page')).toBeInTheDocument();
    });

    const pageItem = screen.getByText('Home Page');
    await user.click(pageItem);

    expect(mockSetLocation).toHaveBeenCalledWith('/admin/page-builder/page/page-1');
  });

  test('navigates to create when Create New Page is clicked', async () => {
    const user = userEvent.setup();
    renderPagesMenu();
    
    const trigger = screen.getByText('Pages');
    await user.click(trigger);

    const createItem = screen.getByText('Create New Page');
    await user.click(createItem);

    expect(mockSetLocation).toHaveBeenCalledWith('/admin/pages?create=true');
  });

  test('shows Page settings when onPageSettingsClick is provided', async () => {
    const user = userEvent.setup();
    const onPageSettings = vi.fn();
    renderPagesMenu({ onPageSettingsClick: onPageSettings });

    await user.click(screen.getByText('Pages'));
    expect(screen.getByText('Page settings…')).toBeInTheDocument();

    await user.click(screen.getByText('Page settings…'));
    expect(onPageSettings).toHaveBeenCalledTimes(1);
  });

  test('hides Page settings when onPageSettingsClick is omitted', async () => {
    const user = userEvent.setup();
    renderPagesMenu();

    await user.click(screen.getByText('Pages'));
    expect(screen.queryByText('Page settings…')).not.toBeInTheDocument();
  });

  test('highlights current page in command palette', async () => {
    const user = userEvent.setup();
    renderPagesMenu({ currentPageId: 'page-2' });
    
    const trigger = screen.getByText('Pages');
    await user.click(trigger);

    const browseItem = screen.getByText('Browse Pages');
    await user.click(browseItem);

    await waitFor(() => {
      expect(screen.getByText('About Page')).toBeInTheDocument();
    });

    const currentPageItem = screen.getByText('About Page').closest('[role]');
    expect(currentPageItem).toHaveClass('bg-npb-accent/10');
  });

  test('displays page status in command palette', async () => {
    const user = userEvent.setup();
    renderPagesMenu();
    
    const trigger = screen.getByText('Pages');
    await user.click(trigger);

    const browseItem = screen.getByText('Browse Pages');
    await user.click(browseItem);

    const firstPage = await screen.findByText('Home Page');
    const firstPageRow = firstPage.closest('[role]') as HTMLElement | null;
    expect(within(firstPageRow!).getByText('published')).toBeInTheDocument();

    const secondPage = screen.getByText('About Page');
    const secondPageRow = secondPage.closest('[role]') as HTMLElement | null;
    expect(within(secondPageRow!).getByText('Draft')).toBeInTheDocument();
  });
});
