import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, test, vi } from 'vitest';
import {
  ContentListPaginationFooter,
  ContentListToolbar,
} from '@/components/admin/content-list';

describe('content-list primitives', () => {
  test('shows totals for one-page results', () => {
    render(
      <ContentListPaginationFooter
        page={1}
        perPage={10}
        total={3}
        totalPages={1}
        itemLabel="posts"
        onPageChange={vi.fn()}
      />,
    );

    expect(screen.getByText('Showing 1 to 3 of 3 posts')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Previous' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Next' })).not.toBeInTheDocument();
  });

  test('forwards search changes to page-reset callback', () => {
    const resetPage = vi.fn();

    render(
      <ContentListToolbar
        value=""
        placeholder="Search posts..."
        onSearchChange={resetPage}
      />,
    );

    fireEvent.change(screen.getByPlaceholderText('Search posts...'), {
      target: { value: 'draft' },
    });

    expect(resetPage).toHaveBeenCalledWith('draft');
    expect(screen.getByText('Search runs across all items on this site.')).toBeInTheDocument();
  });
});
