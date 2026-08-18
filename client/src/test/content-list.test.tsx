import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, test, vi } from 'vitest';
import {
  ContentListPaginationFooter,
  ContentListToolbar,
} from '@/components/admin/content-list';
import { buildPaginationItems } from '@/components/admin/content-list/pagination-items';

describe('content-list primitives', () => {
  test('shows totals and disabled pagination for one-page results', () => {
    const onPageChange = vi.fn();

    render(
      <ContentListPaginationFooter
        page={1}
        perPage={10}
        total={3}
        totalPages={1}
        itemLabel="posts"
        onPageChange={onPageChange}
      />,
    );

    expect(screen.getByText('Showing 1 to 3 of 3 posts')).toBeInTheDocument();
    expect(screen.getByRole('navigation', { name: 'pagination' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Go to previous page' })).toHaveAttribute(
      'aria-disabled',
      'true',
    );
    expect(screen.getByRole('link', { name: 'Go to next page' })).toHaveAttribute(
      'aria-disabled',
      'true',
    );
    expect(screen.getByRole('link', { name: '1' })).toHaveAttribute('aria-current', 'page');

    fireEvent.click(screen.getByRole('link', { name: 'Go to next page' }));
    expect(onPageChange).not.toHaveBeenCalled();
  });

  test('changes page from numbered pagination controls', () => {
    const onPageChange = vi.fn();

    render(
      <ContentListPaginationFooter
        page={1}
        perPage={10}
        total={25}
        totalPages={3}
        itemLabel="pages"
        onPageChange={onPageChange}
      />,
    );

    fireEvent.click(screen.getByRole('link', { name: '2' }));
    expect(onPageChange).toHaveBeenCalledWith(2);

    fireEvent.click(screen.getByRole('link', { name: 'Go to next page' }));
    expect(onPageChange).toHaveBeenCalledWith(2);
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
    expect(screen.queryByText('Search runs across all items on this site.')).not.toBeInTheDocument();
  });
});

describe('buildPaginationItems', () => {
  test('returns a single page when everything fits', () => {
    expect(buildPaginationItems({ page: 1, totalPages: 1 })).toEqual([1]);
  });

  test('adds ellipsis for long page counts', () => {
    expect(buildPaginationItems({ page: 5, totalPages: 10 })).toEqual([
      1,
      'ellipsis',
      4,
      5,
      6,
      'ellipsis',
      10,
    ]);
  });
});
