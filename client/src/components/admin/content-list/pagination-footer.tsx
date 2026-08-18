import type { JSX, MouseEvent } from 'react';
import { cn } from '@/lib/utils';
import {
  Pagination,
  PaginationContent,
  PaginationEllipsis,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from '@/components/ui/pagination';
import type { ContentListPaginationFooterProps } from './types';
import { buildPaginationItems } from './pagination-items';

/** Prevents navigation when a pagination control is disabled. */
function preventWhenDisabled(
  event: MouseEvent<HTMLAnchorElement>,
  disabled: boolean,
  onActivate: () => void,
): void {
  event.preventDefault();
  if (disabled) {
    return;
  }
  onActivate();
}

function paginationLinkClass(disabled: boolean): string {
  return cn(disabled && 'pointer-events-none opacity-50');
}

/**
 * Renders totals plus shadcn pagination — controls stay visible and disable when unusable.
 */
export function ContentListPaginationFooter({
  page,
  perPage,
  total,
  totalPages,
  itemLabel,
  onPageChange,
}: ContentListPaginationFooterProps): JSX.Element | null {
  if (total <= 0) {
    return null;
  }

  const safeTotalPages = Math.max(1, totalPages);
  const start = (page - 1) * perPage + 1;
  const end = Math.min(page * perPage, total);
  const canGoPrevious = page > 1;
  const canGoNext = page < safeTotalPages;
  const pageItems = buildPaginationItems({ page, totalPages: safeTotalPages });

  const goPrevious = (): void => {
    if (canGoPrevious) {
      onPageChange(page - 1);
    }
  };

  const goNext = (): void => {
    if (canGoNext) {
      onPageChange(page + 1);
    }
  };

  return (
    <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
      <div className="text-sm font-medium text-npb-text-secondary">
        Showing {start} to {end} of {total} {itemLabel}
      </div>
      <Pagination className="mx-0 w-auto justify-end">
        <PaginationContent>
          <PaginationItem>
            <PaginationPrevious
              href="#"
              aria-disabled={!canGoPrevious}
              tabIndex={canGoPrevious ? 0 : -1}
              className={paginationLinkClass(!canGoPrevious)}
              onClick={(event) => preventWhenDisabled(event, !canGoPrevious, goPrevious)}
            />
          </PaginationItem>
          {pageItems.map((item, index) =>
            item === 'ellipsis' ? (
              <PaginationItem key={`ellipsis-${index}`}>
                <PaginationEllipsis />
              </PaginationItem>
            ) : (
              <PaginationItem key={item}>
                <PaginationLink
                  href="#"
                  isActive={item === page}
                  aria-disabled={item === page}
                  tabIndex={item === page ? -1 : 0}
                  className={paginationLinkClass(item === page)}
                  onClick={(event) =>
                    preventWhenDisabled(event, item === page, () => onPageChange(item))
                  }
                >
                  {item}
                </PaginationLink>
              </PaginationItem>
            ),
          )}
          <PaginationItem>
            <PaginationNext
              href="#"
              aria-disabled={!canGoNext}
              tabIndex={canGoNext ? 0 : -1}
              className={paginationLinkClass(!canGoNext)}
              onClick={(event) => preventWhenDisabled(event, !canGoNext, goNext)}
            />
          </PaginationItem>
        </PaginationContent>
      </Pagination>
    </div>
  );
}
