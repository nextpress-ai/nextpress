import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, test, expect, vi, beforeEach } from 'vitest';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { CreateContentDialog } from '@/components/PageBuilder/EditorBar/CreateContentDialog';

// Mock wouter's useLocation hook
const mockSetLocation = vi.fn();
vi.mock('wouter', () => ({
  useLocation: () => ['/', mockSetLocation],
}));

describe('CreateContentDialog', () => {
  let queryClient: QueryClient;
  const mockOnOpenChange = vi.fn();

  beforeEach(() => {
    mockSetLocation.mockClear();
    mockOnOpenChange.mockClear();
    queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false } },
    });
  });

  const renderDialog = (props = {}) => {
    return render(
      <QueryClientProvider client={queryClient}>
        <CreateContentDialog
          open={true}
          onOpenChange={mockOnOpenChange}
          type="page"
          {...props}
        />
      </QueryClientProvider>
    );
  };

  test('renders dialog when open is true', () => {
    renderDialog();
    expect(screen.getByText('Create New Page')).toBeInTheDocument();
  });

  test('does not render dialog when open is false', () => {
    renderDialog({ open: false });
    expect(screen.queryByText('Create New Page')).not.toBeInTheDocument();
  });

  test('displays correct title for page type', () => {
    renderDialog({ type: 'page' });
    expect(screen.getByText('Create New Page')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Create Page' })).toBeInTheDocument();
  });

  test('displays correct title for post type', () => {
    renderDialog({ type: 'post' });
    expect(screen.getByText('Create New Post')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Create Post' })).toBeInTheDocument();
  });

  test('renders input field with placeholder', () => {
    renderDialog({ type: 'page' });
    const input = screen.getByPlaceholderText('Enter page title...');
    expect(input).toBeInTheDocument();
  });

  test('updates input value when typing', () => {
    renderDialog();
    const input = screen.getByPlaceholderText('Enter page title...') as HTMLInputElement;
    
    fireEvent.change(input, { target: { value: 'My New Page' } });
    
    expect(input.value).toBe('My New Page');
  });

  test('create button is disabled when input is empty', () => {
    renderDialog();
    const createButton = screen.getByRole('button', { name: 'Create Page' });
    
    expect(createButton).toBeDisabled();
  });

  test('create button is enabled when input has value', () => {
    renderDialog();
    const input = screen.getByPlaceholderText('Enter page title...');
    const createButton = screen.getByRole('button', { name: 'Create Page' });
    
    fireEvent.change(input, { target: { value: 'My New Page' } });
    
    expect(createButton).not.toBeDisabled();
  });

  test('navigates to page creation form with title when create is clicked', () => {
    renderDialog({ type: 'page' });
    const input = screen.getByPlaceholderText('Enter page title...');
    const createButton = screen.getByRole('button', { name: 'Create Page' });
    
    fireEvent.change(input, { target: { value: 'My New Page' } });
    fireEvent.click(createButton);
    
    expect(mockSetLocation).toHaveBeenCalledWith('/admin/pages?create=true&title=My%20New%20Page');
  });

  test('navigates to post creation form with title when create is clicked', () => {
    renderDialog({ type: 'post' });
    const input = screen.getByPlaceholderText('Enter post title...');
    const createButton = screen.getByRole('button', { name: 'Create Post' });
    
    fireEvent.change(input, { target: { value: 'My New Post' } });
    fireEvent.click(createButton);
    
    expect(mockSetLocation).toHaveBeenCalledWith('/admin/posts?create=true&title=My%20New%20Post');
  });

  test('encodes title with special characters in URL', () => {
    renderDialog({ type: 'page' });
    const input = screen.getByPlaceholderText('Enter page title...');
    const createButton = screen.getByRole('button', { name: 'Create Page' });
    
    fireEvent.change(input, { target: { value: 'Title with spaces & symbols!' } });
    fireEvent.click(createButton);
    
    expect(mockSetLocation).toHaveBeenCalledWith(
      '/admin/pages?create=true&title=Title%20with%20spaces%20%26%20symbols!'
    );
  });

  test('closes dialog after creating content', async () => {
    renderDialog();
    const input = screen.getByPlaceholderText('Enter page title...');
    const createButton = screen.getByRole('button', { name: 'Create Page' });
    
    fireEvent.change(input, { target: { value: 'My New Page' } });
    fireEvent.click(createButton);
    
    expect(mockOnOpenChange).toHaveBeenCalledWith(false);
  });

  test('clears input after creating content', () => {
    renderDialog();
    const input = screen.getByPlaceholderText('Enter page title...') as HTMLInputElement;
    const createButton = screen.getByRole('button', { name: 'Create Page' });
    
    fireEvent.change(input, { target: { value: 'My New Page' } });
    fireEvent.click(createButton);
    
    // Reopen dialog to check if input was cleared
    expect(input.value).toBe('');
  });

  test('closes dialog when cancel button is clicked', () => {
    renderDialog();
    const cancelButton = screen.getByRole('button', { name: 'Cancel' });
    
    fireEvent.click(cancelButton);
    
    expect(mockOnOpenChange).toHaveBeenCalledWith(false);
  });

  test('clears input when cancel button is clicked', () => {
    renderDialog();
    const input = screen.getByPlaceholderText('Enter page title...') as HTMLInputElement;
    const cancelButton = screen.getByRole('button', { name: 'Cancel' });
    
    fireEvent.change(input, { target: { value: 'My New Page' } });
    fireEvent.click(cancelButton);
    
    expect(input.value).toBe('');
  });

  test('creates content when Enter key is pressed', () => {
    renderDialog({ type: 'page' });
    const input = screen.getByPlaceholderText('Enter page title...');
    
    fireEvent.change(input, { target: { value: 'My New Page' } });
    fireEvent.keyDown(input, { key: 'Enter', code: 'Enter' });
    
    expect(mockSetLocation).toHaveBeenCalledWith('/admin/pages?create=true&title=My%20New%20Page');
  });

  test('does not create content when Enter is pressed with empty input', () => {
    renderDialog();
    const input = screen.getByPlaceholderText('Enter page title...');
    
    fireEvent.keyDown(input, { key: 'Enter', code: 'Enter' });
    
    expect(mockSetLocation).not.toHaveBeenCalled();
  });

  test('does not create content when Enter is pressed with whitespace-only input', () => {
    renderDialog();
    const input = screen.getByPlaceholderText('Enter page title...');
    
    fireEvent.change(input, { target: { value: '   ' } });
    fireEvent.keyDown(input, { key: 'Enter', code: 'Enter' });
    
    expect(mockSetLocation).not.toHaveBeenCalled();
  });

  test('input has autofocus', () => {
    renderDialog();
    const input = screen.getByPlaceholderText('Enter page title...');
    
    expect(input).toHaveFocus();
  });

  test('displays correct description for page type', () => {
    renderDialog({ type: 'page' });
    expect(
      screen.getByText(/Enter a title for your new page/)
    ).toBeInTheDocument();
  });

  test('displays correct description for post type', () => {
    renderDialog({ type: 'post' });
    expect(
      screen.getByText(/Enter a title for your new post/)
    ).toBeInTheDocument();
  });

  test('trims whitespace from title before checking if empty', () => {
    renderDialog();
    const input = screen.getByPlaceholderText('Enter page title...');
    const createButton = screen.getByRole('button', { name: 'Create Page' });
    
    fireEvent.change(input, { target: { value: '   ' } });
    
    expect(createButton).toBeDisabled();
  });

  test('handles multiple open/close cycles correctly', () => {
    const { rerender } = renderDialog({ open: true });
    const input = screen.getByPlaceholderText('Enter page title...') as HTMLInputElement;
    
    // First cycle: enter value and close
    fireEvent.change(input, { target: { value: 'First Title' } });
    const createButton = screen.getByRole('button', { name: 'Create Page' });
    fireEvent.click(createButton);
    
    expect(mockOnOpenChange).toHaveBeenCalledWith(false);
    
    // Reopen dialog
    rerender(
      <QueryClientProvider client={queryClient}>
        <CreateContentDialog
          open={true}
          onOpenChange={mockOnOpenChange}
          type="page"
        />
      </QueryClientProvider>
    );
    
    // Input should be cleared from previous use
    const newInput = screen.getByPlaceholderText('Enter page title...') as HTMLInputElement;
    expect(newInput.value).toBe('');
  });
});
