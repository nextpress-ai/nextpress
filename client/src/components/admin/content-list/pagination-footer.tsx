import type { JSX } from 'react';
import { Button } from '@/components/ui/button';
import type { ContentListPaginationFooterProps } from './types';

/**
 * Renders totals for every non-empty result, including one-page lists.
 */
export function ContentListPaginationFooter({
  page,
  perPage,
  total,
  totalPages,
  itemLabel,
  onPageChange,
}: ContentListPaginationFooterProps): JSX.Element | null {
  if (total <= 0) return null;

  const start = (page - 1) * perPage + 1;
  const end = Math.min(page * perPage, total);

  return (
    <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
      <div className="text-sm text-npb-text-muted">
        Showing {start} to {end} of {total} {itemLabel}
        {totalPages > 1 ? ` · Page ${page} of ${totalPages}` : ''}
      </div>
      {totalPages > 1 ? (
        <div className="flex space-x-2">
          <Button
            variant="outline"
            size="sm"
            disabled={page <= 1}
            onClick={() => onPageChange(page - 1)}
          >
            Previous
          </Button>
          <Button
            variant="outline"
            size="sm"
            disabled={page >= totalPages}
            onClick={() => onPageChange(page + 1)}
          >
            Next
          </Button>
        </div>
      ) : null}
    </div>
  );
}
